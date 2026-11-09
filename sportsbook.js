'use strict';

const Sportsbook = (() => {
    const games = [
        { id: 'football', sport: 'Football', away: 'Kansas City', home: 'Buffalo', awayOff: 89, awayDef: 84, homeOff: 87, homeDef: 83, player: 'Patrick Mahomes', stat: 'passing yards', baseline: 265.5, deviation: 35, awayML: -115, homeML: -105, spread: -1.5, total: 47.5 },
        { id: 'basketball', sport: 'Basketball', away: 'Boston', home: 'Los Angeles', awayOff: 94, awayDef: 91, homeOff: 86, homeDef: 82, player: 'Jayson Tatum', stat: 'points', baseline: 27.5, deviation: 6, awayML: -165, homeML: 140, spread: -4.5, total: 222.5 }
    ];
    const maxBalance = 1000000000;
    const initial = () => ({ balance: 100000, pending: [], history: [], scores: [] });
    const format = cents => (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const oddsText = odds => odds > 0 ? `+${odds}` : String(odds);
    const decimal = odds => odds > 0 ? 1 + odds / 100 : 1 + 100 / -odds;
    const selections = {};
    for (const g of games) {
        const entries = [
            ['awayML', `${g.away} moneyline`, g.awayML],
            ['homeML', `${g.home} moneyline`, g.homeML],
            ['awaySpread', `${g.away} ${g.spread}`, -110],
            ['homeSpread', `${g.home} +${-g.spread}`, -110],
            ['over', `Total over ${g.total}`, -110],
            ['under', `Total under ${g.total}`, -110],
            ['propOver', `${g.player} over ${g.baseline} ${g.stat}`, -115],
            ['propUnder', `${g.player} under ${g.baseline} ${g.stat}`, -115]
        ];
        entries.forEach(([type, label, odds]) => { selections[`${g.id}:${type}`] = { game: g.id, type, label, odds }; });
    }
    const validTicket = ticket => ticket && Number.isSafeInteger(ticket.stake) && ticket.stake >= 100 &&
        ticket.stake <= maxBalance && Array.isArray(ticket.legs) && ticket.legs.length >= 1 && ticket.legs.length <= games.length &&
        ticket.legs.every(id => typeof id === 'string' && Object.hasOwn(selections, id)) &&
        new Set(ticket.legs.map(id => selections[id].game)).size === ticket.legs.length;
    const potential = ticket => Math.round(ticket.stake * ticket.legs.reduce((m, id) => m * decimal(selections[id].odds), 1));
    const valid = state => state && Number.isSafeInteger(state.balance) && state.balance >= 0 && state.balance <= maxBalance &&
        Array.isArray(state.pending) && state.pending.length <= 100 && state.pending.every(validTicket) &&
        state.balance + state.pending.reduce((sum, ticket) => sum + potential(ticket), 0) <= maxBalance &&
        Array.isArray(state.history) && state.history.length <= 50 && state.history.every(s => typeof s === 'string' && s.length <= 500) &&
        Array.isArray(state.scores) && state.scores.length <= games.length && state.scores.every(s => typeof s === 'string' && s.length <= 200);
    const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const normal = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
    function simulate(g) {
        const football = g.id === 'football';
        const awayBase = (football ? 20 : 110) + (g.awayOff - g.homeDef) * (football ? .4 : .8);
        const homeBase = (football ? 20 : 108) + (g.homeOff - g.awayDef) * (football ? .4 : .8);
        const away = Math.max(football ? 0 : 60, Math.round(awayBase + normal() * (football ? 6 : 8)));
        const home = Math.max(football ? 0 : 60, Math.round(homeBase + normal() * (football ? 6 : 8)));
        const prop = Math.max(0, Math.round((g.baseline + normal() * g.deviation) * (football ? 1 : 10)) / (football ? 1 : 10));
        return { away, home, prop };
    }
    function outcome(id, result) {
        const s = selections[id], g = games.find(game => game.id === s.game);
        let diff;
        switch (s.type) {
            case 'awayML': diff = result.away - result.home; break;
            case 'homeML': diff = result.home - result.away; break;
            case 'awaySpread': diff = result.away + g.spread - result.home; break;
            case 'homeSpread': diff = result.home - g.spread - result.away; break;
            case 'over': diff = result.away + result.home - g.total; break;
            case 'under': diff = g.total - result.away - result.home; break;
            case 'propOver': diff = result.prop - g.baseline; break;
            case 'propUnder': diff = g.baseline - result.prop; break;
            default: throw new Error('Unknown selection');
        }
        return diff > 0 ? 'win' : diff < 0 ? 'loss' : 'push';
    }
    function settle(state, results) {
        for (const ticket of state.pending) {
            const statuses = ticket.legs.map(id => outcome(id, results[selections[id].game]));
            const multiplier = ticket.legs.reduce((acc, id, i) => statuses[i] === 'win' ? acc * decimal(selections[id].odds) : acc, 1);
            const payout = statuses.includes('loss') ? 0 : Math.round(ticket.stake * multiplier);
            state.balance += payout;
            const status = statuses.includes('loss') ? 'LOSS' : statuses.every(s => s === 'push') ? 'PUSH' : 'WIN';
            const description = ticket.legs.map((id, i) => `${selections[id].label} (${statuses[i]})`).join('; ');
            state.history.unshift(`${status}: ${description}. Staked ${format(ticket.stake)}; returned ${format(payout)} play credits.`);
        }
        state.history = state.history.slice(0, 50);
        state.pending = [];
        state.scores = games.map(g => {
            const r = results[g.id];
            return `${g.away} ${r.away} - ${g.home} ${r.home}; ${g.player}: ${r.prop} ${g.stat}.`;
        });
    }
    function render(content, state, save, back) {
        let slip = [];
        function draw(message = '') {
            const selected = slip.map(id => selections[id]);
            const multiplier = selected.reduce((n, leg) => n * decimal(leg.odds), 1);
            const american = multiplier >= 2 ? Math.round((multiplier - 1) * 100) : selected.length ? Math.round(-100 / (multiplier - 1)) : 0;
            content.innerHTML = `
                <div class="sports-game sportsbook">
                    <h2>Sportsbook Simulator</h2>
                    <p><strong>Play credits only.</strong> No real money, prizes, or conversion to stars. Matchups, ratings and odds are fixed examples, not live data or betting advice.</p>
                    <p><strong>Bankroll: ${format(state.balance)} credits</strong></p>
                    <details><summary>Sportsbook Academy</summary>
                        <p>Moneyline picks the winner. Spread adds a handicap to a team's score. Total is both teams' combined score. A player prop predicts a player's statistic.</p>
                        <p>American odds show profit per 100 credits at positive odds, or the stake needed to profit 100 at negative odds. A parlay combines independent games: all non-push legs must win. A push refunds a single stake or removes that leg from a parlay.</p>
                    </details>
                    ${games.map(g => `<section class="book-card"><h3>${g.sport}: ${g.away} at ${g.home}</h3>
                        <p>Illustrative offense / defense ratings: ${g.away} ${g.awayOff}/${g.awayDef}; ${g.home} ${g.homeOff}/${g.homeDef}.</p>
                        <div class="book-lines">${Object.entries(selections).filter(([, s]) => s.game === g.id).map(([id, s]) =>
                            `<button type="button" data-pick="${id}" aria-pressed="${slip.includes(id)}">${s.label} (${oddsText(s.odds)})</button>`).join('')}</div>
                    </section>`).join('')}
                    <section class="book-card"><h3>Ticket builder</h3>
                        <p>Choose one selection per game. Select two games for a parlay.</p>
                        ${selected.length ? `<ul>${selected.map(s => `<li>${s.label} (${oddsText(s.odds)})</li>`).join('')}</ul><p>Ticket odds: ${oddsText(american)} · Decimal multiplier: ${multiplier.toFixed(3)}</p>` : '<p>No selections yet.</p>'}
                        <label for="book-stake">Stake in play credits</label>
                        <input id="book-stake" type="number" min="1" max="10000000" step="0.01" value="10" inputmode="decimal">
                        <p id="book-return"></p>
                        <div class="sports-controls"><button type="button" id="book-submit" ${selected.length ? '' : 'disabled'}>Lock ticket</button><button type="button" id="book-clear">Clear selections</button></div>
                    </section>
                    <p class="game-result" role="status">${escape(message)}</p>
                    <section class="book-card"><h3>Pending tickets (${state.pending.length})</h3>
                        ${state.pending.length ? state.pending.map(t => `<p>${t.legs.map(id => escape(selections[id].label)).join(' + ')} · Stake ${format(t.stake)} · Potential return ${format(potential(t))} credits</p>`).join('') : '<p>No pending tickets.</p>'}
                        <button type="button" id="book-simulate" ${state.pending.length ? '' : 'disabled'}>Simulate game day</button>
                    </section>
                    ${state.scores.length ? `<section class="book-card"><h3>Latest simulated results</h3>${state.scores.map(s => `<p>${escape(s)}</p>`).join('')}</section>` : ''}
                    ${state.history.length ? `<section class="book-card"><h3>Ticket history</h3>${state.history.map(s => `<p>${escape(s)}</p>`).join('')}</section>` : ''}
                    <div class="sports-controls"><button type="button" id="book-reset">Reset bankroll and history</button><button type="button" id="book-back">Back to arena</button></div>
                </div>`;
            content.querySelectorAll('[data-pick]').forEach(button => button.addEventListener('click', () => {
                const id = button.dataset.pick;
                if (slip.includes(id)) slip = slip.filter(pick => pick !== id);
                else { slip = slip.filter(pick => selections[pick].game !== selections[id].game); slip.push(id); }
                draw();
            }));
            const stakeInput = content.querySelector('#book-stake');
            const readStake = () => {
                const value = Number(stakeInput.value), cents = Math.round(value * 100);
                return stakeInput.value !== '' && Number.isFinite(value) && value >= 1 && value <= maxBalance / 100 &&
                    Math.abs(value * 100 - cents) < 1e-6 ? cents : null;
            };
            const updateReturn = () => {
                const stake = readStake();
                content.querySelector('#book-return').textContent = stake && selected.length ?
                    `Potential return: ${format(Math.round(stake * multiplier))} credits (including stake).` : 'Enter a stake of at least 1 credit with up to two decimal places.';
            };
            stakeInput.addEventListener('input', updateReturn);
            updateReturn();
            content.querySelector('#book-submit').addEventListener('click', () => {
                const stake = readStake();
                if (!stake) return draw('Enter a valid stake of at least 1 credit, with at most two decimal places.');
                if (stake > state.balance) return draw('Not enough play credits for this ticket.');
                if (state.pending.length >= 100) return draw('Simulate pending tickets before adding more.');
                const reserved = state.pending.reduce((sum, ticket) => sum + potential(ticket), 0);
                if (state.balance - stake + reserved + Math.round(stake * multiplier) > maxBalance)
                    return draw('This ticket would exceed the simulator bankroll limit.');
                state.balance -= stake;
                state.pending.push({ legs: [...slip], stake });
                slip = [];
                save(); draw('Ticket locked. Simulate game day to settle it.');
            });
            content.querySelector('#book-clear').addEventListener('click', () => { slip = []; draw(); });
            content.querySelector('#book-simulate').addEventListener('click', () => {
                if (!state.pending.length) return;
                const results = Object.fromEntries(games.map(g => [g.id, simulate(g)]));
                settle(state, results);
                save(); draw('Game day complete. Results and settled tickets are below.');
            });
            content.querySelector('#book-reset').addEventListener('click', () => {
                if (!window.confirm('Reset play credits to 1,000 and erase pending tickets and history?')) return;
                Object.assign(state, initial()); slip = []; save(); draw('Simulator reset.');
            });
            content.querySelector('#book-back').addEventListener('click', back);
        }
        draw();
    }
    return { games, selections, initial, valid, decimal, outcome, settle, render };
})();

if (typeof module !== 'undefined') module.exports = Sportsbook;
