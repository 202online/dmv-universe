'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Home = require('./home-life.js');
const fs = require('node:fs');

test('new homes include only closet and quests; old saves get a free SE apartment without losing data', () => {
    const state = Home.initial();
    assert.ok(Home.valid(state));
    assert.equal(state.quadrant, null);
    assert.deepEqual(state.unlocked, []);
    assert.equal(Home.hasParking(state), false);
    assert.deepEqual(Home.restore(undefined), Home.initial('SE', 'The Crib (Apartment)'));
    for (const quadrant of ['NW','NE','SE','SW']) {
        const home = Home.initial(quadrant, `${quadrant} apartment`);
        assert.deepEqual(Home.restore(JSON.parse(JSON.stringify(home))), home);
    }
    for (const bad of [null, {}, { ...state, quadrant: 'NW' }, { ...state, parkingUntil: -1 },
        { ...state, unlocked: ['unknown'] }, { ...state, completedTasks: [2] }]) {
        assert.equal(Home.valid(bad), false);
        assert.throws(() => Home.restore(bad), /Invalid home/);
    }
});

test('unset home and parking prices never grant features or spend stars', () => {
    const state = Home.initial('NW', 'Apartment'), before = JSON.stringify(state);
    for (const id of [...Object.keys(Home.features), 'week', 'month']) {
        assert.throws(() => Home.purchase(state, id, 1000), /price not set/);
        assert.equal(JSON.stringify(state), before);
    }
    assert.equal(Home.passPrice('week'), null);
    assert.equal(Home.passPrice('month'), null);
    assert.deepEqual(Home.quests, [], 'No invented quests or rewards before definitions are supplied');
});

test('parking passes last seven or thirty real days, renew from expiry and cost 60 percent more monthly', () => {
    const state = Home.initial('NW', 'Apartment'), now = 100000;
    const previous = Home.parking.weeklyPrice;
    Home.parking.weeklyPrice = 50;
    try {
        assert.equal(Home.passPrice('week'), 50);
        assert.equal(Home.passPrice('month'), 80);
        assert.equal(Home.purchase(state, 'week', 100, now), 50);
        assert.equal(state.parkingUntil, now + 7 * 86400000);
        assert.equal(Home.hasParking(state, state.parkingUntil - 1), true);
        assert.equal(Home.hasParking(state, state.parkingUntil), false);
        assert.equal(Home.purchase(state, 'month', 100, now), 20);
        assert.equal(state.parkingUntil, now + 37 * 86400000);
        const before = state.parkingUntil;
        assert.throws(() => Home.purchase(state, 'week', 0, now), /more stars/);
        assert.equal(state.parkingUntil, before);
    } finally { Home.parking.weeklyPrice = previous; }
});

test('configured feature purchases persist and cannot be purchased twice', () => {
    const state = Home.initial('NW', 'Apartment'), previous = Home.features.computer.price;
    Home.features.computer.price = 150;
    try {
        assert.throws(() => Home.purchase(state, 'computer', 149), /1 more stars/);
        assert.equal(Home.purchase(state, 'computer', 160), 10);
        assert.ok(Home.restore(state).unlocked.includes('computer'));
        assert.throws(() => Home.purchase(state, 'computer', 160), /already own/);
    } finally { Home.features.computer.price = previous; }
});

test('quest tasks check off once, persist, complete a quest and unlock upcoming quests', () => {
    const definitions = [
        { id: 'first', title: 'First quest', tasks: [{ id: 'a', title: 'First task' }, { id: 'b', title: 'Second task' }] },
        { id: 'next', title: 'Next quest', requires: ['first'], tasks: [{ id: 'c', title: 'Third task' }] }
    ];
    const state = Home.initial();
    assert.equal(Home.questStatus(definitions[0], state, definitions), 'ongoing');
    assert.equal(Home.questStatus(definitions[1], state, definitions), 'upcoming');
    assert.equal(Home.completeTask(state, 'c', definitions), false);
    assert.equal(Home.completeTask(state, 'a', definitions), true);
    assert.equal(Home.completeTask(state, 'a', definitions), false);
    assert.equal(Home.questStatus(definitions[0], state, definitions), 'ongoing');
    Home.completeTask(state, 'b', definitions);
    const restored = Home.restore(JSON.parse(JSON.stringify(state)));
    assert.equal(Home.questStatus(definitions[0], restored, definitions), 'completed');
    assert.equal(Home.questStatus(definitions[1], restored, definitions), 'ongoing');
    assert.throws(() => Home.completeTask(state, 'missing', definitions), /Unknown quest task/);
});

test('onboarding chooses a home after creation and library computer bypasses home purchase gating', () => {
    const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
    assert.match(html, /else \{ openHomeSelection\(\); return; \}/);
    assert.match(html, /homeLife = HomeLife.initial\(quadrant, residence.name\)/);
    assert.match(html, /location !== 'library' && !homeLife.unlocked.includes\('computer'\)/);
    assert.match(html, /if \(!shop && !HomeLife.hasParking\(homeLife\)\)/);
    assert.match(html, /homeLife,\s*\n/);
});
