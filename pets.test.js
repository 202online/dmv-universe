'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Pets = require('./pets.js');

test('all five pet types are available for testing at explicit nonzero adoption prices', () => {
    assert.equal(Pets.settings.adoptionOpen, true);
    assert.equal(Pets.settings.prices.fish, 5);
    assert.equal(Pets.settings.prices.turtle, 8);
    for (const species of ['fish', 'turtle', 'dog', 'cat', 'rabbit']) {
        const state = Pets.initial();
        const stars = Pets.adopt(state, species, 'Chocolate', 100, 1000);
        assert.equal(stars, 100 - Pets.settings.prices[species]);
        assert.ok(Pets.valid(state));
        assert.match(Pets.portrait(state.active === 'home' ? state.pet : state.companion), /<svg/);
        assert.equal(Pets.valid(JSON.parse(JSON.stringify(state))), true);
    }
});

test('home habitat and walking companion coexist, with invalid or unaffordable adoption charging nothing', () => {
    const s = Pets.initial(), before = JSON.stringify(s);
    assert.throws(() => Pets.adopt(s, 'fish', 'Goldie', 4), /5 stars/);
    assert.throws(() => Pets.adopt(s, 'fish', ' ', 100), /name/);
    assert.equal(JSON.stringify(s), before);
    let stars = Pets.adopt(s, 'fish', 'Goldie', 100, 1000);
    stars = Pets.adopt(s, 'cat', 'Metro', stars, 1000);
    assert.equal(stars, 83);
    assert.equal(s.pet.name, 'Goldie');
    assert.equal(s.companion.name, 'Metro');
    assert.throws(() => Pets.adopt(s, 'dog', 'Second', stars), /already/);
    Pets.rename(s, '<Metro>');
    assert.equal(s.companion.name, '<Metro>');
    assert.ok(Pets.valid(s));
});

test('care, training cooldown, rest, items and accessories preserve bounded persistent needs', () => {
    const s = Pets.initial();
    let stars = Pets.adopt(s, 'dog', 'Pocket', 100, 1000);
    stars = Pets.buy(s, 'collar', stars);
    assert.equal(stars, 83);
    assert.throws(() => Pets.buy(s, 'collar', stars), /already/);
    Pets.equip(s, 'collar');
    assert.match(Pets.portrait(s.companion), /68bac0/);
    stars = Pets.buy(s, 'treat', stars);
    assert.equal(s.treats, 1);
    Pets.care(s, 'treat', 20000);
    assert.equal(s.treats, 0);
    assert.throws(() => Pets.care(s, 'play', 21000), /moment/);
    let now = 40000;
    for (let i = 0; i < 12; i++) {
        Pets.care(s, 'rest', now); now += 11000;
        Pets.care(s, 'train', now); now += 11000;
    }
    assert.equal(s.companion.training, 120);
    assert.throws(() => Pets.care(s, 'train', now), /All four/);
    Pets.refresh(s, now + 365 * 86400000);
    assert.ok(s.companion.food >= 20 && s.companion.fun >= 20);
    assert.ok(Pets.valid(s));
});

test('habitat shop rejects collars for fish and supports enrichment without petting an aquatic animal', () => {
    const s = Pets.initial();
    let stars = Pets.adopt(s, 'turtle', 'Rock', 100, 1000);
    assert.throws(() => Pets.buy(s, 'collar', stars), /habitat/);
    stars = Pets.buy(s, 'plant', stars);
    Pets.equip(s, 'plant');
    assert.match(Pets.portrait(s.pet), /75b76c/);
    assert.match(Pets.care(s, 'pet', 20000), /quiet company/);
    assert.equal(stars, 90);
});

test('companions follow on foot, stop at collision boundaries and relocate at quadrant changes', () => {
    const target = { x: 100, y: 100, quadrant: 'NW' };
    let position = Pets.follow(null, target, () => false);
    assert.ok(Math.hypot(position.x - target.x, position.y - target.y) <= 35);
    position = Pets.follow({ x: 0, y: 100, quadrant: 'NW' }, target, () => false);
    assert.equal(position.x, 3);
    const stopped = Pets.follow({ x: 0, y: 100, quadrant: 'NW' }, target, (x, y) => x > 0);
    assert.equal(stopped.x, 0);
    const changed = Pets.follow(position, { ...target, quadrant: 'NE' }, () => false);
    assert.equal(changed.quadrant, 'NE');
    assert.equal(Pets.follow(null, target, () => true), null);
});

test('invalid pet saves, purchases and equips do not silently create inventory', () => {
    const s = Pets.initial();
    assert.throws(() => Pets.buy(s, 'treat', 100), /adopt/);
    Pets.adopt(s, 'fish', 'Fin', 100);
    assert.throws(() => Pets.equip(s, 'decor'), /Buy/);
    assert.throws(() => Pets.buy(s, 'decor', 0), /Not enough/);
    const loaded = JSON.parse(JSON.stringify(s));
    loaded.pet.food = Infinity;
    assert.equal(Pets.valid(loaded), false);
    loaded.pet.food = 20;
    loaded.owned.push('not-real');
    assert.equal(Pets.valid(loaded), false);
});
