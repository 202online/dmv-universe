'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { U } = require('./mg-core.js');

function harness(name, seed = 1, level = 1) {
    const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
    };
    const math = Object.create(Math);
    math.random = random;
    let factory, result, awards = 0, time = 0;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, `mg-${name}.js`), 'utf8'), {
        Math: math,
        Minigames: { register(key, fn) { assert.equal(key, name); factory = fn; } }
    });
    const utils = {
        ...U,
        rand: (a, b) => a + random() * (b - a),
        pick: list => list[Math.floor(random() * list.length)]
    };
    const noop = () => {};
    const game = factory({
        W: 360, H: 560, U: utils, level, difficulty: U.challenge(level) / 4, sfx: noop, buzz: noop, banner: noop,
        fx: { burst: noop, text: noop, flash: noop, shake: noop },
        end(value) { result = value; awards++; },
        time: () => time, running: () => !result
    });
    const context = new Proxy({}, {
        get(target, key) {
            if (key in target) return target[key];
            return (...args) => {
                for (const arg of args) {
                    if (typeof arg === 'number') assert.ok(Number.isFinite(arg), `${key}: ${arg}`);
                }
                if (key === 'createLinearGradient' || key === 'createRadialGradient') {
                    return { addColorStop: noop };
                }
            };
        }
    });
    if (game.init) game.init();
    game.draw(context);
    game.start();
    return {
        game, context,
        get result() { return result; },
        get awards() { return awards; },
        step(dt = 1 / 60) {
            time += dt;
            if (!result) game.update(dt);
            game.draw(context);
        }
    };
}

for (const outcome of ['goal', 'save', 'wall', 'post', 'bar', 'over', 'wide']) {
    test(`soccer renders ${outcome} immediately and completes all six kicks`, () => {
        const h = harness('soccer');
        for (let kick = 1; kick <= 6; kick++) {
            const state = h.game._state();
            assert.equal(state.kick, kick);
            const shots = {
                goal: [.8, .8], save: [0, .1], wall: [state.x0, .04],
                post: [1, .8], bar: [0, 1], over: [0, 1.3], wide: [1.4, .8]
            };
            const [tgt, height] = shots[outcome];
            h.game._shoot({ tgt, height, T: .7, curl: 0 });
            state.wall.x = outcome === 'wall' ? state.x0 : 4;
            state.keeper.state = 'fixed';
            state.keeper.x = outcome === 'save' ? 0 : -2;
            for (let frame = 0; frame < 60 && !h.game._state().ball.outcome; frame++) h.step();
            assert.equal(h.game._state().ball.outcome, outcome);
            assert.equal(h.game._state().ball.t, 0);
            const x = h.game._state().ball.x, y = h.game._state().ball.y;
            h.game.draw(h.context);
            assert.equal(h.game._state().ball.x, x);
            assert.equal(h.game._state().ball.y, y);
            for (let frame = 0; frame < 110; frame++) h.step();
        }
        assert.ok(h.result);
        assert.equal(h.awards, 1);
        assert.equal(h.game._state().goals, outcome === 'goal' ? 6 : 0);
    });
}

test('all ten games initialize and render early and very high campaign levels', () => {
    const Progression = require('./mg-progression.js');
    for (const name of Progression.games) {
        for (const level of [1, 2, 3, 4, 5, 6, 25, 100, 1000, 1000000]) {
            const h = harness(name, 1, level);
            assert.equal(typeof h.game.goal, 'string', `${name} clear goal`);
            assert.doesNotMatch(h.game.goal, /NaN|undefined|Infinity/);
            if (name === 'basketball') assert.ok(h.game._state().time >= 29);
            if (name === 'pool') assert.ok(h.game._state().shots >= 8);
            for (let frame = 0; frame < 60; frame++) h.step();
        }
    }
});

test('difficulty continues after five with diminishing growth and safe limits', () => {
    assert.equal(U.challenge(1), 0);
    assert.equal(U.challenge(5), 4);
    for (const level of [6, 10, 25, 50, 100, 200, 1000, 1000000]) {
        assert.ok(U.challenge(level) > U.challenge(level - 1));
        assert.ok(U.challenge(level) < 8);
    }
    assert.ok(U.challenge(100) - U.challenge(99) < U.challenge(6) - U.challenge(5));
    assert.ok(Number.isFinite(U.challenge(1000000)));
});

