'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const book = require('./sportsbook.js');

test('odds, moneyline, spread, totals and player props', () => {
    assert.equal(book.decimal(140), 2.4);
    assert.equal(book.decimal(-110), 1 + 100 / 110);
    const r = { away: 24, home: 21, prop: 266 };
    for (const id of ['awayML', 'awaySpread', 'under', 'propOver']) assert.equal(book.outcome(`football:${id}`, r), 'win');
    for (const id of ['homeML', 'homeSpread', 'over', 'propUnder']) assert.equal(book.outcome(`football:${id}`, r), 'loss');
    assert.equal(book.outcome('football:awayML', { ...r, away: 21 }), 'push');
    assert.equal(book.outcome('basketball:propOver', { away: 100, home: 100, prop: 27.5 }), 'push');
});

test('settles singles and parlays including pushes exactly once', () => {
    const state = book.initial();
    state.balance = 96000;
    state.pending = [
        { stake: 1000, legs: ['football:awayML'] },
        { stake: 1000, legs: ['football:homeML'] },
        { stake: 1000, legs: ['football:propOver', 'basketball:propOver'] },
        { stake: 1000, legs: ['football:propUnder', 'basketball:propOver'] }
    ];
    const results = { football: { away: 24, home: 21, prop: 266 }, basketball: { away: 110, home: 100, prop: 27.5 } };
    book.settle(state, results);
    assert.equal(state.balance, 96000 + Math.round(1000 * book.decimal(-115)) * 2);
    assert.equal(state.pending.length, 0);
    assert.equal(state.history.length, 4);
    assert.equal(state.scores.length, 2);
    book.settle(state, results);
    assert.equal(state.history.length, 4);
    assert.ok(book.valid(state));
});

test('all push refunds stake and invalid saved tickets are rejected', () => {
    const state = book.initial();
    state.balance -= 1000;
    state.pending.push({ stake: 1000, legs: ['football:awayML', 'basketball:propOver'] });
    book.settle(state, { football: { away: 21, home: 21, prop: 0 }, basketball: { away: 100, home: 100, prop: 27.5 } });
    assert.equal(state.balance, 100000);
    assert.match(state.history[0], /^PUSH/);
    state.pending.push({ stake: 1000, legs: ['football:awayML', 'football:homeML'] });
    assert.equal(book.valid(state), false);
    state.pending = [{ stake: 1000, legs: ['invalid'] }];
    assert.equal(book.valid(state), false);
});
