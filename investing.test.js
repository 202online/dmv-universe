'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Investing = require('./investing.js');
const flat = () => .5;
const days = (state, count) => {
    for (let i = 0; i < count; i++) {
        const result = Investing.advance(state, flat);
        assert.equal(result.error, undefined);
        assert.ok(Investing.valid(state));
    }
};

test('new and serialized portfolios validate; malformed financial saves do not', () => {
    const state = Investing.initial();
    assert.ok(Investing.valid(state));
    assert.ok(Investing.valid(JSON.parse(JSON.stringify(state))));
    assert.equal(Investing.equity(state), 1000000);
    for (const mutate of [
        s => { s.cash = -1; }, s => { s.day = Infinity; }, s => { s.yield = NaN; },
        s => { s.holdings.call.qty = 101; }, s => { s.holdings.tech.cost = -1; },
        s => { s.expiry = 0; }, s => { s.prices.etf = undefined; },
        s => { s.feeCarry.fund = 1; }, s => { s.chart[0].value = '100'; },
        s => { s.orders = [{ id: 'tech', side: 'buy', qty: 1 }]; }
    ]) {
        const broken = structuredClone(state); mutate(broken); assert.equal(Investing.valid(broken), false);
    }
});

test('cash purchases, sales and average cost never create money', () => {
    const state = Investing.initial();
    Investing.trade(state, 'tech', 'buy', 2);
    assert.equal(state.cash, 980000);
    assert.equal(Investing.equity(state), 1000000);
    state.prices.tech = 12000;
    Investing.trade(state, 'tech', 'buy', 1);
    assert.deepEqual(state.holdings.tech, { qty: 3, cost: 32000 });
    Investing.trade(state, 'tech', 'sell', 1);
    assert.equal(state.holdings.tech.cost, 21333);
    assert.equal(state.realized, 1333);
    Investing.trade(state, 'tech', 'sell', 2);
    assert.deepEqual(state.holdings.tech, { qty: 0, cost: 0 });
    assert.equal(state.realized, 4000);
    assert.equal(state.cash, 1004000);
    assert.ok(Investing.valid(state));
});

test('invalid orders, margin, short sales and unaffordable purchases report errors without mutation', () => {
    const state = Investing.initial(), original = JSON.stringify(state);
    for (const args of [
        ['missing', 'buy', 1], ['tech', 'hold', 1], ['tech', 'buy', 0], ['tech', 'buy', 1.5],
        ['tech', 'buy', Infinity], ['tech', 'buy', 101], ['call', 'buy', 101], ['tech', 'sell', 1]
    ]) {
        assert.ok(Investing.trade(state, ...args).error, args.join(', '));
        assert.equal(JSON.stringify(state), original);
    }
});

test('mutual fund orders wait for closing NAV; fill price differs from the estimate', () => {
    const state = Investing.initial();
    Investing.trade(state, 'fund', 'buy', 2);
    assert.equal(state.cash, 1000000);
    assert.equal(state.holdings.fund.qty, 0);
    assert.equal(state.orders.length, 1);
    assert.ok(Investing.trade(state, 'fund', 'buy', 1).error);
    const result = Investing.advance(state, () => .75);
    assert.equal(result.error, undefined);
    assert.equal(state.holdings.fund.qty, 2);
    assert.notEqual(state.prices.fund, 10000);
    assert.equal(state.cash, 1000000 - state.prices.fund * 2);
    const cash = state.cash;
    Investing.trade(state, 'fund', 'sell', 2);
    assert.equal(state.cash, cash);
    days(state, 1);
    assert.equal(state.orders.length, 0);
    assert.equal(state.holdings.fund.qty, 0);
    assert.ok(Investing.valid(state));
});

test('a queued fund buy is explicitly rejected when available cash is spent before the close', () => {
    const state = Investing.initial();
    state.cash = 10000;
    Investing.trade(state, 'fund', 'buy', 1);
    Investing.trade(state, 'tech', 'buy', 1);
    days(state, 1);
    assert.equal(state.cash, 0);
    assert.equal(state.holdings.fund.qty, 0);
    assert.equal(state.orders.length, 0);
    assert.ok(state.history.some(text => /order rejected.*Not enough/.test(text)));
});