test('level targets and opponent pressure increase rather than only the label', () => {
    const easyPool = harness('pool', 1, 1), hardPool = harness('pool', 1, 5);
    assert.ok(easyPool.game._state().shots > hardPool.game._state().shots);
    const easySoccer = harness('soccer', 1, 1), hardSoccer = harness('soccer', 1, 5);
    assert.ok(easySoccer.game._state().wall.n < hardSoccer.game._state().wall.n);
    assert.ok(easySoccer.game._state().keeper.read < hardSoccer.game._state().keeper.read);
    assert.notEqual(easySoccer.game.goal, hardSoccer.game.goal);
    const easyBasket = harness('basketball', 1, 1), hardBasket = harness('basketball', 1, 5);
    assert.ok(easyBasket.game._state().time > hardBasket.game._state().time);
    assert.ok(easyBasket.game._state().level < hardBasket.game._state().level);
    assert.notEqual(easyBasket.game.goal, hardBasket.game.goal);
    assert.notEqual(harness('golf', 1, 1).game.goal, harness('golf', 1, 5).game.goal);
    assert.notEqual(harness('football', 1, 1).game.goal, harness('football', 1, 5).game.goal);
    const easyDrive = harness('drive', 1, 1), hardDrive = harness('drive', 1, 5);
    for (let frame = 0; frame < 60; frame++) { easyDrive.step(); hardDrive.step(); }
    assert.ok(easyDrive.game._state().dist < hardDrive.game._state().dist);
    assert.ok(harness('boxing', 1, 1).game._state().fhp < harness('boxing', 1, 5).game._state().fhp);
    assert.ok(harness('football', 1, 1).game._state().defs.length < harness('football', 1, 5).game._state().defs.length);
    const easyHockey = harness('airhockey', 1, 1), hardHockey = harness('airhockey', 1, 5);
    for (const h of [easyHockey, hardHockey]) {
        h.game._set({ puck: { x: 290, y: 180, vx: 0, vy: -100 } });
        h.step(.033);
    }
    assert.ok(easyHockey.game._state().om.x < hardHockey.game._state().om.x);
});

test('soccer level five requires five goals, not the beginner three', () => {
    for (const goals of [4, 5]) {
        const h = harness('soccer', 1, 5);
        for (let kick = 0; kick < 6; kick++) {
            const s = h.game._state();
            h.game._shoot({ tgt: kick < goals ? .8 : 1.4, height: .8, T: .7, curl: 0 });
            s.wall.x = 4;
            s.keeper.state = 'fixed'; s.keeper.x = -2;
            for (let frame = 0; frame < 160; frame++) h.step();
        }
        assert.ok(h.result);
        assert.equal(h.result.win, goals === 5);
    }
});

test('tennis level five still moves and returns automatically through a full match', () => {
    const h = harness('tennis', 23, 5);
    let returned = false, previousLast = null;
    for (let frame = 0; frame < 60 * 600 && !h.result; frame++) {
        h.step();
        const s = h.game._state();
        if (previousLast === 'o' && s.ball && s.ball.last === 'p' && s.rally > 0) returned = true;
        previousLast = s.ball && s.ball.last;
    }
    assert.ok(h.result);
    assert.ok(returned);
});

for (const dt of [1 / 60, .033]) {
    test(`tennis moves, serves, returns and completes without input at dt=${dt}`, () => {
        for (const seed of [1, 23, 99]) {
            const h = harness('tennis', seed);
            let moved = false, returned = false, previousLast = null;
            for (let frame = 0; frame < 600 / dt && !h.result; frame++) {
                h.step(dt);
                const s = h.game._state();
                if (Math.abs(s.pu) > .05) moved = true;
                if (previousLast === 'o' && s.ball && s.ball.last === 'p' && s.rally > 0) returned = true;
                previousLast = s.ball && s.ball.last;
            }
            assert.ok(moved, 'player follows incoming balls');
            assert.ok(returned, 'player returns CPU shots');
            assert.ok(h.result, 'hands-free match finishes');
            const s = h.game._state();
            assert.equal(Math.max(s.me, s.cpu), 5);
            assert.equal(h.awards, 1);
        }
    });
}

test('tennis queues optional swipe placement and ignores cancelled swipes', () => {
    const h = harness('tennis');
    const shot = { dx: -60, dy: -140, vx: -600, vy: -1400 };
    h.game.up(shot);
    for (let frame = 0; frame < 26; frame++) h.step();
    const b = h.game._state().ball;
    assert.ok(b);
    assert.ok(b.vu < 0, 'swipe aims automatic serve left');
    for (let frame = 0; frame < 30; frame++) h.step();
    Object.assign(b, { u: 0, v: .32, h: .15, vu: 0, vv: -.5, vh: .2, last: 'o', bounces: 1 });
    h.game._set({ pu: 0 });
    h.game.up({ ...shot, dx: 60 });
    for (let frame = 0; frame < 30 && b.last === 'o'; frame++) h.step();
    assert.equal(b.last, 'p');
    assert.ok(b.vu > 0, 'queued swipe aims automatic return right');

    const cancelled = harness('tennis');
    const untouched = harness('tennis');
    cancelled.game.up({ ...shot, cancelled: true });
    for (let frame = 0; frame < 26; frame++) { cancelled.step(); untouched.step(); }
    assert.equal(cancelled.game._state().ball.vu, untouched.game._state().ball.vu);
});
