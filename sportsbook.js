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
    const markets = [
        { id: 'moneyline', name: 'Moneyline', hint: 'Pick the winner', types: ['awayML', 'homeML'],
            lesson: 'You only need your team to win. The margin does not matter. Negative odds mean the price is shorter, not that points are deducted.' },
        { id: 'spread', name: 'Spread', hint: 'Pick the winning margin', types: ['awaySpread', 'homeSpread'],
            lesson: 'Add the listed handicap to your team’s final score, then compare scores. A minus spread requires a bigger win; a plus spread can cover even when the team loses.' },
        { id: 'total', name: 'Total', hint: 'Pick the combined score', types: ['over', 'under'],
            lesson: 'Add both teams’ final scores. Over means above the line; under means below it. The game winner does not matter.' },
        { id: 'prop', name: 'Player prop', hint: 'Pick a player statistic', types: ['propOver', 'propUnder'],
            lesson: 'Choose whether a player finishes above or below a statistic line. A team win does not automatically make its player props win.' }
    ];
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
    function parseStake(value) {
        const amount = Number(value), cents = Math.round(amount * 100);
        return String(value).trim() !== '' && Number.isFinite(amount) && amount >= 1 && amount <= maxBalance / 100 &&
            Math.abs(amount * 100 - cents) < 1e-6 ? cents : null;
    }
    function quote(legs, stake) {
        if (!validTicket({ legs, stake })) throw new Error('Cannot quote an invalid practice ticket');
        const multiplier = legs.reduce((n, id) => n * decimal(selections[id].odds), 1);
        const total = potential({ legs, stake });
        return { total, profit: total - stake, loss: stake, multiplier, implied: 100 / multiplier,
            american: multiplier >= 2 ? Math.round((multiplier - 1) * 100) : Math.round(-100 / (multiplier - 1)) };
    }
    function ticketError(state, legs, stake) {
        if (!legs.length) return 'Choose a selection before reviewing a ticket.';
        if (!validTicket({ legs, stake })) return 'Use one pick per game and a stake of at least 1 credit, with at most two decimal places.';
        if (stake > state.balance) return 'Not enough play credits. Reduce the stake or settle pending tickets.';
        if (state.pending.length >= 100) return 'Simulate pending tickets before adding more.';
        const reserved = state.pending.reduce((sum, ticket) => sum + potential(ticket), 0);
        if (state.balance - stake + reserved + potential({ legs, stake }) > maxBalance)
            return 'This ticket would exceed the simulator bankroll limit.';
        return '';
    }
    function place(state, legs, stake) {
        const error = ticketError(state, legs, stake);
        if (error) return { error };
        const ticket = { legs: [...legs], stake };
        state.balance -= stake;
        state.pending.push(ticket);
        return { ticket };
    }
    function requirement(id) {
        const s = selections[id], g = games.find(game => game.id === s.game);
        switch (s.type) {
            case 'awayML': return `${g.away} must win the game.`;
            case 'homeML': return `${g.home} must win the game.`;
            case 'awaySpread': return `${g.away} must win by more than ${-g.spread} points.`;
            case 'homeSpread': return `${g.home} must win, or lose by fewer than ${-g.spread} points.`;
            case 'over': return `The two teams must score more than ${g.total} points combined.`;
            case 'under': return `The two teams must score fewer than ${g.total} points combined.`;
            case 'propOver': return `${g.player} must finish with more than ${g.baseline} ${g.stat}.`;
            case 'propUnder': return `${g.player} must finish with fewer than ${g.baseline} ${g.stat}.`;
            default: throw new Error('Unknown selection');
        }
    }
    function evidence(id, result) {
        const s = selections[id], g = games.find(game => game.id === s.game);
        if (s.type.endsWith('ML')) return `Final score ${result.away}-${result.home} (${g.away}-${g.home})`;
        if (s.type.endsWith('Spread')) {
            const away = s.type === 'awaySpread';
            const score = away ? result.away : result.home, handicap = away ? g.spread : -g.spread;
            return `Adjusted score ${score} ${handicap > 0 ? '+' : '-'} ${Math.abs(handicap)} = ${score + handicap}; opponent ${away ? result.home : result.away}`;
        }
        if (s.type.startsWith('prop')) return `Player finished with ${result.prop} ${g.stat}; line ${g.baseline}`;
        return `Combined score ${result.away} + ${result.home} = ${result.away + result.home}; line ${g.total}`;
    }
    const valid = state => state && Number.isSafeInteger(state.balance) && state.balance >= 0 && state.balance <= maxBalance &&
        Array.isArray(state.pending) && state.pending.length <= 100 && state.pending.every(validTicket) &&
        state.balance + state.pending.reduce((sum, ticket) => sum + potential(ticket), 0) <= maxBalance &&
        Array.isArray(state.history) && state.history.length <= 50 && state.history.every(s => typeof s === 'string' && s.length <= 1200) &&
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
            const description = ticket.legs.map((id, i) =>
                `${selections[id].label}: ${statuses[i]}. ${evidence(id, results[selections[id].game])}`).join('; ');
            const net = payout - ticket.stake;
            state.history.unshift(`${status}: ${description}. Stake ${format(ticket.stake)}; total return ${format(payout)}; net ${net >= 0 ? '+' : '-'}${format(Math.abs(net))} play credits.${statuses.includes('push') ? ' Push legs add no odds multiplier. If all legs push, the stake is refunded.' : ''}`);
        }
        state.history = state.history.slice(0, 50);
        state.pending = [];
        state.scores = games.map(g => {
            const r = results[g.id];
            return `${g.away} ${r.away} - ${g.home} ${r.home}; ${g.player}: ${r.prop} ${g.stat}.`;
        });
    }
    const lessons = [
        { id: 'start', title: 'Start here', summary: 'One ticket, step by step.', paragraphs: [
            'Step 1: Pick a team or result.',
            'Step 2: Choose a stake: the credits you can lose.',
            'Step 3: Read the slip.',
            'Step 4: Place the practice ticket.',
            'Step 5: Simulate the result.',
            'Start small in this pretend-money lab. Nothing here predicts real games or proves you can make money.'
        ] },
        { id: 'odds', title: 'Odds made simple', summary: 'What +150 and -200 mean.', paragraphs: [
            'Odds are a price, not a promise. The plus or minus sign does not change the game score.',
            '+150: stake 10 credits. A win earns 15 profit. You get 25 back in total: your 10 plus 15.',
            '-200: stake 10 credits. A win earns 5 profit. You get 15 back in total: your 10 plus 5.',
            'Decimal 2.50 means 10 × 2.50 = 25 total back. Subtract the 10 stake to find 15 profit.',
            'A loss returns zero. A bigger advertised payout usually comes with a lower price-implied chance, not a better deal.'
        ] },
        { id: 'chance', title: 'Chance & the house edge', summary: 'A price is not a forecast.', paragraphs: [
            'Implied probability means the chance suggested by a price. Divide 100 by decimal odds: 2.50 suggests 40%.',
            '-200 suggests about 66.7%. A favorite can still lose. These prices do not measure the true chance of winning.',
            'The bookmaker adds a margin, also called vig. That is why the two sides can add up to more than 100%.',
            'A losing streak does not make your next pick more likely to win. Do not chase losses.'
        ] },
        { id: 'markets', title: 'Types of bets', summary: 'Winner, spread, totals and player stats.', paragraphs: [
            'Moneyline: choose who wins. The winning margin does not matter.',
            'Spread: add the handicap to your team’s score. Buffalo +1.5 loses 24–23: 23 + 1.5 = 24.5, so the pick covers.',
            'Total: add both teams’ scores. Over means above the line; under means below it. The winning team does not matter.',
            'Player prop: choose above or below one player’s statistic line. A team win does not guarantee a prop win.'
        ] },
        { id: 'tickets', title: 'Singles, parlays & pushes', summary: 'How a ticket wins or gets refunded.', paragraphs: [
            'A single is one pick on its own ticket. Its result does not depend on a separate single.',
            'A parlay puts several picks on one ticket. Every non-push pick must win. One loss loses the entire stake.',
            'A push is an exact tie against the line. A single refunds the stake. A parlay removes that leg from its odds; if every leg pushes, the stake is returned.',
            'A half-point line cannot push when scores are whole numbers. This lab allows one pick per game and no same-game parlays.',
            'All pending tickets use the same simulated game day. Repeating the same pick does not create independent results.'
        ] },
        { id: 'money', title: 'Stake, profit & risk', summary: 'Know what can leave your balance.', paragraphs: [
            'Bankroll: your available practice credits. Stake: the amount you commit and can lose.',
            'Profit is the gain above your stake. Total return includes the stake. Example: 10 staked + 15 profit = 25 returned.',
            'When you place a ticket, the stake leaves your available balance. A win adds the total return. A loss adds nothing.',
            'There is no guaranteed safe real-money stake. Increasing stakes after a loss can make losses grow quickly.'
        ] },
        { id: 'rules', title: 'Real-app differences', summary: 'Why practice is not real betting.', paragraphs: [
            'Real apps can change prices before confirmation, suspend markets, and have different overtime, tie, void and player-participation rules.',
            'Read the market rules and confirmed ticket. A player not taking part may be treated differently across apps.',
            'This lab uses fixed examples and generated scores, not live odds or forecasts. It accepts no deposits, pays no prizes and never converts credits to stars.',
            'Practice results do not show you can profit with real money. Follow local age and legal restrictions.'
        ] }
    ];
    const teachingSentences = text => text.split(/(?<=[.!?])\s+(?=[A-Z])/);
    const teachingText = text => teachingSentences(text).map(sentence =>
        `<span class="book-sentence">${escape(sentence)}</span>`).join('');
    const glossary = [
        ['Bankroll', 'Available practice credits.'], ['Stake', 'Credits you commit and can lose.'],
        ['Odds', 'The price used to calculate a payout.'], ['Favorite', 'The side priced as more likely; it can still lose.'],
        ['Underdog', 'The side priced as less likely; it can still win.'], ['Moneyline', 'A pick on who wins.'],
        ['Spread / cover', 'A score handicap / beating that handicap.'], ['Total', 'The combined score of both teams.'],
        ['Prop', 'A pick about a particular statistic.'], ['Single', 'One pick on its own ticket.'],
        ['Parlay / leg', 'A combined ticket / one pick inside it.'], ['Push', 'A tie against the line, with a refund or adjusted parlay.'],
        ['Profit / net', 'The gain or loss after counting the stake.'], ['Total return', 'Everything returned on a win, including the stake.'],
        ['Implied probability', 'The chance suggested by the price, not a reliable forecast.'], ['Vig / margin', 'The bookmaker’s edge built into prices.'],
        ['Void', 'A canceled selection under the app’s rules; not modeled here.']
    ];

    function render(content, state, save, back) {
        let slip = [], view = 'practice', gameId = games[0].id, marketId = 'moneyline', stakeValue = '10';
        let lessonId = 'index';
        let quizFeedback = '';
        const quizzes = [
            { question: 'A 10-credit stake at +150 wins. What is the total return, including your stake?',
                answers: ['15 credits', '25 credits', '10 credits'], correct: 1,
                explanation: '+150 pays 15 profit on a 10-credit stake. Returning your 10-credit stake makes 25 total.' },
            { question: 'A two-pick parlay has one win and one loss. What happens?',
                answers: ['Half the stake is returned', 'The full stake is lost', 'The winning pick pays as a single'], correct: 1,
                explanation: 'A parlay is one combined ticket. Any losing leg loses the whole stake, even if the other pick wins.' },
            { question: 'Buffalo +1.5 loses 24–23. Does the spread pick win?',
                answers: ['Yes: 23 + 1.5 beats 24', 'No: Buffalo lost the game'], correct: 0,
                explanation: 'The spread is not the moneyline. Buffalo’s adjusted score is 24.5, which covers against 24.' }
        ];
        let quizIndex = 0;
        function practice() {
            const game = games.find(g => g.id === gameId), market = markets.find(m => m.id === marketId);
            return `
                ${slip.length ? '' : `<section class="book-card"><h3>Practice simulator</h3>
                    <button type="button" id="book-guide" class="book-primary">Start guided example</button>
                    <small>Prepares a ticket without spending credits.</small>
                </section>`}
                <section class="book-card">
                    <h3><span class="book-step">1</span> Choose a matchup</h3>
                    <div class="book-switch" role="group" aria-label="Choose a matchup">${games.map(g =>
                        `<button type="button" data-game="${g.id}" aria-pressed="${gameId === g.id}"><small>${g.sport}</small>${g.away} at ${g.home}</button>`).join('')}</div>
                    <p class="book-muted">Fixed teaching examples, not today’s games. Results are generated by the simulator.</p>
                    <h3><span class="book-step">2</span> Choose what to predict</h3>
                    <div class="book-markets" role="group" aria-label="Bet type">${markets.map(m =>
                        `<button type="button" data-market="${m.id}" aria-pressed="${marketId === m.id}">${m.name}<small>${m.hint}</small></button>`).join('')}</div>
                    <p class="book-explainer">${teachingText(market.lesson)}</p>
                    <div class="book-lines">${market.types.map(type => {
                        const id = `${game.id}:${type}`, s = selections[id], chosen = slip.includes(id);
                        return `<button type="button" data-pick="${id}" aria-pressed="${chosen}">
                            <span>${s.label}</span><strong>${oddsText(s.odds)}</strong><small>${chosen ? 'Selected · tap to remove' : 'Tap to add to your slip'}</small>
                        </button>`;
                    }).join('')}</div>
                    <p class="book-muted">${teachingText('One pick per game. Choosing another from the same game replaces it. To try a two-game parlay, add a pick from the other matchup.')}</p>
                    ${slip.length ? '<button type="button" id="book-review">Review bet slip below</button>' : ''}
                </section>
                <section class="book-card book-slip" aria-labelledby="book-slip-title">
                    <h3 id="book-slip-title"><span class="book-step">3</span> Review your ${slip.length > 1 ? 'parlay' : 'single'} bet</h3>
                    ${slip.length ? slip.map(id => `<div class="book-selection"><strong>${selections[id].label} (${oddsText(selections[id].odds)})</strong>
                        <p>${requirement(id)}</p><button type="button" data-remove="${id}" aria-label="Remove ${escape(selections[id].label)}">Remove pick</button></div>`).join('') :
                        '<p>No picks yet. Start with a moneyline selection above, then preview how the stake and payout work.</p>'}
                    ${slip.length > 1 ? '<p class="book-warning"><strong>Parlay risk:</strong> Both picks must win unless a leg pushes. Any loss loses your entire stake. Bigger potential payouts do not mean a better chance of winning.</p>' : ''}
                    <label for="book-stake">Stake <span class="book-muted">(play credits you could lose)</span></label>
                    <input id="book-stake" type="number" min="1" max="${maxBalance / 100}" step="0.01"
                        value="${escape(stakeValue)}" inputmode="decimal" aria-describedby="book-return book-validation">
                    <div id="book-return" class="book-breakdown" aria-live="polite"></div>
                    <p id="book-validation" class="book-warning" role="status"></p>
                    <button type="button" id="book-submit" class="book-primary" ${slip.length ? '' : 'disabled'}>Place practice ${slip.length > 1 ? 'parlay' : 'single'} bet</button>
                    <p class="book-muted">Placing deducts the stake from your available play credits. Nothing uses real money or city stars.</p>
                    ${slip.length ? '<button type="button" id="book-clear">Clear bet slip</button>' : ''}
                </section>`;
        }
        function learn() {
            const q = quizzes[quizIndex];
            const lesson = lessons.find(l => l.id === lessonId);
            const index = [['index', 'Learning index'], ...lessons.map(l => [l.id, l.title]), ['glossary', 'Glossary'], ['quiz', 'Quick quiz']];
            const article = lesson ? `<h3>${lesson.title}</h3>${lesson.paragraphs.map(p => `<p class="book-note">${teachingText(p)}</p>`).join('')}
                ${lessonId === 'markets' ? markets.map(m => `<button type="button" data-try-market="${m.id}">Try ${m.name}</button>`).join(' ') : ''}` :
                lessonId === 'glossary' ? `<h3>Glossary: look up a word</h3><dl>${glossary.map(([word, meaning]) =>
                    `<dt><strong>${word}</strong></dt><dd>${teachingText(meaning)}</dd>`).join('')}</dl>` :
                lessonId === 'quiz' ? `<h3>One question at a time</h3>
                    <p>${q.question}</p><div class="book-quiz">${q.answers.map((answer, i) => `<button type="button" data-answer="${i}">${answer}</button>`).join('')}</div>
                    <p role="status" id="book-quiz-feedback">${teachingText(quizFeedback)}</p>
                    <button type="button" id="book-next-question">Next question</button>` :
                    `<h3>Pick one short topic</h3><p>You do not need to read everything at once.</p>
                    ${lessons.map(l => `<p><button type="button" data-lesson="${l.id}">${l.title}</button><small>${l.summary}</small></p>`).join('')}
                    <p><button type="button" data-lesson="glossary">Glossary</button> <button type="button" data-lesson="quiz">Quick quiz</button></p>`;
            return `<section id="book-learning" class="book-card" tabindex="-1"><h2>Learn in small steps</h2>
                <label for="book-lesson">Choose a learning section</label>
                <select id="book-lesson">${index.map(([id, title]) => `<option value="${id}" ${id === lessonId ? 'selected' : ''}>${title}</option>`).join('')}</select>
                <article id="book-lesson-content">${article}</article>
                ${lessonId !== 'index' ? '<button type="button" data-lesson="index">Back to learning index</button>' : ''}
                <button type="button" id="book-top">Back to simulator</button></section>`;
        }
        function tickets() {
            return `
                <section class="book-card"><h3>Pending practice tickets (${state.pending.length})</h3>
                    <p>Every pending ticket settles against the same generated game day. Repeated tickets are not independent outcomes.</p>
                    ${state.pending.length ? state.pending.map(t => `<article class="book-selection"><strong>${t.legs.length > 1 ? 'Parlay' : 'Single'}</strong>
                        ${t.legs.map(id => `<p>${escape(selections[id].label)} (${oddsText(selections[id].odds)})<br><small>${requirement(id)}</small></p>`).join('')}
                        <p>Stake ${format(t.stake)} · Potential total return ${format(potential(t))} credits, including stake.</p>
                    </article>`).join('') : '<p>No pending tickets. Build a practice bet to see how settlement works.</p>'}
                    <button type="button" id="book-simulate" class="book-primary" ${state.pending.length ? '' : 'disabled'}>Simulate results & explain tickets</button>
                </section>
                ${state.scores.length ? `<section class="book-card"><h3>Latest simulated scores</h3>${state.scores.map(s => `<p>${escape(s)}</p>`).join('')}</section>` : ''}
                <section class="book-card"><h3>Settled tickets: what happened?</h3>
                    <p>A win adds the total return to your available balance. A loss returns nothing. Net shows the overall gain or loss after the stake.</p>
                    ${state.history.length ? state.history.map(s => `<article class="book-selection"><p>${escape(s)}</p></article>`).join('') : '<p>Your first explanation will appear here after you simulate results.</p>'}
                </section>
                <details class="book-card"><summary>Practice settings</summary><p>Resetting erases practice tickets and restores 1,000 play credits. City stars and purchases are not affected.</p>
                    <button type="button" id="book-reset">Reset practice balance and history</button>
                </details>`;
        }
        function draw(message = '', focus = '') {
            content.innerHTML = `
                <div class="sports-game sportsbook">
                    <h2>Betting Practice Lab</h2>
                    <p>Learn the ticket before you place the bet.</p>
                    <div class="book-bankroll"><span>Available play credits<strong>${format(state.balance)}</strong></span>
                        <span>Pending stakes<strong>${format(state.pending.reduce((sum, t) => sum + t.stake, 0))}</strong></span></div>
                    <p class="book-muted"><strong>Simulation only.</strong> No real money, prizes or conversion to city stars. Fixed examples, not live odds or betting advice.</p>
                    <nav class="book-tabs" aria-label="Betting practice sections">${[
                        ['practice', 'Simulator'], ['learn', 'Learning sections'], ['tickets', `Tickets (${state.pending.length})`]
                    ].map(([id, label]) => `<button type="button" data-view="${id}" aria-pressed="${view === id}">${label}</button>`).join('')}</nav>
                    <p class="game-result" id="book-message" role="status" tabindex="-1">${escape(message)}</p>
                    ${view === 'tickets' ? tickets() : practice() + learn()}
                    <button type="button" id="book-back">Back to arena</button>
                </div>`;
            content.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
                view = button.dataset.view; draw('', view === 'learn' ? '#book-learning' : `[data-view="${view}"]`);
            }));
            const showLesson = id => { lessonId = id; draw('', '#book-learning'); };
            const lessonSelect = content.querySelector('#book-lesson');
            if (lessonSelect) lessonSelect.addEventListener('change', () => showLesson(lessonSelect.value));
            content.querySelectorAll('[data-lesson]').forEach(button => button.addEventListener('click', () => showLesson(button.dataset.lesson)));
            const top = content.querySelector('#book-top');
            if (top) top.addEventListener('click', () => content.querySelector('[data-view="practice"]').focus());
            content.querySelectorAll('[data-game]').forEach(button => button.addEventListener('click', () => {
                gameId = button.dataset.game; draw('', `[data-game="${gameId}"]`);
            }));
            content.querySelectorAll('[data-market]').forEach(button => button.addEventListener('click', () => {
                marketId = button.dataset.market; draw('', `[data-market="${marketId}"]`);
            }));
            content.querySelectorAll('[data-pick]').forEach(button => button.addEventListener('click', () => {
                const id = button.dataset.pick;
                const removed = slip.includes(id), replaced = slip.find(pick => selections[pick].game === selections[id].game);
                if (removed) slip = slip.filter(pick => pick !== id);
                else { slip = slip.filter(pick => selections[pick].game !== selections[id].game); slip.push(id); }
                const action = removed ? 'Pick removed.' : replaced ? 'Earlier pick for this game replaced.' : 'Pick added.';
                draw(`${action} Bet slip: ${slip.length} pick${slip.length === 1 ? '' : 's'}. Review before placing.`, `[data-pick="${id}"]`);
            }));
            content.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => {
                slip = slip.filter(id => id !== button.dataset.remove); draw('Pick removed.', '#book-stake');
            }));
            const stakeInput = content.querySelector('#book-stake');
            if (stakeInput) {
                const updateReturn = () => {
                    stakeValue = stakeInput.value;
                    const stake = parseStake(stakeValue), error = ticketError(state, slip, stake);
                    content.querySelector('#book-validation').textContent = error;
                    stakeInput.setAttribute('aria-invalid', String(stake === null || (slip.length > 0 && !!error)));
                    const output = content.querySelector('#book-return');
                    if (!stake || !slip.length) { output.textContent = 'Choose a pick and enter a stake to preview the outcomes.'; return; }
                    const q = quote(slip, stake);
                    output.innerHTML = `<dl>
                        <div><dt>If you win: net profit</dt><dd>+${format(q.profit)}</dd></div>
                        <div><dt>Total return (stake + profit)</dt><dd>${format(q.total)}</dd></div>
                        <div><dt>If you lose: full stake at risk</dt><dd>−${format(q.loss)}</dd></div>
                        <div><dt>Stake / available balance</dt><dd>${state.balance ? (stake / state.balance * 100).toFixed(1) + '%' : 'No credits available'}</dd></div>
                    </dl><p>Ticket odds <strong>${oddsText(q.american)}</strong> · Decimal ${q.multiplier.toFixed(3)} · Implied ${q.implied.toFixed(1)}%</p>
                    <p class="book-muted">Implied percentage is the price, not your actual chance of winning. Return assumes all picks win; a push changes the return.
                        ${slip.length > 1 ? 'Combined odds are rounded for display; return uses the unrounded individual prices.' : ''}</p>`;
                };
                stakeInput.addEventListener('input', updateReturn);
                updateReturn();
                content.querySelector('#book-submit').addEventListener('click', () => {
                    const result = place(state, slip, parseStake(stakeInput.value));
                    if (result.error) { draw(result.error, '#book-message'); return; }
                    slip = []; view = 'tickets';
                    save(); draw('Practice bet placed. Your stake was deducted. Simulate results to learn how it settles.', '#book-message');
                });
            }
            const bind = (selector, handler) => {
                const element = content.querySelector(selector);
                if (element) element.addEventListener('click', handler);
            };
            bind('#book-review', () => content.querySelector('#book-stake').focus());
            bind('#book-clear', () => { slip = []; draw('Bet slip cleared.', '#book-stake'); });
            bind('#book-simulate', () => {
                if (!state.pending.length) return;
                const results = Object.fromEntries(games.map(g => [g.id, simulate(g)]));
                settle(state, results);
                save(); draw('Simulation complete. Read the scores and the reason each ticket won, lost or pushed below.', '#book-message');
            });
            bind('#book-reset', () => {
                if (!window.confirm('Reset play credits to 1,000 and erase pending tickets and history?')) return;
                Object.assign(state, initial()); slip = []; save(); draw('Practice balance and history reset.', '#book-message');
            });
            bind('#book-guide', () => {
                view = 'practice'; gameId = 'football'; marketId = 'moneyline'; slip = ['football:awayML']; stakeValue = '10';
                draw('Example ready, not placed: read what Kansas City needs to do, then compare profit and total return.', '#book-stake');
            });
            content.querySelectorAll('[data-try-market]').forEach(button => button.addEventListener('click', () => {
                view = 'practice'; marketId = button.dataset.tryMarket; draw('', `[data-market="${marketId}"]`);
            }));
            content.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
                const q = quizzes[quizIndex], correct = Number(button.dataset.answer) === q.correct;
                quizFeedback = `${correct ? 'Correct!' : 'Not quite.'} ${q.explanation}`;
                content.querySelector('#book-quiz-feedback').textContent = quizFeedback;
            }));
            bind('#book-next-question', () => {
                quizIndex = (quizIndex + 1) % quizzes.length; quizFeedback = ''; draw('', '[data-answer="0"]');
            });
            content.querySelector('#book-back').addEventListener('click', back);
            if (focus) content.querySelector(focus).focus();
        }
        draw();
    }
    return { games, selections, markets, lessons, glossary, teachingSentences, initial, valid, decimal, outcome, settle, render, parseStake, quote, place, requirement, evidence };
})();

if (typeof module !== 'undefined') module.exports = Sportsbook;
