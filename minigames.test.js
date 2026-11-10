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
    const module = ['lemonade', 'subshop', 'carryout'].includes(name) ? 'food' : ['resale', 'courier'].includes(name) ? 'street' : name;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, `mg-${module}.js`), 'utf8'), {
        Math: math,
        Minigames: { register(key, fn) { if (key === name) factory = fn; } }
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

function tapGame(h, x, y, cancelled = false) {
    const p = { id: 1, x, y, sx: x, sy: y, len: 0, cancelled };
    h.game.down(p); h.game.up(p);
}

function advance(h, seconds) {
    for (let t = 0; t < seconds && !h.result; t += 1 / 60) h.step(1 / 60);
}

test('baseball accepts timed hits and home runs, ignores canceled taps and finishes only once', () => {
    for (const level of [1, 5, 1000000]) {
        const h = harness('baseball', 1, level);
        tapGame(h, 180, 512, true);
        assert.equal(h.game._state().phase, 'pitch');
        for (let i = 0; i < 10; i++) {
            const s = h.game._state();
            h.step(s.flight - s.clock + (i % 2 ? s.window * .6 : 0));
            tapGame(h, 180, 512);
            const hit = h.game._state().hits;
            tapGame(h, 180, 512);
            assert.equal(h.game._state().hits, hit, 'repeated swings cannot score twice');
            advance(h, 1.3);
        }
        assert.equal(h.result.win, true);
        assert.equal(h.game._state().hits, 10);
        assert.equal(h.game._state().homers, 5);
        assert.equal(h.result.stars, 0, 'campaign controls rewards');
        h.game.update(10);
        assert.equal(h.awards, 1);
    }
});

test('baseball early swings, late swings and missed pitches consume attempts without hits', () => {
    for (const mode of ['early', 'late', 'wait']) {
        const h = harness('baseball');
        for (let i = 0; i < 10; i++) {
            const s = h.game._state();
            if (mode === 'early') tapGame(h, 180, 512);
            else if (mode === 'late') {
                h.step(s.flight + s.window + .05 - s.clock);
                tapGame(h, 180, 512);
            } else h.step(s.flight + s.window + .3 - s.clock);
            advance(h, 1.3);
        }
        assert.equal(h.result.win, false, mode);
        assert.equal(h.game._state().hits, 0);
        assert.equal(h.awards, 1);
    }
});
test('air hockey has a slower fallible CPU, larger target and guarded touch controls at every level', () => {
    for (const level of [1, 5, 1000000]) {
        const h = harness('airhockey', 1, level), s = h.game._state();
        assert.ok(s.cpuSpeed < 200);
        assert.ok(s.maxSpeed < 560);
        assert.ok(s.goalWidth >= s.playerGoalWidth * 1.7);
        const p = { id: 1, x: 290, y: 440 };
        h.game.down(p); h.step(.033);
        assert.ok(h.game._state().pm.x > 180);
        p.cancelled = true; h.game.up(p);
        assert.equal(h.game._state().holdId, null);
        h.game._set({ puck: { x: 70, y: 380, vx: 0, vy: 150 } });
        const before = h.game._state().pm.x;
        advance(h, .2);
        assert.ok(h.game._state().pm.x < before, 'Released mallet automatically guards toward the puck');
        advance(h, .6);
        const player = h.game._state().pm;
        h.game._set({ puck: { x: player.x, y: player.y - 36, vx: 0, vy: 200 } });
        h.step(.016);
        const puck = h.game._state().puck;
        assert.ok(puck.vy < 0, 'Gentle stationary contact returns the puck');
        assert.ok(Math.hypot(puck.vx, puck.vy) <= s.maxSpeed);
    }
});

test('beginner air hockey can be won with ordinary drag input and scores only once', () => {
    const h = harness('airhockey'), p = { id: 1, x: 180, y: 440 };
    h.game.down(p);
    for (let frame = 0; frame < 180 * 60 && !h.result; frame++) {
        const s = h.game._state();
        const direction = s.om.x > 180 ? -1 : 1;
        p.x = s.puck.x - direction * 22;
        p.y = s.puck.y > 300 ? s.puck.y + 35 : 454;
        h.game.move(p); h.step();
    }
    assert.ok(h.result, 'Match finishes with a simple touch strategy');
    assert.equal(h.result.win, true);
    assert.equal(h.awards, 1);
    assert.equal(h.result.stars, 0);
    h.game.update(.1);
    assert.equal(h.awards, 1);
});

test('air hockey resolves fast puck crossings without tunneling through a guarding mallet', () => {
    const h = harness('airhockey');
    advance(h, .7);
    const { pm } = h.game._state();
    h.game._set({ puck: { x: pm.x, y: pm.y - 47, vx: 0, vy: 550 } });
    h.step(.033);
    assert.ok(h.game._state().puck.vy < 0);
    assert.equal(h.game._state().cpu, 0);
});

test('lemonade recipes, canceled pours, restocking and profit goals work at beginner and extreme levels', () => {
    for (const level of [1, 5, 1000000]) {
        const h = harness('lemonade', 1, level);
        tapGame(h, 180, 420, true);
        assert.equal(h.game._state().stock, 6);
        tapGame(h, 180, 420); tapGame(h, 180, 420);
        const canceled = { id: 2, x: 180, y: 420, len: 0 };
        h.game.down(canceled); advance(h, .5); canceled.cancelled = true; h.game.up(canceled);
        assert.equal(h.game._state().stage, 2);
        assert.equal(h.game._state().fill, 0);
        const bad = { id: 3, x: 180, y: 420, len: 0 };
        h.game.down(bad); h.game.up(bad);
        assert.equal(h.game._state().stage, 0);
        assert.equal(h.game._state().revenue, 0);
        while (!h.result) {
            let s = h.game._state();
            if (!s.stock) {
                const cash = s.cash;
                tapGame(h, 80, 505);
                assert.equal(h.game._state().cash, cash - 6);
                assert.equal(h.game._state().stock, 5);
            }
            tapGame(h, 180, 420); tapGame(h, 180, 420);
            const p = { id: 4, x: 180, y: 420, len: 0 };
            h.game.down(p); advance(h, 1); h.game.up(p);
            assert.equal(h.game._state().stage, 3);
            while (!h.game._state().customer && !h.result) h.step();
            tapGame(h, 260, 505);
            s = h.game._state();
            assert.equal(s.cash, 20 + s.revenue - s.expenses);
        }
        assert.equal(h.result.win, true, `Lemonade level ${level} achievable`);
        assert.equal(h.result.stars, 0);
        const s = h.game._state();
        assert.ok(s.sold >= s.target && s.revenue - s.expenses >= s.profitGoal);
        assert.equal(h.awards, 1);
    }
});

test('sub shop requires the exact ticket, supports removing extras, resets abandoned tickets and wins at high levels', () => {
    for (const level of [1, 5, 1000000]) {
        const h = harness('subshop', 3, level);
        const ingredient = i => tapGame(h, 45 + (i % 4) * 86, 350 + Math.floor(i / 4) * 64);
        const before = h.game._state();
        tapGame(h, 260, 505);
        assert.equal(h.game._state().mistakes, 1);
        assert.equal(h.game._state().patience, before.patience - 2);
        assert.equal(h.game._state().served, 0);
        advance(h, before.limit);
        assert.equal(h.game._state().lost, 1);
        tapGame(h, 45, 350, true);
        assert.equal(h.game._state().selected.length, 0);
        while (!h.result) {
            const s = h.game._state();
            s.order.forEach(ingredient);
            const extra = Array.from({ length: 8 }, (_, i) => i).find(i => !s.order.includes(i));
            ingredient(extra); ingredient(extra);
            assert.equal(h.game._state().selected.length, s.order.length);
            tapGame(h, 260, 505);
            if (!h.result) advance(h, .75);
        }
        assert.equal(h.result.win, true);
        assert.equal(h.result.stars, 0);
        assert.equal(h.awards, 1);
    }
});

test('carryout handles early lifts, burns, wrong sauces and correct high-level orders', () => {
    for (const level of [1, 5, 1000000]) {
        const h = harness('carryout', 2, level);
        tapGame(h, 180, 350, true);
        assert.equal(h.game._state().stage, 0);
        tapGame(h, 180, 350); tapGame(h, 180, 350);
        assert.equal(h.game._state().stage, 0, 'Early batch discarded');
        tapGame(h, 180, 350); advance(h, 4);
        assert.equal(h.game._state().burnt, 1);
        while (!h.result) {
            tapGame(h, 180, 350);
            advance(h, .65 / h.game._state().cookRate);
            tapGame(h, 180, 350);
            assert.equal(h.game._state().stage, 2);
            const s = h.game._state(), wrong = (s.wanted + 1) % 3;
            tapGame(h, 60 + wrong * 110, 425); tapGame(h, 180, 505);
            assert.equal(h.game._state().served, s.served);
            assert.equal(h.game._state().patience, s.patience - 2);
            tapGame(h, 60 + s.wanted * 110, 425); tapGame(h, 180, 505);
            if (!h.result) advance(h, .75);
        }
        assert.equal(h.result.win, true);
        assert.equal(h.result.stars, 0);
        assert.equal(h.awards, 1);
    }
});

test('resale tickets really differ, inspect tabs work and correct or wrong decisions settle once', () => {
    for (const level of [1, 1000000]) {
        for (const correct of [true, false]) {
            const h = harness('resale', 7, level);
            tapGame(h, 60, 500, true);
            assert.equal(h.game._state().round, 0);
            while (!h.result) {
                const s = h.game._state();
                for (let i = 0; i < 3; i++) {
                    tapGame(h, 60 + i * 114, 350);
                    assert.equal(h.game._state().tab, i);
                }
                assert.equal(s.ticket.reference.every((v, i) => v === s.ticket.actual[i]), s.ticket.genuine);
                const buy = correct ? s.ticket.genuine : !s.ticket.genuine;
                tapGame(h, buy ? 80 : 260, 500);
                if (!h.result) advance(h, 1.35);
            }
            assert.equal(h.result.win, correct);
            assert.equal(h.result.stars, 0);
            assert.equal(h.awards, 1);
            assert.equal(h.game._state().correct, correct ? h.game._state().total : 0);
        }
    }
});

test('courier steering, canceled drags, deliveries and three-bump losses work at low and high levels', () => {
    for (const level of [1, 1000000]) {
        for (const safe of [true, false]) {
            const h = harness('courier', 5, level);
            const p = { id: 2, x: 80, y: 300, len: 0 };
            h.game.down(p);
            assert.equal(h.game._state().lane, 0);
            p.x = 280; h.game.move(p);
            assert.equal(h.game._state().lane, 2);
            p.cancelled = true; h.game.up(p);
            assert.equal(h.game._state().lane, 1);
            for (let f = 0; f < 65 * 60 && !h.result; f++) {
                const row = h.game._state().rows.find(r => !r.done);
                if (row && !row.delivery) {
                    assert.notEqual(row.parcel, row.blocked);
                    tapGame(h, [80, 180, 280][safe ? row.parcel : row.blocked], 300);
                }
                h.step();
            }
            assert.ok(h.result);
            assert.equal(h.result.win, safe);
            assert.equal(h.result.stars, 0);
            assert.equal(h.awards, 1);
            if (safe) assert.ok(h.game._state().delivered >= h.game._state().target);
            else assert.equal(h.game._state().lives, 0);
        }
    }
});

test('all five new arcades time out without passive rewards and stop accepting input', () => {
    for (const name of ['lemonade', 'subshop', 'carryout', 'resale', 'courier']) {
        const h = harness(name);
        advance(h, 90);
        assert.ok(h.result, name);
        assert.equal(h.result.win, false, name);
        assert.equal(h.result.stars, 0, name);
        tapGame(h, 180, 505);
        advance(h, 1);
        assert.equal(h.awards, 1, name);
    }
});

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

test('all games initialize and render early and very high campaign levels', () => {
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

test('tennis manual positioning lets nearby balls return automatically through a full match', () => {
    const h = harness('tennis', 23, 5);
    let returned = false, previousLast = null;
    const pointer = { id: 1, x: 180, y: 480 };
    h.game.down(pointer);
    for (let frame = 0; frame < 60 * 600 && !h.result; frame++) {
        const before = h.game._state();
        if (before.ball && before.ball.last === 'o') {
            pointer.x = 180 + U.clamp(before.ball.u + before.ball.vu * .12, -1.15, 1.15) * 146.9;
            h.game.move(pointer);
        }
        h.step();
        const s = h.game._state();
        if (previousLast === 'o' && s.ball && s.ball.last === 'p' && s.rally > 0) returned = true;
        previousLast = s.ball && s.ball.last;
    }
    assert.ok(h.result);
    assert.ok(returned);
});

for (const dt of [1 / 60, .033]) {
    test(`tennis never chases the ball without movement input at dt=${dt}`, () => {
        for (const seed of [1, 23, 99]) {
            const h = harness('tennis', seed);
            let moved = false;
            for (let frame = 0; frame < 600 / dt && !h.result; frame++) {
                h.step(dt);
                const s = h.game._state();
                if (Math.abs(s.pu) > .05) moved = true;
            }
            assert.equal(moved, false, 'player must position themselves');
            assert.ok(h.result, 'misses still finish the match without input');
            const s = h.game._state();
            assert.equal(Math.max(s.me, s.cpu), 5);
            assert.equal(h.awards, 1);
        }
    });
}

    test('tennis taps/drags choose position; cancel stops movement and auto hits require reach', () => {
        const h = harness('tennis');
        const p = { id: 1, x: 310, y: 480 };
        h.game.down(p);
        for (let i = 0; i < 10; i++) h.step();
        assert.ok(h.game._state().pu > .3);
        h.game.up({ ...p, cancelled: true });
        const stopped = h.game._state().pu;
        for (let i = 0; i < 50; i++) h.step();
        assert.equal(h.game._state().pu, stopped);
        const ball = h.game._state().ball;
        Object.assign(ball, { u: -.8, v: .32, h: .15, vu: 0, vv: -.5, vh: .2, last: 'o', bounces: 1 });
        h.step();
        assert.equal(ball.last, 'o', 'distant balls cannot auto hit');
        h.game._set({ pu: -.8 });
        h.step();
        assert.equal(ball.last, 'p', 'correct positioning triggers assisted hit');
    });

    test('tennis CPU pace, corner placement, reaction and footwork scale through levels 1-50', () => {
        let prev;
        for (const level of [1, 5, 10, 25, 50, 1000000]) {
            const h = harness('tennis', 23, level), d = h.game._state().difficulty;
            if (prev) {
                assert.ok(d.returnTime < prev.returnTime);
                assert.ok(d.placement > prev.placement);
                assert.ok(d.cpuSpeed > prev.cpuSpeed);
                assert.ok(d.reactionTime < prev.reactionTime);
                assert.ok(d.errorChance < prev.errorChance);
            }
            assert.ok(d.returnTime >= .72 && d.playerSpeed === 2.6);
            prev = d;
        }
        const easy = harness('tennis', 23, 1), hard = harness('tennis', 23, 50);
        for (const h of [easy, hard]) {
            for (let i = 0; i < 26; i++) h.step();
            Object.assign(h.game._state().ball, { u: 0, v: .85, h: .2, vu: 0, vv: .5, vh: .1, last: 'p', bounces: 1 });
            h.game._set({ pu: .7 });
            for (let i = 0; i < 30 && h.game._state().ball.last === 'p'; i++) h.step();
            assert.equal(h.game._state().ball.last, 'o');
            assert.ok(h.game._state().ball.vu < 0, 'CPU attacks open side');
        }
        assert.ok(Math.abs(hard.game._state().ball.vu) > Math.abs(easy.game._state().ball.vu));
    });

    test('soccer deadlines shrink, keepers patrol faster and timed-out kicks cannot be recovered', () => {
        let previous;
        for (const level of [1, 5, 10, 25, 50, 1000000]) {
            const h = harness('soccer', 1, level), s = h.game._state(), d = s.difficulty;
            if (previous) {
                assert.ok(d.shotLimit < previous.shotLimit);
                assert.ok(d.keeperSpeed > previous.keeperSpeed);
                assert.ok(d.reactionTime < previous.reactionTime);
            }
            assert.ok(d.shotLimit >= 2.8);
            const before = s.keeper.x;
            h.step(.1);
            assert.notEqual(s.keeper.x, before, 'goalkeeper moves before shot');
            assert.ok(Math.abs(s.keeper.x - before) <= d.keeperSpeed * .1 + 1e-8);
            previous = d;
        }
        const h = harness('soccer', 1, 50);
        const aim = { id: 1, sx: 180, sy: 470, x: 180, y: 370, len: 100, dx: 0, dy: -100, vx: 0, vy: -500, path: [] };
        h.game.down(aim);
        for (let i = 0; i < 400 && !h.game._state().ball; i++) h.step();
        assert.equal(h.game._state().ball.outcome, 'timeout');
        h.game.up(aim);
        assert.equal(h.game._state().ball.outcome, 'timeout');
        for (let i = 0; i < 4000 && !h.result; i++) h.step();
        assert.ok(h.result);
        assert.equal(h.result.win, false);
        assert.equal(h.game._state().goals, 0);
        assert.equal(h.game._state().log.length, 6);
        assert.equal(h.awards, 1);
    });

test('soccer leaves an achievable open corner at beginner and test level 50', () => {
    for (const level of [1, 50]) {
        const h = harness('soccer', 9, level);
        for (let shot = 0; shot < 6; shot++) {
            let s = h.game._state();
            for (let i = 0; i < 180 && !s.finished && s.ball; i++) {
                h.step(); s = h.game._state();
            }
            if (s.finished) break;
            // Wait for the patrol to expose the opposite corner, then swipe there.
            for (let i = 0; i < 180 && Math.abs(s.keeper.x) < .5; i++) h.step();
            assert.equal(s.ball, null);
            const x = s.keeper.x > 0 ? -.86 : .86;
            h.game._shoot({ tgt: x, height: .83, curl: Math.sign(x) * .65, T: .68 });
            for (let i = 0; i < 90; i++) h.step();
        }
        advance(h, 3);
        assert.ok(h.result, `level ${level} match finishes`);
        assert.equal(h.result.win, true, `level ${level} rewards aiming away from a moving keeper`);
    }
});

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