test('fund expenses accrue below one cent instead of disappearing to daily rounding', () => {
    const state = Investing.initial();
    Investing.trade(state, 'etf', 'buy', 1);
    days(state, 360);
    assert.equal(state.income, 120);
    const expense = 1000000 - Investing.equity(state);
    assert.ok(expense >= 7 && expense <= 8, `Annual ETF expense was ${expense} cents`);
    assert.ok(state.feeCarry.etf >= 0 && state.feeCarry.etf < 1);
    assert.equal(state.chart.length, 60);
    assert.ok(state.history.length <= 40);
});

test('bond prices fall when market yields rise; coupons and maturity preserve principal accounting', () => {
    const state = Investing.initial();
    assert.equal(Investing.bondPrice(state), 10000);
    state.yield = .10;
    assert.ok(Investing.bondPrice(state) < 10000);
    state.yield = .04;
    Investing.trade(state, 'bond', 'buy', 10);
    days(state, 180);
    assert.equal(state.income, 2000);
    days(state, 180);
    assert.equal(state.cash, 1004000);
    assert.equal(state.income, 4000);
    assert.equal(state.realized, 0);
    assert.equal(state.holdings.bond.qty, 0);
    assert.equal(state.maturity, 720);
    assert.equal(state.couponDay, 540);
});

for (const id of ['call', 'put']) {
    test(`${id} contracts cost 100 times the premium, decay, expire and reopen a fresh series`, () => {
        const state = Investing.initial();
        const q = Investing.preview(state, id, 'buy', 1);
        assert.equal(q.unitPrice, 500);
        assert.equal(q.total, 50000);
        assert.equal(q.maxLoss, 50000);
        Investing.trade(state, id, 'buy', 1);
        days(state, 15);
        assert.ok(Investing.price(state, id) < 500);
        days(state, 15);
        assert.equal(state.holdings[id].qty, 0);
        assert.equal(state.cash, 950000);
        assert.equal(state.realized, -50000);
        assert.equal(state.expiry, 60);
        assert.ok(state.history.some(text => /expired.*0.00 returned/.test(text)));
    });
}

test('in-the-money options pay intrinsic value, not stock notional or premium plus intrinsic', () => {
    for (const [id, stockPrice] of [['call', 13000], ['put', 7000]]) {
        const state = Investing.initial();
        Investing.trade(state, id, 'buy', 1);
        state.day = 29; state.prices.tech = stockPrice;
        days(state, 1);
        assert.equal(state.cash, 1250000);
        assert.equal(state.realized, 250000);
        assert.equal(state.holdings.tech.qty, 0);
    }
    const state = Investing.initial();
    Investing.trade(state, 'call', 'buy', 1);
    state.day = 29; state.prices.tech = 10300;
    days(state, 1);
    assert.equal(state.realized, -20000, 'Being in the money does not guarantee net profit');
});

test('cash dividends reduce the quoted share price rather than creating free total return', () => {
    const state = Investing.initial();
    Investing.trade(state, 'utility', 'buy', 1);
    state.day = 89; state.expiry = 90;
    days(state, 1);
    assert.equal(state.income, 50);
    assert.equal(state.prices.utility, 4950);
    assert.equal(Investing.equity(state), 1000000);
});

test('different market sessions move prices in both directions and round-trip saved holdings', () => {
    const state = Investing.initial();
    Investing.trade(state, 'tech', 'buy', 1);
    Investing.advance(state, () => .9);
    const higher = state.prices.tech;
    assert.ok(higher > 10000);
    Investing.advance(state, () => .1);
    assert.ok(state.prices.tech < higher);
    const loaded = JSON.parse(JSON.stringify(state));
    assert.ok(Investing.valid(loaded));
    assert.deepEqual(loaded, state);
});

test('timeline or arithmetic errors do not partially advance a portfolio', () => {
    const state = Investing.initial();
    const original = JSON.stringify(state);
    assert.ok(Investing.advance(state, () => NaN).error);
    assert.equal(JSON.stringify(state), original);
    state.day = 1000000;
    assert.ok(Investing.advance(state).error);
    assert.equal(state.day, 1000000);
});
