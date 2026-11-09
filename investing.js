'use strict';

const Investing = (() => {
    const startingCash = 1000000, limit = 100000000000000;
    const assets = {
        tech: { name: 'District Technology', symbol: 'DTECH', type: 'Stock', initial: 10000, dividend: 25,
            lesson: 'A share is ownership in one fictional company. Its price and dividend can fall; a company can fail. One stock is not a diversified portfolio.' },
        utility: { name: 'Metro Utilities', symbol: 'MUTIL', type: 'Stock', initial: 5000, dividend: 50,
            lesson: 'Dividend-paying stocks still carry company and market risk. A dividend is not free money: on the payment day this model also reduces the share price by the distribution.' },
        etf: { name: 'Broad Market Index ETF', symbol: 'DMVX', type: 'ETF', initial: 10000, expense: .0008, dividend: 30,
            lesson: 'An ETF holds a basket of investments and trades like a stock. This fictional broad-market fund diversifies company exposure, not market risk. Not every ETF is diversified or low risk.' },
        fund: { name: 'Balanced Mutual Fund', symbol: 'BALMF', type: 'Mutual fund', initial: 10000, expense: .008, dividend: 40,
            lesson: 'This fictional fund blends stocks and bonds. Orders fill at the next simulated closing net asset value (NAV), not the displayed estimate. Fund expenses reduce NAV over time.' },
        bond: { name: 'Teaching Treasury-style Bond', symbol: 'BOND', type: 'Bond', initial: 10000,
            lesson: 'A bond is a loan, not company ownership. This example pays a fixed 4% annual coupon on 100 face value, in two payments of 2. Rising market yields reduce its price. Coupon rate is not the same as yield.' },
        call: { name: 'DTECH Call', symbol: 'CALL', type: 'Option',
            lesson: 'Buying a call gives the right to buy at the strike. You pay a premium upfront and can lose all of it. One practice contract represents 100 shares. This lab cash-settles at expiry instead of exercising shares.' },
        put: { name: 'DTECH Put', symbol: 'PUT', type: 'Option',
            lesson: 'Buying a put gives the right to sell at the strike. Its value generally benefits from a falling underlying price. Time value decays, and the entire premium can be lost. This lab only permits fully paid long options.' }
    };
    const ids = Object.keys(assets), baseIds = ids.filter(id => assets[id].initial);
    const money = cents => (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const integer = (n, min, max = limit) => Number.isSafeInteger(n) && n >= min && n <= max;
    const log = (state, text) => { state.history.unshift(`Day ${state.day}: ${text}`); state.history = state.history.slice(0, 40); };
    function initial() {
        return { day: 0, cash: startingCash, realized: 0, income: 0, yield: .04, maturity: 360, couponDay: 180,
            expiry: 30, strike: 10000, prices: Object.fromEntries(baseIds.map(id => [id, assets[id].initial])),
            feeCarry: { etf: 0, fund: 0 }, holdings: Object.fromEntries(ids.map(id => [id, { qty: 0, cost: 0 }])),
            orders: [], history: [], chart: [{ day: 0, value: startingCash }] };
    }
    function valid(state) {
        if (!state || !integer(state.day, 0, 1000000) || !integer(state.cash, 0) ||
            !integer(state.realized, -limit) || !integer(state.income, 0) ||
            !Number.isFinite(state.yield) || state.yield < .01 || state.yield > .15 ||
            !integer(state.maturity, state.day + 1, state.day + 360) ||
            !integer(state.couponDay, state.day + 1, Math.min(state.maturity, state.day + 180)) ||
            state.maturity % 360 !== 0 || state.couponDay % 180 !== 0 ||
            !integer(state.expiry, state.day + 1, state.day + 30) || state.expiry % 30 !== 0 ||
            !integer(state.strike, 1, 100000000) || !state.prices || !state.holdings ||
            !baseIds.every(id => integer(state.prices[id], 1, 100000000)) ||
            !ids.every(id => {
                const h = state.holdings[id];
                return h && integer(h.qty, 0, assets[id].type === 'Option' ? 100 : 10000) &&
                    integer(h.cost, 0) && (h.qty !== 0 || h.cost === 0);
            }) || !state.feeCarry || !['etf', 'fund'].every(id =>
                Number.isFinite(state.feeCarry[id]) && state.feeCarry[id] >= 0 && state.feeCarry[id] < 1)) return false;
        return Array.isArray(state.orders) && state.orders.length <= 1 && state.orders.every(o =>
            o.id === 'fund' && ['buy', 'sell'].includes(o.side) && integer(o.qty, 1, 10000) &&
            (o.side !== 'sell' || o.qty <= state.holdings.fund.qty)) &&
            Array.isArray(state.history) && state.history.length <= 40 &&
            state.history.every(text => typeof text === 'string' && text.length <= 1000) &&
            Array.isArray(state.chart) && state.chart.length >= 1 && state.chart.length <= 60 &&
            state.chart.every(point => integer(point.day, 0, state.day) && integer(point.value, 0));
    }
    function price(state, id) {
        if (assets[id].type !== 'Option') return state.prices[id];
        const intrinsic = Math.max(0, id === 'call' ? state.prices.tech - state.strike : state.strike - state.prices.tech);
        return intrinsic + Math.round(500 * Math.sqrt(Math.max(0, state.expiry - state.day) / 30));
    }
    const multiplier = id => assets[id].type === 'Option' ? 100 : 1;
    const value = (state, id) => state.holdings[id].qty * price(state, id) * multiplier(id);
    const equity = state => state.cash + ids.reduce((sum, id) => sum + value(state, id), 0);
    function preview(state, id, side, qty) {
        if (!Object.hasOwn(assets, id) || !['buy', 'sell'].includes(side) ||
            !integer(qty, 1, assets[id].type === 'Option' ? 100 : 10000))
            return { error: 'Enter a whole quantity from 1 to 10,000 (up to 100 option contracts).' };
        const total = qty * price(state, id) * multiplier(id), h = state.holdings[id];
        if (id === 'fund' && state.orders.length) return { error: 'Cancel or fill the pending mutual fund order first.' };
        if (side === 'buy' && h.qty + qty > (assets[id].type === 'Option' ? 100 : 10000))
            return { error: 'This order exceeds the practice position limit.' };
        if (side === 'buy' && total > state.cash) return { error: 'Not enough practice cash. Reduce the quantity or sell an existing position.' };
        if (side === 'sell' && qty > h.qty) return { error: 'You cannot sell more than you own. Short selling and margin are not enabled.' };
        if (side === 'sell' && state.cash + total > limit) return { error: 'This sale exceeds the simulator balance limit.' };
        return { total, unitPrice: price(state, id), maxLoss: side === 'buy' ? total : 0 };
    }
    function fill(state, id, side, qty, total) {
        const h = state.holdings[id];
        if (side === 'buy') { state.cash -= total; h.qty += qty; h.cost += total; }
        else {
            const basis = Math.round(h.cost * qty / h.qty);
            state.cash += total; state.realized += total - basis; h.qty -= qty; h.cost -= basis;
        }
        log(state, `${side === 'buy' ? 'Bought' : 'Sold'} ${qty} ${assets[id].symbol}${assets[id].type === 'Option' ? ` contracts (strike ${money(state.strike)}, expiry day ${state.expiry})` : ''} at ${money(price(state, id))} per ${assets[id].type === 'Option' ? 'share of premium × 100' : 'unit'}; total ${money(total)} practice dollars.`);
    }
    function trade(state, id, side, qty) {
        const result = preview(state, id, side, qty);
        if (result.error) return result;
        if (id === 'fund') {
            state.orders.push({ id, side, qty });
            log(state, `Queued ${side} of ${qty} BALMF units for the next closing NAV. Cash is not reserved; a buy fails if cash is insufficient at the close.`);
        } else fill(state, id, side, qty, result.total);
        return { message: id === 'fund' ? 'Order queued, not filled. Advance a day for the next closing NAV.' : 'Practice trade filled at the displayed synthetic price.' };
    }
    function bondPrice(state) {
        let total = 0;
        for (let day = state.couponDay; day <= state.maturity; day += 180)
            total += (200 + (day === state.maturity ? 10000 : 0)) / Math.pow(1 + state.yield / 2, (day - state.day) / 180);
        return Math.round(total);
    }
    function advance(state, random = Math.random) {
        if (state.day >= 1000000) return { error: 'This practice timeline is complete. Reset the lab to start another portfolio.' };
        const next = structuredClone(state), shock = random() * 2 - 1;
        next.day++;
        const oldYield = next.yield;
        next.yield = Math.max(.01, Math.min(.15, next.yield + (random() * 2 - 1) * .001));
        for (const id of ['tech', 'utility', 'etf', 'fund']) {
            const exposure = id === 'tech' ? 1.4 : id === 'utility' ? .6 : id === 'fund' ? .6 : 1;
            const specific = ['tech', 'utility'].includes(id) ? (random() * 2 - 1) * (id === 'tech' ? .025 : .012) : 0;
            const rateImpact = id === 'fund' ? -(next.yield - oldYield) * .4 : 0;
            const fee = (assets[id].expense || 0) * state.prices[id] / 360 + (next.feeCarry[id] || 0);
            if (assets[id].expense) next.feeCarry[id] = fee - Math.floor(fee);
            next.prices[id] = Math.max(1, Math.min(100000000, Math.round(state.prices[id] * (1 + shock * .012 * exposure + specific + rateImpact)) - Math.floor(fee)));
            if (next.day % 90 === 0) {
                const distribution = Math.min(assets[id].dividend, next.prices[id] - 1);
                const cash = distribution * next.holdings[id].qty;
                next.cash += cash; next.income += cash; next.prices[id] -= distribution;
                if (cash) log(next, `${assets[id].symbol} distribution: +${money(cash)} cash. Its quote also fell by ${money(distribution)} per unit; distributions are not free extra return.`);
            }
        }
        if (next.day === next.couponDay) {
            const coupon = next.holdings.bond.qty * 200;
            next.cash += coupon; next.income += coupon;
            if (coupon) log(next, `Bond coupon: +${money(coupon)} cash (2 per 100 face value).`);
            next.couponDay += 180;
        }
        if (next.day === next.maturity) {
            const h = next.holdings.bond, principal = h.qty * 10000;
            next.cash += principal; next.realized += principal - h.cost;
            if (h.qty) log(next, `Bond matured: ${money(principal)} face value returned. Gain/loss versus purchase cost: ${money(principal - h.cost)}.`);
            next.holdings.bond = { qty: 0, cost: 0 }; next.maturity += 360;
        }
        next.prices.bond = bondPrice(next);
        if (next.day === next.expiry) {
            for (const id of ['call', 'put']) {
                const h = next.holdings[id], payout = value(next, id);
                next.cash += payout; next.realized += payout - h.cost;
                if (h.qty) log(next, `${assets[id].symbol} expired: intrinsic value × 100 × ${h.qty} = ${money(payout)} returned; net ${money(payout - h.cost)}. No shares were exercised.`);
                next.holdings[id] = { qty: 0, cost: 0 };
            }
            next.expiry += 30; next.strike = Math.max(500, Math.round(next.prices.tech / 500) * 500);
        }
        const orders = next.orders;
        next.orders = [];
        for (const order of orders) {
            const result = preview(next, order.id, order.side, order.qty);
            if (result.error) log(next, `BALMF order rejected at closing NAV: ${result.error}`);
            else fill(next, order.id, order.side, order.qty, result.total);
        }
        log(next, `${shock >= 0 ? 'Optimistic' : 'Cautious'} synthetic session. Bond market yield ${(next.yield * 100).toFixed(2)}%. Prices can move differently; this is not real news.`);
        next.chart.push({ day: next.day, value: equity(next) }); next.chart = next.chart.slice(-60);
        if (!valid(next)) return { error: 'Simulator arithmetic limit reached. No day was advanced; reduce positions or reset practice.' };
        Object.assign(state, next);
        return { message: 'One simulated day completed. Review price changes, pending fills and portfolio risk.' };
    }
    function render(content, state, save, back) {
        let view = 'explore', selected = 'etf', side = 'buy', quantity = '1', feedback = '', question = 0;
        const quizzes = [
            { q: 'A call premium is 5 per share. What does one 100-share contract cost?', choices: ['5', '500', '100'], correct: 1,
                why: '5 × 100 = 500 upfront. The entire premium can be lost, even if the underlying stock only moves a little.' },
            { q: 'Market interest rates rise. What usually happens to the price of an existing fixed-rate bond?', choices: ['It tends to fall', 'It always rises', 'It cannot change'], correct: 0,
                why: 'New bonds can offer higher yields, making the old fixed payments less attractive. Holding to maturity and selling early are different outcomes.' },
            { q: 'A broad stock ETF is diversified. Can it still lose money?', choices: ['No, diversification guarantees profit', 'Yes, the overall market can fall'], correct: 1,
                why: 'Diversification can reduce single-company risk. It does not remove market risk or guarantee a return.' }
        ];
        const assetButtons = () => `<div class="book-markets" role="group" aria-label="Choose an investment">${ids.map(id =>
            `<button type="button" data-invest-asset="${id}" aria-pressed="${selected === id}">${assets[id].symbol}<small>${assets[id].type}</small></button>`).join('')}</div>`;
        function explore() {
            const a = assets[selected], option = a.type === 'Option';
            return `<section class="book-card"><h3>1 · Explore an investment</h3>${assetButtons()}
                <h3>${a.name}</h3><p class="book-explainer">${a.lesson}</p>
                <p><strong>${money(price(state, selected))}</strong> practice dollars per ${option ? 'share of premium; one contract = 100 shares' : 'unit'}.</p>
                ${a.expense ? `<p>Annual expense ratio: ${(a.expense * 100).toFixed(2)}%. Expenses accrue inside NAV each day, not as a separate trading bill.</p>` : ''}
                ${selected === 'bond' ? `<p>100 face value · 4% fixed coupon · market yield ${(state.yield * 100).toFixed(2)}% · next coupon day ${state.couponDay} · maturity day ${state.maturity}. Prices include the value of upcoming coupons in this simplified model.</p>` : ''}
                ${option ? `<p>Underlying DTECH: ${money(state.prices.tech)} · strike ${money(state.strike)} · expiry day ${state.expiry} (${state.expiry - state.day} days left).</p>
                    <p>Expiry break-even for a new purchase: ${money(selected === 'call' ? state.strike + price(state, selected) : state.strike - price(state, selected))}.
                        Before expiry, price also includes simplified time value. An in-the-money option can still lose money after its premium.</p>` : ''}
                </section><section class="book-card book-slip"><h3>2 · Review a practice order</h3>
                <div class="book-switch" role="group" aria-label="Buy or sell">${['buy', 'sell'].map(s =>
                    `<button type="button" data-invest-side="${s}" aria-pressed="${side === s}">${s === 'buy' ? 'Buy with cash' : 'Sell what you own'}</button>`).join('')}</div>
                <label for="invest-quantity">Whole ${option ? 'contracts (100 shares each)' : 'units'}</label>
                <input id="invest-quantity" class="invest-input" type="number" inputmode="numeric" min="1" max="${option ? 100 : 10000}" step="1" value="${escape(quantity)}" aria-describedby="invest-preview invest-error">
                <div id="invest-preview" class="book-breakdown" aria-live="polite"></div><p id="invest-error" class="book-warning" role="status"></p>
                ${selected === 'fund' ? '<p class="book-warning">This queues an order at the next closing NAV. Final cost is unknown. Cash is not reserved, and buys are rejected at the close if cash is insufficient.</p>' : ''}
                <button type="button" class="book-primary" id="invest-submit">${selected === 'fund' ? 'Queue' : 'Place'} practice ${side} order</button>
                <p class="book-muted">No real money. No commissions, bid/ask spreads, taxes, leverage or short selling are modeled. Selling uses average cost for this teaching ledger, not tax-lot accounting.</p>
                </section>`;
        }
        function portfolio() {
            const held = ids.filter(id => state.holdings[id].qty);
            const chart = state.chart, low = Math.min(...chart.map(p => p.value)), high = Math.max(...chart.map(p => p.value));
            const points = chart.map((p, i) => `${10 + i / Math.max(1, chart.length - 1) * 280},${90 - (p.value - low) / Math.max(1, high - low) * 70}`).join(' ');
            return `<section class="book-card"><h3>Your practice portfolio</h3>
                <p>Total return since start: <strong>${money(equity(state) - startingCash)}</strong> (${((equity(state) / startingCash - 1) * 100).toFixed(2)}%). Includes income and unrealized changes.</p>
                <svg viewBox="0 0 300 110" role="img" aria-label="Portfolio value over the last ${chart.length} recorded days. Low ${money(low)}, high ${money(high)}." class="invest-chart"><polyline points="${points}" fill="none" stroke="#6ee7b7" stroke-width="3"/></svg>
                <p class="book-muted">Daily closing snapshots · low ${money(low)} / high ${money(high)} · chart axis is scaled, not zero-based. Trades today appear in the next daily snapshot.</p>
                <p>Realized gains/losses: ${money(state.realized)} · Cash income: ${money(state.income)}. Income is paid to cash, not automatically reinvested.</p>
                ${held.length ? held.map(id => { const h = state.holdings[id], mark = value(state, id);
                    return `<article class="book-selection"><strong>${assets[id].symbol} · ${h.qty} ${assets[id].type === 'Option' ? 'contracts' : 'units'}</strong>
                        <p>Current value ${money(mark)} · Cost basis ${money(h.cost)} · Unrealized ${money(mark - h.cost)}.</p>
                        <p>Portfolio weight ${(mark / Math.max(1, equity(state)) * 100).toFixed(1)}%. ${assets[id].type === 'Option' ? `Strike ${money(state.strike)}; expiry day ${state.expiry}. Premium is at risk.` : ''}</p>
                        <button type="button" data-invest-manage="${id}">Review this holding</button></article>`;
                }).join('') : '<p>No holdings yet. Explore an ETF or stock to prepare your first practice order.</p>'}
                <p class="book-muted">Concentration in one company or asset class adds risk. A low-risk-looking price chart does not guarantee future safety.</p>
                </section><section class="book-card"><h3>Pending mutual fund orders</h3>
                ${state.orders.length ? state.orders.map(o => `<p>${o.side} ${o.qty} BALMF units at next close.</p><button type="button" id="invest-cancel">Cancel pending order</button>`).join('') : '<p>No pending orders.</p>'}
                </section><section class="book-card"><h3>Activity & explanations</h3>
                ${state.history.length ? state.history.map(text => `<p class="book-selection">${escape(text)}</p>`).join('') : '<p>Your trades, distributions and option expirations will be explained here.</p>'}
                </section><details class="book-card"><summary>Practice settings</summary><p>Reset only the investing lab to 10,000 practice dollars. City purchases and betting credits are unchanged.</p>
                <button type="button" id="invest-reset">Reset investing portfolio</button></details>`;
        }
        function learn() {
            const q = quizzes[question];
            return `<section class="book-card"><h3>Start with a no-spend walkthrough</h3>
                <p>Explore an asset → read its risks → enter a quantity → review the cost → place a practice order → advance a day → compare your portfolio.</p>
                <button type="button" id="invest-guide" class="book-primary">Prepare a one-share ETF example</button><p>This only prepares an order; it does not buy anything.</p></section>
                <section class="book-card"><h3>Learn the building blocks</h3>
                ${['tech', 'etf', 'fund', 'bond', 'call', 'put'].map(id => `<details><summary>${assets[id].type}: ${assets[id].name}</summary><p>${assets[id].lesson}</p>
                    <button type="button" data-invest-try="${id}">Explore this example</button></details>`).join('')}
                <details><summary>Compounding, dividends and expenses</summary><p>Reinvesting distributions can let future returns build on prior returns, but losses compound too. This lab pays distributions into cash; you choose whether to reinvest.</p>
                    <p>An expense ratio is an annual fund cost, separate from commissions. This lab uses a 360-day teaching year, with ETF/fund expenses deducted gradually from NAV. Taxes and inflation are not included.</p></details>
                <details><summary>Diversification, time horizon and risk</summary><p>Mixing companies and asset classes can reduce concentration risk, not eliminate losses. Match risk to goals, the time you can leave money invested, liquidity needs and ability to absorb losses. This lab does not give personal allocation advice.</p>
                    <p>Stocks, funds and bonds can all fall. This bond example has no default risk modeled; real bonds also have credit, inflation and liquidity risk. Bond funds do not work like a single bond held to maturity.</p></details>
                <details><summary>Options: price direction is not enough</summary><p>Premium includes intrinsic value and time value. Time decay and changing volatility can hurt a long option even when its stock moves in the expected direction.</p>
                    <p>Real equity options can involve exercise, assignment and 100-share delivery. This lab instead cash-settles intrinsic value at expiry. Its time-value formula is deliberately simplified, not a real options pricing model. No uncovered selling, spreads, margin or early exercise.</p></details>
                <details><summary>Orders and real-world differences</summary><p>Stocks and ETFs fill immediately at displayed synthetic quotes here. Mutual funds fill at the next closing NAV. In a real app, market orders can fill at a different price; limit orders constrain price but may not fill.</p>
                    <p>All assets and news here are fictional. Prices are bounded for the simulation. No live quotes, guaranteed returns or recommendations. Real trading involves fees, taxes, execution risk and changing fund/contract rules; read the actual disclosures before investing.</p></details>
                </section><section class="book-card"><h3>Check your understanding</h3><p>${q.q}</p>
                <div class="book-quiz">${q.choices.map((text, i) => `<button type="button" data-invest-answer="${i}">${text}</button>`).join('')}</div>
                <p id="invest-feedback" role="status">${escape(feedback)}</p><button type="button" id="invest-next-question">Next question</button></section>`;
        }
        function draw(message = '', focus = '') {
            content.innerHTML = `<div class="sports-game sportsbook investing"><h2>Investing Practice Lab</h2>
                <p>Learn ownership, risk and returns without real money.</p><div class="book-bankroll"><span>Practice cash<strong>${money(state.cash)}</strong></span>
                <span>Portfolio + cash<strong>${money(equity(state))}</strong></span></div>
                <p class="book-muted">Day ${state.day} · Started with 10,000 practice dollars. Fictional assets; no real money, prizes or conversion to stars. Educational simulation, not investment advice.</p>
                <nav class="book-tabs" aria-label="Investing sections">${[['explore', 'Explore'], ['learn', 'Learn basics'], ['portfolio', 'Portfolio']].map(([id, label]) =>
                    `<button type="button" data-invest-view="${id}" aria-pressed="${view === id}">${label}</button>`).join('')}</nav>
                <button type="button" id="invest-advance" class="book-primary">Advance one simulated day</button>
                <p class="book-muted">Moves all prices, fills queued fund orders, and processes any due income or expirations. Time never advances on its own.</p>
                <p id="invest-message" class="game-result" role="status" tabindex="-1">${escape(message)}</p>
                ${view === 'explore' ? explore() : view === 'learn' ? learn() : portfolio()}
                <button type="button" id="invest-back">Back to computer</button></div>`;
            const bind = (selector, action) => { const element = content.querySelector(selector); if (element) element.addEventListener('click', action); };
            const each = (selector, action) => content.querySelectorAll(selector).forEach(button => button.addEventListener('click', () => action(button)));
            each('[data-invest-view]', b => { view = b.dataset.investView; draw('', `[data-invest-view="${view}"]`); });
            each('[data-invest-asset]', b => { selected = b.dataset.investAsset; draw('', `[data-invest-asset="${selected}"]`); });
            each('[data-invest-side]', b => { side = b.dataset.investSide; draw('', `[data-invest-side="${side}"]`); });
            each('[data-invest-manage]', b => { selected = b.dataset.investManage; view = 'explore'; draw('', '#invest-quantity'); });
            each('[data-invest-try]', b => { selected = b.dataset.investTry; view = 'explore'; draw('', `[data-invest-asset="${selected}"]`); });
            const input = content.querySelector('#invest-quantity');
            if (input) {
                const update = () => {
                    quantity = input.value;
                    const q = preview(state, selected, side, Number(quantity)), option = assets[selected].type === 'Option';
                    content.querySelector('#invest-error').textContent = q.error || '';
                    input.setAttribute('aria-invalid', String(!!q.error));
                    content.querySelector('#invest-preview').innerHTML = q.error ? '<p>Enter a valid order to see its cost and risk.</p>' :
                        `<dl><div><dt>${selected === 'fund' ? 'Estimated' : 'Order'} ${side === 'buy' ? 'cost' : 'proceeds'}</dt><dd>${money(q.total)}</dd></div>
                        <div><dt>Cash ${selected === 'fund' ? 'if filled at this NAV' : 'after trade'}</dt><dd>${money(state.cash + (side === 'buy' ? -q.total : q.total))}</dd></div>
                        ${side === 'buy' ? `<div><dt>${option ? 'Maximum premium loss' : 'Amount invested (can lose value)'}</dt><dd>${money(q.maxLoss)}</dd></div>` : ''}</dl>
                        <p>${Number(quantity)} × ${money(q.unitPrice)}${option ? ' × 100 shares per contract' : ''} = ${money(q.total)} practice dollars.</p>`;
                };
                input.addEventListener('input', update); update();
                bind('#invest-submit', () => {
                    const result = trade(state, selected, side, Number(input.value));
                    if (!result.error) save();
                    draw(result.error || result.message, '#invest-message');
                });
            }
            bind('#invest-advance', () => { const result = advance(state); if (!result.error) save(); draw(result.error || result.message, '#invest-message'); });
            bind('#invest-cancel', () => { state.orders = []; log(state, 'Pending mutual fund order canceled; no money was spent.'); save(); draw('Pending order canceled.', '#invest-message'); });
            bind('#invest-guide', () => { selected = 'etf'; side = 'buy'; quantity = '1'; view = 'explore'; draw('Example ready, not placed. Review the cost and risks before buying.', '#invest-quantity'); });
            each('[data-invest-answer]', b => {
                const q = quizzes[question]; feedback = `${Number(b.dataset.investAnswer) === q.correct ? 'Correct!' : 'Not quite.'} ${q.why}`;
                content.querySelector('#invest-feedback').textContent = feedback;
            });
            bind('#invest-next-question', () => { question = (question + 1) % quizzes.length; feedback = ''; draw('', '[data-invest-answer="0"]'); });
            bind('#invest-reset', () => {
                if (!window.confirm('Reset only investing cash, holdings and history to a new 10,000-dollar practice portfolio?')) return;
                Object.assign(state, initial()); quantity = '1'; save(); draw('Investing practice reset.', '#invest-message');
            });
            bind('#invest-back', back);
            if (focus) content.querySelector(focus).focus();
        }
        draw();
    }
    return { assets, initial, valid, price, equity, value, preview, trade, advance, bondPrice, render };
})();

if (typeof module !== 'undefined') module.exports = Investing;
