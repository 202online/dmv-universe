'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const book = require('./sportsbook.js');

test('betting education uses short indexed sections and a plain-language glossary', () => {
    assert.deepEqual(book.lessons.map(l => l.id), ['start', 'odds', 'chance', 'markets', 'tickets', 'money', 'rules']);
    for (const lesson of book.lessons) {
        assert.ok(lesson.title && lesson.summary);
        assert.ok(lesson.paragraphs.join(' ').split(/\s+/).length <= 150, `${lesson.id} stays bite-sized`);
    }
    const odds = book.lessons.find(l => l.id === 'odds').paragraphs.join(' ');
    assert.match(odds, /\+150/); assert.match(odds, /-200/); assert.match(odds, /25/);
    for (const term of ['Stake', 'Odds', 'Parlay / leg', 'Total return', 'Implied probability'])
        assert.ok(book.glossary.some(([word]) => word === term), term);
    assert.match(book.lessons.find(l => l.id === 'chance').paragraphs.join(' '), /Do not chase losses/);
});
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

test('stake input accepts cents and explicitly rejects invalid amounts', () => {
    for (const [value, expected] of [['1', 100], ['10', 1000], ['10.01', 1001], ['10000000', 1000000000]])
        assert.equal(book.parseStake(value), expected);
    for (const value of ['', ' ', '0', '-10', '1.001', 'no', 'Infinity', '10000000.01'])
        assert.equal(book.parseStake(value), null);
});

test('single and parlay previews distinguish profit, total return, risk and price-implied chance', () => {
    const single = book.quote(['basketball:homeML'], 1000);
    assert.equal(single.total, 2400);
    assert.equal(single.profit, 1400);
    assert.equal(single.loss, 1000);
    assert.equal(single.american, 140);
    assert.equal(single.implied, 100 / 2.4);
    const favorite = book.quote(['basketball:awayML'], 1000);
    assert.equal(favorite.american, -165);
    assert.equal(favorite.total, Math.round(1000 * (1 + 100 / 165)));
    const parlay = book.quote(['football:awayML', 'basketball:homeML'], 1000);
    assert.equal(parlay.total, Math.round(1000 * book.decimal(-115) * 2.4));
    assert.equal(parlay.profit, parlay.total - 1000);
    assert.ok(parlay.implied < single.implied);
    assert.throws(() => book.quote([], 1000), /invalid/);
});

test('placing debits exactly the confirmed stake and preserves independent single tickets', () => {
    const state = book.initial(), legs = ['football:awayML'];
    const result = book.place(state, legs, 1000);
    assert.deepEqual(result.ticket, { legs: ['football:awayML'], stake: 1000 });
    legs.push('basketball:awayML');
    assert.equal(state.pending[0].legs.length, 1, 'placed picks are a snapshot');
    book.place(state, ['basketball:homeML'], 2500);
    assert.equal(state.pending.length, 2);
    assert.equal(state.balance, 96500);
    assert.ok(book.valid(state));
});

test('invalid, unaffordable, conflicting and over-limit tickets report errors without spending', () => {
    const state = book.initial(), original = JSON.stringify(state);
    for (const [legs, stake] of [
        [[], 1000], [['bad'], 1000], [['football:homeML', 'football:awayML'], 1000],
        [['football:awayML'], null], [['football:awayML'], 100001]
    ]) {
        assert.ok(book.place(state, legs, stake).error);
        assert.equal(JSON.stringify(state), original);
    }
    state.pending = Array.from({ length: 100 }, () => ({ stake: 100, legs: ['football:homeML'] }));
    assert.match(book.place(state, ['football:awayML'], 100).error, /pending/);
    state.pending = [];
    state.balance = 1000000000;
    assert.match(book.place(state, ['basketball:homeML'], 1000).error, /limit/);
    assert.equal(state.balance, 1000000000);
});

test('each market teaches the winning condition and explains settlement with the actual numbers', () => {
    assert.match(book.requirement('football:awaySpread'), /win by more than 1.5/);
    assert.match(book.requirement('football:homeSpread'), /lose by fewer than 1.5/);
    assert.match(book.requirement('basketball:under'), /fewer than 222.5.*combined/);
    assert.match(book.requirement('football:propOver'), /more than 265.5 passing yards/);
    const result = { away: 24, home: 23, prop: 266 };
    assert.match(book.evidence('football:homeSpread', result), /23 \+ 1.5 = 24.5; opponent 24/);
    assert.match(book.evidence('football:over', result), /24 \+ 23 = 47; line 47.5/);
    assert.match(book.evidence('football:propUnder', result), /266 passing yards; line 265.5/);
    const state = book.initial();
    book.place(state, ['football:homeSpread'], 1000);
    book.settle(state, { football: result, basketball: { away: 100, home: 110, prop: 28 } });
    assert.match(state.history[0], /^WIN.*Adjusted score 23 \+ 1.5 = 24.5.*total return 19.09; net \+9.09/);
    assert.ok(book.valid(JSON.parse(JSON.stringify(state))));
});

test('all supported two-game settlement explanations fit persisted history limits', () => {
    const football = Object.keys(book.selections).filter(id => id.startsWith('football:'));
    const basketball = Object.keys(book.selections).filter(id => id.startsWith('basketball:'));
    for (const first of football) for (const second of basketball) {
        const state = book.initial();
        book.place(state, [first, second], 1000);
        book.settle(state, { football: { away: 24, home: 23, prop: 266 }, basketball: { away: 100, home: 110, prop: 27.5 } });
        assert.ok(book.valid(JSON.parse(JSON.stringify(state))), `${first}, ${second}`);
    }
});
