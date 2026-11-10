'use strict';

const Casino = (() => {
    const config = typeof CasinoEvents !== 'undefined' ? CasinoEvents : require('./casino-events.js');
    const art = typeof CityArt !== 'undefined' ? CityArt : require('./city-art.js');
    const maxBalance = 1000000000;
    const money = n => (n / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
    const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const wallet = () => ({ balance: 100000, rounds: 0, history: [], blackjack: null, craps: null });
    const initial = () => ({ practice: wallet(), events: [] });
    const betValid = bet => Number.isSafeInteger(bet) && bet >= 100 && bet <= 10000 && bet % 100 === 0;
    const pointValid = point => [4, 5, 6, 8, 9, 10].includes(point);
    function validWallet(w) {
        if (!w || !Number.isSafeInteger(w.balance) || w.balance < 0 || w.balance > maxBalance ||
            !Number.isSafeInteger(w.rounds) || w.rounds < 0 || w.rounds >= Number.MAX_SAFE_INTEGER ||
            !Array.isArray(w.history) || w.history.length > 12 ||
            w.history.some(s => typeof s !== 'string' || s.length > 300) ||
            (w.blackjack !== null && w.craps !== null)) return false;
        if (w.craps !== null && (!w.craps || !betValid(w.craps.bet) || !pointValid(w.craps.point))) return false;
        if (w.blackjack !== null) {
            const b = w.blackjack;
            if (!b || !betValid(b.bet) || !Array.isArray(b.deck) || !Array.isArray(b.player) ||
                !Array.isArray(b.dealer) || b.player.length < 2 || b.dealer.length !== 2) return false;
            const cards = [...b.deck, ...b.player, ...b.dealer];
            if (cards.length !== 52 || new Set(cards).size !== 52 ||
                cards.some(c => !Number.isInteger(c) || c < 0 || c > 51) ||
                total(b.player) >= 21 || total(b.dealer) === 21) return false;
        }
        return true;
    }
    function valid(state) {
        return !!state && validWallet(state.practice) && Array.isArray(state.events) && state.events.length <= 1000 &&
            new Set(state.events.map(e => e?.id)).size === state.events.length &&
            state.events.every(e => e && typeof e.id === 'string' && /^[a-z0-9-]{1,80}$/.test(e.id) &&
                Number.isSafeInteger(e.enteredAt) && e.enteredAt >= 0 && validWallet(e.wallet));
    }
    function events(list = config.schedule) {
        const zoned = s => typeof s === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(s) && Number.isFinite(Date.parse(s));
        if (!Array.isArray(list) || new Set(list.map(e => e?.id)).size !== list.length ||
            list.some(e => !e || typeof e.id !== 'string' || !/^[a-z0-9-]{1,80}$/.test(e.id) || typeof e.title !== 'string' ||
                !e.title.trim() || e.title.length > 100 || !zoned(e.startsAt) ||
                !zoned(e.endsAt) || Date.parse(e.endsAt) <= Date.parse(e.startsAt)))
            throw new Error('Invalid casino event schedule');
        return list;
    }
    const isActive = (event, now) => now >= Date.parse(event.startsAt) && now < Date.parse(event.endsAt);
    function enterEvent(state, id, stars, now = Date.now(), list = config.schedule) {
        if (!valid(state)) throw new Error('Invalid casino save');
        const event = events(list).find(e => e.id === id);
        if (!event || !isActive(event, now)) throw new Error('This promo is not open now.');
        if (state.events.some(e => e.id === id)) throw new Error('You already entered this event. Continue without paying again.');
        if (!Number.isSafeInteger(stars) || stars < config.entryStars) throw new Error('You need 5 city stars to enter.');
        if (state.events.length >= 1000) throw new Error('Event-entry history is full.');
        state.events.push({ id, enteredAt: now, wallet: wallet() });
        state.events.at(-1).wallet.balance = config.chips * 100;
        return stars - config.entryStars;
    }
    const activeRound = w => w.blackjack ? 'blackjack' : w.craps ? 'craps' : null;
    function checkBet(w, bet) {
        if (!validWallet(w)) throw new Error('Invalid casino wallet');
        if (activeRound(w)) throw new Error('Finish your active blackjack hand or craps point first.');
        if (!betValid(bet)) throw new Error('Choose a whole-credit stake from 1 to 100.');
        if (bet > w.balance) throw new Error('Not enough play credits for that stake.');
        if (w.balance > maxBalance - 360000) throw new Error('Practice balance limit reached. Reset the practice wallet to continue.');
        if (w.rounds >= Number.MAX_SAFE_INTEGER - 1) throw new Error('Practice round limit reached.');
    }
    function record(w, text) {
        w.rounds++; w.history.unshift(text); w.history = w.history.slice(0, 12);
    }
    function award(w, bet, payout, label) {
        w.balance += payout;
        const text = `${label}. Stake ${money(bet)}; total returned ${money(payout)}; net ${money(payout - bet)} credits.`;
        record(w, text);
        return text;
    }
    const rank = card => card % 13 + 1;
    function total(hand) {
        let value = 0, aces = 0;
        for (const card of hand) { const r = rank(card); value += r === 1 ? 11 : Math.min(10, r); if (r === 1) aces++; }
        while (value > 21 && aces) { value -= 10; aces--; }
        return value;
    }
    function randomInt(size, random) {
        const value = random();
        if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Random draw failed. No new bet was placed.');
        return Math.floor(value * size);
    }
    function blackjackStart(w, bet, random = Math.random) {
        checkBet(w, bet);
        const deck = Array.from({ length: 52 }, (_, i) => i);
        for (let i = 51; i > 0; i--) {
            const j = randomInt(i + 1, random);
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        const b = { bet, deck, player: [deck.pop(), deck.pop()], dealer: [deck.pop(), deck.pop()] };
        w.balance -= bet; w.blackjack = b;
        if (total(b.player) === 21 || total(b.dealer) === 21) return finishBlackjack(w, true);
        return { text: 'Hand dealt. Hit for a card or stand. Your stake is already deducted.' };
    }
    function finishBlackjack(w, natural = false) {
        const b = w.blackjack, p = total(b.player), d = total(b.dealer);
        const push = p <= 21 && p === d;
        const win = p <= 21 && (d > 21 || p > d);
        const payout = push ? b.bet : win ? Math.round(b.bet * (natural && p === 21 ? 2.5 : 2)) : 0;
        const text = award(w, b.bet, payout, `Blackjack: ${p > 21 ? 'bust' : push ? 'push' : win ? natural ? 'natural blackjack' : 'win' : 'dealer wins'} (${p} vs ${d})`);
        w.blackjack = null;
        return { text, player: b.player, dealer: b.dealer };
    }
    function blackjackAction(w, action) {
        if (!validWallet(w) || !w.blackjack) throw new Error('No active blackjack hand.');
        if (!['hit', 'stand'].includes(action)) throw new Error('Unknown blackjack action.');
        const b = w.blackjack;
        if (action === 'hit') {
            b.player.push(b.deck.pop());
            if (total(b.player) > 21) return finishBlackjack(w);
            if (total(b.player) < 21) return { text: 'Card dealt. Hit again or stand.' };
        }
        while (total(b.dealer) < 17) b.dealer.push(b.deck.pop());
        return finishBlackjack(w);
    }
    function crapsRoll(w, bet, random = Math.random) {
        if (!validWallet(w)) throw new Error('Invalid casino wallet');
        const round = w.craps;
        if (!round) checkBet(w, bet);
        const dice = [randomInt(6, random) + 1, randomInt(6, random) + 1], sum = dice[0] + dice[1];
        if (!round) {
            w.balance -= bet;
            if ([7, 11].includes(sum)) return { dice, text: award(w, bet, bet * 2, `Craps: ${sum}, pass-line win`) };
            if ([2, 3, 12].includes(sum)) return { dice, text: award(w, bet, 0, `Craps: ${sum}, come-out loss`) };
            w.craps = { bet, point: sum };
            return { dice, text: `Point is ${sum}. Roll ${sum} again before a 7. No extra stake is charged.` };
        }
        if (sum === round.point || sum === 7) {
            w.craps = null;
            return { dice, text: award(w, round.bet, sum === round.point ? round.bet * 2 : 0,
                `Craps: ${sum === round.point ? 'point made' : 'seven out'}`) };
        }
        return { dice, text: `Rolled ${sum}. Point stays ${round.point}; your original stake is still in play.` };
    }
    const reds = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    function roulette(w, bet, pick, number, random = Math.random) {
        checkBet(w, bet);
        if (!['red', 'black', 'number'].includes(pick) || (pick === 'number' && (!Number.isInteger(number) || number < 0 || number > 36)))
            throw new Error('Choose red, black, or a single number from 0 to 36.');
        const result = randomInt(37, random);
        const color = result === 0 ? 'green' : reds.includes(result) ? 'red' : 'black';
        const win = pick === 'number' ? result === number : color === pick;
        w.balance -= bet;
        return { number: result, color, text: award(w, bet, win ? bet * (pick === 'number' ? 36 : 2) : 0,
            `Roulette: ${result} ${color}; ${win ? 'win' : 'loss'}`) };
    }
    const symbols = ['Cherry', 'Bell', 'Star', 'Seven'], slotPayouts = [5, 8, 12, 25];
    function slots(w, bet, random = Math.random) {
        checkBet(w, bet);
        const reels = Array.from({ length: 3 }, () => randomInt(4, random));
        const win = reels.every(n => n === reels[0]);
        w.balance -= bet;
        return { reels, text: award(w, bet, win ? bet * slotPayouts[reels[0]] : 0,
            `Slots: ${reels.map(i => symbols[i]).join(' / ')}; ${win ? 'triple match' : 'no match'}`) };
    }
    const names = { blackjack: 'Blackjack', craps: 'Craps', slots: 'Slot Machine', roulette: 'Roulette' };
    const rules = {
        blackjack: 'Get closer to 21 than the dealer without going over. Aces count as 1 or 11. Dealer stands on all 17s. A natural pays 3:2 profit; a normal win pays 1:1; a push refunds the stake. No splits, doubles or insurance.',
        craps: 'Pass line only. First roll: 7 or 11 wins; 2, 3 or 12 loses. Otherwise that sum becomes the point. Keep rolling: the point wins, 7 loses, anything else continues. Wins pay 1:1 profit. No odds or side bets.',
        roulette: 'European single-zero wheel: 37 equally likely pockets. Red or black pays 1:1 profit; green zero loses both. A chosen number pays 35:1 profit. Past spins do not change the next spin.',
        slots: 'Three independent reels, each with four equally likely symbols. Only three identical symbols win. Total returns including stake: Cherry 5x, Bell 8x, Star 12x, Seven 25x. Any other pattern returns zero. There is no guaranteed winning strategy.'
    };
    function cards(hand, hidden = false) {
        return hand.map((card, i) => {
            const suits = ['\u2660', '\u2665', '\u2666', '\u2663'], r = rank(card);
            return hidden && i === 1 ? '<span class="casino-card casino-card-back" aria-label="Hidden dealer card">202</span>' :
                `<span class="casino-card ${[1, 2].includes(Math.floor(card / 13)) ? 'casino-card-red' : ''}">${['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][r]}${suits[Math.floor(card / 13)]}</span>`;
        }).join('');
    }
    function rouletteWheel(result) {
        const order = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
        return `<svg class="casino-wheel" viewBox="0 0 240 240" role="img" aria-label="European roulette wheel${result ? `, result ${result.number} ${result.color}` : ''}">
            <circle cx="120" cy="120" r="115" fill="#b89553"/>${order.map((n, i) => {
                const a = i * Math.PI * 2 / 37 - Math.PI / 2, b = (i + 1) * Math.PI * 2 / 37 - Math.PI / 2, mid = (a + b) / 2;
                return `<path d="M120 120L${120 + Math.cos(a) * 109} ${120 + Math.sin(a) * 109}A109 109 0 0 1 ${120 + Math.cos(b) * 109} ${120 + Math.sin(b) * 109}Z" fill="${n === 0 ? '#15805c' : reds.includes(n) ? '#a92c3f' : '#152238'}" stroke="#dac28a" stroke-width=".5"/>
                    <text x="${120 + Math.cos(mid) * 95}" y="${123 + Math.sin(mid) * 95}" font-size="8" text-anchor="middle" fill="white">${n}</text>`;
            }).join('')}<circle cx="120" cy="120" r="69" fill="#67503b" stroke="#d4b674" stroke-width="4"/><circle cx="120" cy="120" r="8" fill="#e2c47f"/>
            ${result ? `<circle cx="${120 + Math.cos((order.indexOf(result.number) + .5) * Math.PI * 2 / 37 - Math.PI / 2) * 78}" cy="${120 + Math.sin((order.indexOf(result.number) + .5) * Math.PI * 2 / 37 - Math.PI / 2) * 78}" r="5" fill="#fff"/>` : ''}</svg>`;
    }
    function render(content, w, game, save, back, { event = null } = {}) {
        if (!names[game]) throw new Error('Unknown casino game');
        let result = null, stake = '5', selection = 'red', number = '0';
        const canStart = () => !event || isActive(event, Date.now());
        function draw(message = '') {
            const hand = w.blackjack;
            const active = activeRound(w);
            content.innerHTML = `<div class="sports-game sportsbook library-reader casino-room"><h2>${names[game]} - ${event ? 'Event chips' : 'Practice credits'}</h2>
                <p class="book-muted">No real money, prizes or conversion to city stars. Outcomes are local simulations.</p>
                ${art.gallery('casino')}
                <div class="casino-felt" data-casino="${game}"><strong>Available: ${money(w.balance)} ${event ? 'event chips' : 'play credits'}</strong>
                ${game === 'blackjack' ? `<h3>Dealer ${hand ? '(one card hidden)' : result?.dealer ? total(result.dealer) : ''}</h3>
                    <div class="casino-hand">${hand ? cards(hand.dealer, true) : result?.dealer ? cards(result.dealer) : '<span class="casino-card casino-card-back">202</span>'}</div>
                    <h3>Your hand ${hand ? total(hand.player) : result?.player ? total(result.player) : ''}</h3><div class="casino-hand">${hand ? cards(hand.player) : result?.player ? cards(result.player) : ''}</div>` :
                    game === 'craps' ? `<h3>PASS LINE ${w.craps ? `- Point ${w.craps.point}` : '- Come-out roll'}</h3><div class="casino-dice">${(result?.dice || [1, 1]).map(n => `<span role="img" aria-label="Die showing ${n}">${['', '\u2680', '\u2681', '\u2682', '\u2683', '\u2684', '\u2685'][n]}</span>`).join('')}</div>` :
                    game === 'slots' ? `<h3>CHOCOLATE CITY JACKPOT</h3><div class="casino-reels">${(result?.reels || [0, 1, 2]).map(i => `<span>${['\u25cf', '\u266b', '\u2605', '7'][i]}<small>${symbols[i]}</small></span>`).join('')}</div>` :
                    rouletteWheel(result)}
                </div>
                <p class="casino-status" role="status" tabindex="-1">${escape(message || (active ? 'Your stake is in play. Finish this round; leaving or reloading does not refund it.' : 'Choose a stake, then play.'))}</p>
                ${event ? `<p class="book-warning">${canStart() ? `Event closes ${escape(new Date(event.endsAt).toLocaleString('en-US', { timeZone: 'America/New_York' }))} Washington time.` : 'Event closed: finish an already-started hand or point only.'} Event chips never become stars.</p>` : ''}
                ${active && active !== game ? `<p class="book-warning">Finish your ${active} round before starting another game.</p><button type="button" id="casino-resume">Continue ${names[active]}</button>` : ''}
                ${!active ? `<label for="casino-stake">Stake (1-100 whole ${event ? 'event chips' : 'credits'})</label><input id="casino-stake" class="invest-input" inputmode="numeric" type="number" min="1" max="100" step="1" value="${escape(stake)}">` : ''}
                ${game === 'roulette' ? `<label for="casino-pick">Bet type</label><select id="casino-pick" class="invest-input">${['red', 'black', 'number'].map(p => `<option value="${p}" ${p === selection ? 'selected' : ''}>${p === 'number' ? 'Single number' : p}</option>`).join('')}</select><label for="casino-number">Single number (0-36; used only for a number bet)</label><input id="casino-number" class="invest-input" type="number" min="0" max="36" step="1" value="${escape(number)}">` : ''}
                <div class="sports-controls">${game === 'blackjack' && hand ? '<button type="button" data-casino-action="hit">Hit</button><button type="button" data-casino-action="stand">Stand</button>' :
                    `<button type="button" data-casino-action="play" ${active && active !== game || !active && !canStart() ? 'disabled' : ''}>${game === 'blackjack' ? 'Deal hand' : game === 'craps' ? w.craps ? 'Roll for point (no new stake)' : 'Bet pass line + roll' : game === 'slots' ? 'Spin reels' : 'Spin wheel'}</button>`}</div>
                <details open><summary>Simple rules & payouts</summary><p>${rules[game]}</p><p class="book-muted">Each new stake is deducted once. Total return includes your stake; losing returns zero. Credits have no cash value. No reward for city stars.</p></details>
                <details><summary>Recent rounds (${w.rounds})</summary>${w.history.map(text => `<p>${escape(text)}</p>`).join('') || '<p>No settled rounds yet.</p>'}</details>
                <button type="button" id="casino-back">Back to casino</button></div>`;
            const input = content.querySelector('#casino-stake');
            if (input) input.addEventListener('input', () => { stake = input.value; });
            const pick = content.querySelector('#casino-pick'), n = content.querySelector('#casino-number');
            if (pick) pick.addEventListener('change', () => { selection = pick.value; });
            if (n) n.addEventListener('input', () => { number = n.value; });
            content.querySelector('#casino-back').addEventListener('click', back);
            const resume = content.querySelector('#casino-resume');
            if (resume) resume.addEventListener('click', () => render(content, w, active, save, back, { event }));
            content.querySelectorAll('[data-casino-action]').forEach(button => button.addEventListener('click', () => {
                try {
                    if (!activeRound(w) && !canStart()) throw new Error('This event has ended. New bets are closed.');
                    const bet = /^\d+$/.test(stake) ? Number(stake) * 100 : NaN;
                    result = game === 'blackjack' ? w.blackjack ? blackjackAction(w, button.dataset.casinoAction) : blackjackStart(w, bet) :
                        game === 'craps' ? crapsRoll(w, bet) :
                        game === 'slots' ? slots(w, bet) : roulette(w, bet, selection, /^\d+$/.test(number) ? Number(number) : NaN);
                    save();
                    draw(result.text);
                } catch (error) {
                    if (!(error instanceof Error)) throw error;
                    console.error('Casino action failed:', error);
                    draw(error.message);
                }
                content.querySelector('.casino-status').focus({ preventScroll: true });
            }));
        }
        draw();
        content.querySelector('h2').setAttribute('tabindex', '-1');
        content.querySelector('h2').focus();
    }
    events();
    return { initial, valid, validWallet, wallet, events, isActive, enterEvent, activeRound, total, blackjackStart,
        blackjackAction, crapsRoll, roulette, slots, render, names, rules, money };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Casino;
