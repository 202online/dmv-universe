'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Campaign = require('./mg-progression.js');
const TODAY = Date.parse('2026-11-09T12:00:00Z');

test('all games begin at level one and locked levels cannot pay or unlock', () => {
    const state = Campaign.initial();
    assert.ok(Campaign.valid(state));
    for (const name of Campaign.games) {
        assert.equal(Campaign.info(state, name, TODAY).unlocked, 1);
        assert.throws(() => Campaign.settle(state, name, 2, true, TODAY), /locked/);
        assert.throws(() => Campaign.settle(state, name, 0, true, TODAY), /locked/);
    }
    assert.throws(() => Campaign.info(state, 'unknown', TODAY), /Unknown/);
    assert.deepEqual(state, Campaign.initial());
});

test('first clears pay exactly once, increase rewards and unlock only the next level', () => {
    const state = Campaign.initial();
    for (let level = 1; level <= 5; level++) {
        const clear = Campaign.settle(state, 'soccer', level, true, TODAY);
        assert.equal(clear.stars, Campaign.rewards[level - 1]);
        assert.equal(clear.unlocked, level < 5);
        assert.equal(Campaign.info(state, 'soccer', TODAY).unlocked, Math.min(5, level + 1));
        assert.ok(Campaign.settle(state, 'soccer', level, true, TODAY).stars <= 1);
        assert.equal(state.cleared.soccer, level);
    }
    assert.equal(state.cleared.tennis, 0);
    assert.ok(Campaign.valid(state));
});

test('losses and draws never earn currency, unlock levels or use replay allowance', () => {
    const state = Campaign.initial();
    for (const name of Campaign.games) {
        assert.equal(Campaign.settle(state, name, 1, false, TODAY).stars, 0);
    }
    assert.deepEqual(state, Campaign.initial());
    Campaign.settle(state, 'tennis', 1, true, TODAY);
    assert.equal(Campaign.settle(state, 'tennis', 1, false, TODAY).stars, 0);
    assert.equal(state.replay.paid, 0);
});

test('replays share one daily cap across all games, survive reload and reset on a later UTC day', () => {
    let state = Campaign.initial();
    for (const name of Campaign.games) Campaign.settle(state, name, 1, true, TODAY);
    assert.equal(Campaign.settle(state, 'tennis', 1, true, TODAY).stars, 1);
    assert.equal(Campaign.settle(state, 'soccer', 1, true, TODAY).stars, 1);
    state = JSON.parse(JSON.stringify(state));
    assert.ok(Campaign.valid(state));
    assert.equal(Campaign.settle(state, 'chess', 1, true, TODAY).stars, 1);
    for (const name of Campaign.games) {
        assert.equal(Campaign.settle(state, name, 1, true, TODAY).stars, 0);
    }
    assert.equal(Campaign.info(state, 'tennis', TODAY).remaining, 0);
    assert.equal(Campaign.settle(state, 'tennis', 1, true, TODAY - 86400000).stars, 0);
    assert.equal(Campaign.settle(state, 'tennis', 2, true, TODAY).stars, 5, 'first clears are not capped');
    assert.equal(Campaign.settle(state, 'tennis', 1, true, TODAY + 86400000).stars, 1);
    assert.equal(Campaign.info(state, 'tennis', TODAY + 86400000).remaining, 2);
});

test('finite campaign payouts total 36 per game and 360 across all games', () => {
    const state = Campaign.initial();
    let total = 0;
    for (const name of Campaign.games) {
        let earned = 0;
        for (let level = 1; level <= 5; level++) earned += Campaign.settle(state, name, level, true, TODAY).stars;
        assert.equal(earned, 36);
        total += earned;
    }
    assert.equal(total, 360);
});

test('invalid saved progression is rejected', () => {
    for (const value of [null, {}, { cleared: {}, replay: {} }]) assert.equal(Campaign.valid(value), false);
    for (const n of [-1, 6, 1.5, '2', null]) {
        const state = Campaign.initial();
        state.cleared.tennis = n;
        assert.equal(Campaign.valid(state), false);
    }
    for (const replay of [{ day: '', paid: 1 }, { day: '2026-02-31', paid: 0 },
        { day: 'bad-date', paid: 0 }, { day: '2026-11-09', paid: 4 }]) {
        const state = Campaign.initial();
        state.replay = replay;
        assert.equal(Campaign.valid(state), false);
    }
});
