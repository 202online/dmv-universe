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
    for (let level = 1; level <= 100; level++) {
        const clear = Campaign.settle(state, 'soccer', level, true, TODAY);
        assert.equal(clear.stars, Campaign.reward(level));
        assert.equal(clear.unlocked, true);
        assert.equal(Campaign.info(state, 'soccer', TODAY).unlocked, level + 1);
        assert.equal(Campaign.settle(state, 'soccer', level, true, TODAY).stars, 0);
        assert.equal(state.cleared.soccer, level);
    }
    assert.equal(state.cleared.tennis, 0);
    assert.ok(Campaign.valid(state));
});

test('losses and draws never earn currency or unlock levels', () => {
    const state = Campaign.initial();
    for (const name of Campaign.games) {
        assert.equal(Campaign.settle(state, name, 1, false, TODAY).stars, 0);
    }
    assert.deepEqual(state, Campaign.initial());
    Campaign.settle(state, 'tennis', 1, true, TODAY);
    assert.equal(Campaign.settle(state, 'tennis', 1, false, TODAY).stars, 0);
    assert.equal(state.cleared.tennis, 1);
});

test('cleared levels never pay again, including after reloads or on later days', () => {
    let state = Campaign.initial();
    for (const name of Campaign.games) Campaign.settle(state, name, 1, true, TODAY);
    const original = JSON.stringify(state);
    state = JSON.parse(JSON.stringify(state));
    assert.ok(Campaign.valid(state));
    for (const name of Campaign.games) {
        for (const day of [TODAY, TODAY + 86400000, TODAY + 30 * 86400000]) {
            assert.equal(Campaign.settle(state, name, 1, true, day).stars, 0);
        }
    }
    assert.equal(JSON.stringify(state), original);
    assert.equal(Campaign.settle(state, 'tennis', 2, true, TODAY).stars, 5);
});

test('legacy saves keep unlocks without requiring or using old replay counters', () => {
    const state = Campaign.initial();
    state.cleared.tennis = 3;
    state.replay = { day: '2026-11-09', paid: 0 };
    assert.ok(Campaign.valid(state));
    const loaded = JSON.parse(JSON.stringify(state));
    for (let level = 1; level <= 3; level++) {
        assert.equal(Campaign.settle(loaded, 'tennis', level, true).stars, 0);
    }
    assert.equal(Campaign.settle(loaded, 'tennis', 4, true).stars, 9);
    assert.deepEqual(loaded.replay, state.replay);
});

test('early levels pay 36 per game and later rewards stay capped at 12', () => {
    const state = Campaign.initial();
    let total = 0;
    for (const name of Campaign.games) {
        let earned = 0;
        for (let level = 1; level <= 5; level++) earned += Campaign.settle(state, name, level, true, TODAY).stars;
        assert.equal(earned, 36);
        total += earned;
        for (let level = 6; level <= 100; level++) {
            assert.equal(Campaign.settle(state, name, level, true).stars, 12);
            assert.equal(Campaign.settle(state, name, level, true).stars, 0);
        }
    }
    assert.equal(total, 36 * Campaign.games.length);
});

test('older ten-game saves gain new campaigns without changing prior clears or replay data', () => {
    const old = Campaign.initial();
    for (const name of ['lemonade', 'subshop', 'carryout', 'resale', 'courier', 'baseball']) delete old.cleared[name];
    old.cleared.tennis = 19;
    old.replay = { day: '2026-01-01', paid: 2 };
    assert.ok(Campaign.valid(old));
    const loaded = Campaign.restore(old);
    assert.equal(loaded.cleared.tennis, 19);
    assert.deepEqual(loaded.replay, old.replay);
    assert.ok(!Object.hasOwn(old.cleared, 'lemonade'), 'migration does not mutate old data');
    for (const name of ['lemonade', 'subshop', 'carryout', 'resale', 'courier', 'baseball']) {
        assert.equal(Campaign.info(loaded, name).unlocked, 1);
        assert.equal(Campaign.settle(loaded, name, 1, true).stars, 3);
        assert.equal(Campaign.settle(loaded, name, 1, true).stars, 0);
    }
    loaded.cleared.courier = -1;
    assert.ok(!Campaign.valid(loaded));
    assert.throws(() => Campaign.restore(loaded), /Invalid/);
});

test('fifteen-game saves add baseball while preserving every previous clear', () => {
    const old = Campaign.initial();
    delete old.cleared.baseball;
    old.cleared.carryout = 21;
    const loaded = Campaign.restore(old);
    assert.equal(loaded.cleared.carryout, 21);
    assert.equal(loaded.cleared.baseball, 0);
    assert.equal(Campaign.settle(loaded, 'baseball', 1, true).stars, 3);
    assert.equal(Campaign.settle(loaded, 'baseball', 1, true).stars, 0);
});
test('invalid saved progression is rejected', () => {
    for (const value of [null, {}, { cleared: {}, replay: {} }]) assert.equal(Campaign.valid(value), false);
    for (const n of [-1, Number.MAX_SAFE_INTEGER, Infinity, 1.5, '2', null]) {
        const state = Campaign.initial();
        state.cleared.tennis = n;
        assert.equal(Campaign.valid(state), false);
    }
});

test('old level-five campaigns resume at six and high-level saves retain exact unlocks', () => {
    const state = Campaign.initial();
    for (const cleared of [5, 1000, 1000000]) {
        state.cleared.tennis = cleared;
        const loaded = JSON.parse(JSON.stringify(state));
        assert.ok(Campaign.valid(loaded));
        assert.equal(Campaign.info(loaded, 'tennis').unlocked, cleared + 1);
        assert.equal(Campaign.settle(loaded, 'tennis', cleared, true).stars, 0);
        assert.equal(Campaign.settle(loaded, 'tennis', cleared + 1, true).stars, 12);
        assert.throws(() => Campaign.settle(loaded, 'tennis', cleared + 3, true), /locked/);
    }
});
