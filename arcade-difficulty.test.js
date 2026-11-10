'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { U } = require('./mg-core.js');

const LEVELS = [1, 5, 10, 25, 50];
const GAMES = ['basketball', 'football', 'drive', 'golf', 'boxing', 'pool', 'airhockey',
    'chess', 'lemonade', 'subshop', 'carryout', 'resale', 'courier', 'baseball'];

function harness(name, level = 1, seed = 7) {
    const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
    };
    const math = Object.create(Math);
    math.random = random;
    let factory, result, clock = 0;
    const module = ['lemonade', 'subshop', 'carryout'].includes(name) ? 'food' :
        ['resale', 'courier'].includes(name) ? 'street' : name;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, `mg-${module}.js`), 'utf8'), {
        Math: math, Minigames: { register(key, fn) { if (key === name) factory = fn; } }
    });
    const noop = () => {};
    const game = factory({
        W: 360, H: 560, level,
        U: { ...U, rand: (a, b) => a + random() * (b - a), pick: a => a[Math.floor(random() * a.length)] },
        sfx: noop, buzz: noop, banner: noop,
        fx: { burst: noop, text: noop, flash: noop, shake: noop },
        time: () => clock, running: () => !result, end: value => { result = value; }
    });
    const context = new Proxy({}, {
        get: (target, key) => key in target ? target[key] : (...args) => {
            for (const arg of args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg), `${name}: ${key}`);
            if (key === 'createLinearGradient' || key === 'createRadialGradient') return { addColorStop: noop };
        }
    });
    game.start();
    return {
        game, context, get result() { return result; },
        step(dt = 1 / 60) { clock += dt; if (!result) game.update(dt); },
        advance(seconds) {
            for (let t = 0; t < seconds && !result; t += 1 / 120) {
                const dt = Math.min(1 / 120, seconds - t);
                clock += dt; game.update(dt);
            }
        }
    };
}

function tap(h, x, y) {
    const p = { id: 1, x, y, sx: x, sy: y, len: 0, dur: .1, dx: 0, dy: 0 };
    h.game.down(p); h.game.up(p);
}

function monotonic(name, field, direction) {
    const values = LEVELS.map(level => harness(name, level).game._state()[field]);
    for (let i = 1; i < values.length; i++) {
        assert.ok((values[i] - values[i - 1]) * direction > 0,
            `${name}.${field} must progress at L${LEVELS[i - 1]} → L${LEVELS[i]}: ${values}`);
    }
}

test('all owned arcades change actual skill pressure at levels 1, 5, 10, 25 and 50', () => {
    const fields = {
        basketball: { rimRadius: -1, hoopSpeed: 1, powerWindow: -1 },
        football: { pursuit: 1, spinDuration: -1, spinCooldown: 1 },
        drive: { roadPace: 1, bossCadence: 1, copPursuit: 1 },
        golf: { cupRadius: -1, cupSpeed: -1, windmillPace: 1 },
        boxing: { dazeWindow: -1 },
        pool: { pocketRadius: -1, guideLength: -1 },
        airhockey: { cpuSpeed: 1, reactionTime: -1, aimError: -1, opponentRadius: 1, goalWidth: -1 },
        chess: { noise: -1, searchWidth: 1 },
        lemonade: { sweetSpot: -1, waitLimit: -1 },
        subshop: { limit: -1 },
        carryout: { window: -1, cookRate: 1, limit: -1 },
        resale: { inspectLimit: -1, codeDigits: 1 },
        courier: { speed: 1, gap: -1 },
        baseball: { flight: -1, window: -1 }
    };
    for (const [name, settings] of Object.entries(fields)) {
        for (const [field, direction] of Object.entries(settings)) monotonic(name, field, direction);
    }
    for (const level of LEVELS) {
        const p = U.pressure(level);
        assert.equal(harness('baseball', level).game._state().window, .2 - p * .115);
        assert.equal(harness('drive', level).game._state().roadPace, 1 + p * .8);
        assert.equal(harness('boxing', level).game._state().foe.tel, .9 * (1 - p * .5));
        assert.equal(harness('chess', level).game._state().searchDepth, level === 1 ? 1 : level >= 25 ? 3 : 2);
    }
});

test('baseball has a narrower real contact window and varying advanced pitch speeds', () => {
    for (const level of LEVELS) {
        const h = harness('baseball', level), s = h.game._state();
        h.step(s.flight - s.clock + .17);
        tap(h, 180, 512);
        assert.equal(h.game._state().hits, .17 <= s.window ? 1 : 0);
        h.advance(1.21);
        const second = h.game._state();
        assert.equal(second.pitch, 2);
        if (level > 1) assert.ok(second.flight < s.flight, 'Pitch cadence is not identical each time');
    }
});

test('perfect baseball timing remains winnable even at extreme levels', () => {
    for (const level of [...LEVELS, 1e9, Number.MAX_SAFE_INTEGER]) {
        const h = harness('baseball', level);
        for (let i = 0; i < 10; i++) {
            const s = h.game._state();
            h.step(s.flight - s.clock);
            tap(h, 180, 512);
            h.advance(1.21);
        }
        assert.equal(h.result.win, true, `level ${level}`);
        assert.equal(h.game._state().homers, 10);
    }
});

test('basketball requires more precise predicted placement and power but perfect shots still score', () => {
    for (const level of LEVELS) {
        const h = harness('basketball', level), p = U.pressure(level);
        const power = 150, flight = .85 + (power - 90) / 160 * .15;
        const targetX = level === 1 ? 180 : 180 + (55 + p * 50) * Math.sin(flight * (1.15 + p * 2.4));
        const shot = { id: 1, dx: (targetX - 180) * power / 260, dy: -power, cancelled: false };
        h.game.down(shot); h.game.up(shot); h.step(flight + .001);
        assert.equal(h.game._state().baskets, 1, `perfect shot L${level}`);
        assert.equal(h.game._state().ball.kind, 'swish');
        const imperfect = harness('basketball', level, 500);
        const stronger = 180, arrive = .85 + (stronger - 90) / 160 * .15;
        const hoop = level === 1 ? 180 : 180 + (55 + p * 50) * Math.sin(arrive * (1.15 + p * 2.4));
        const overpowered = { dx: (hoop - 180) * stronger / 260, dy: -stronger };
        imperfect.game.down(overpowered); imperfect.game.up(overpowered); imperfect.step(arrive + .001);
        assert.equal(imperfect.game._state().baskets, .2 < imperfect.game._state().powerWindow ? 1 : 0);
    }
});

test('football defenders pursue faster on the field, not just in configuration', () => {
    const positions = LEVELS.map(level => {
        const h = harness('football', level);
        h.game._set({ defs: [{ k: 'line', w: 38, x: 80, y: 30, juked: false, flash: 0 }] });
        h.step(1.2); h.step(.1);
        return h.game._state().defs[0].x;
    });
    for (let i = 1; i < positions.length; i++) assert.ok(positions[i] > positions[i - 1]);
});

test('convoy road travel and boss attack intervals scale without removing braking', () => {
    for (const level of LEVELS) {
        const h = harness('drive', level), state = h.game._state();
        h.step(.1);
        assert.ok(Math.abs(h.game._state().dist - 147 * state.roadPace * .1) < 1e-8);
        const brake = { id: 1, x: 300, y: 520 };
        h.game.down(brake);
        const before = h.game._state().dist;
        h.step(.1);
        assert.ok(Math.abs(h.game._state().dist - before - 147 * state.roadPace * .035) < 1e-8);
        h.game.up(brake);
        h.game._set({ count: 999, tier: 3, dist: 1e5 });
        h.step(.001);
        assert.equal(h.game._state().mode, 'boss');
        assert.ok(h.game._state().boss.max >= 85);
    }
});

test('golf narrows actual capture tolerance; centered soft putts remain possible', () => {
    const offsets = LEVELS.map(level => {
        const h = harness('golf', level);
        h.game._set({ ball: { x: 189.5, y: 140, vx: 0, vy: 0, moving: true } });
        h.step(.001);
        const sunk = h.game._state().sunk;
        h.game.start();
        h.game._set({ ball: { x: 180, y: 140, vx: 0, vy: 0, moving: true } });
        h.step(.001);
        assert.equal(h.game._state().sunk, true);
        return sunk;
    });
    assert.equal(offsets[0], true);
    assert.equal(offsets.at(-1), false);
});

test('boxing telegraphs, rest and punish windows shrink while a correct dodge still dazes', () => {
    let previous;
    for (const level of [...LEVELS, 1e9]) {
        const h = harness('boxing', level), s = h.game._state();
        if (previous) { assert.ok(s.foe.tel < previous.tel); assert.ok(s.foe.rest < previous.rest); }
        previous = s.foe;
        h.step(s.stT + .001);
        const windup = h.game._state();
        assert.equal(windup.state, 'windup');
        h.advance(Math.max(0, windup.stT - .15));
        h.game.up({ dx: -windup.side * 80, dy: 0, dur: .2, len: 80 });
        h.advance(.16);
        assert.equal(h.game._state().state, 'daze', `correct dodge L${level}`);
        assert.equal(h.game._state().hp, 100);
        assert.ok(h.game._state().daze > 1);
    }
});

test('pool pockets reject wider misses but preserve physically reachable corner pots at extreme level', () => {
    for (const level of [...LEVELS, 1e9]) {
        const h = harness('pool', level), s = h.game._state();
        const ball = s.balls.find(b => !b.cue);
        Object.assign(ball, { x: 66.5, y: 285, vx: 0, vy: 0 });
        h.step(.001);
        assert.equal(ball.dead, 14.5 < s.pocketRadius);
        h.game.start();
        const cornerBall = h.game._state().balls.find(b => !b.cue);
        Object.assign(cornerBall, { x: 61, y: 113, vx: 0, vy: 0 });
        h.step(.001);
        assert.equal(cornerBall.dead, true, `corner pot remains possible L${level}`);
    }
});

test('advanced air hockey actually reacts and covers quicker but retains beginner assists', () => {
    const distances = LEVELS.map(level => {
        const h = harness('airhockey', level);
        h.game._set({ puck: { x: 280, y: 240, vx: 0, vy: -100 } });
        h.advance(.1);
        const s = h.game._state();
        assert.ok(s.goalWidth > s.playerGoalWidth * 1.7);
        assert.ok(s.maxSpeed < 560 && s.cpuSpeed < 200);
        return Math.hypot(s.om.x - 180, s.om.y - 146);
    });
    for (let i = 1; i < distances.length; i++) assert.ok(distances[i] > distances[i - 1]);
});

test('chess makes deterministic legal replies with bounded increasing search', () => {
    for (const level of [...LEVELS, 1e9]) {
        const a = harness('chess', level), b = harness('chess', level);
        for (const h of [a, b]) {
            assert.equal(h.game._move(52, 36), true);
            h.step(2);
            const s = h.game._state();
            assert.equal(s.turn, 'w');
            assert.equal(s.moveN, 2);
            assert.ok(s.bd.includes('wK') && s.bd.includes('bK'));
            assert.ok(s.searchWidth <= 12 && s.searchDepth <= 3);
        }
        assert.deepEqual(Array.from(a.game._state().bd), Array.from(b.game._state().bd));
    }
});

test('lemonade and carryout tighter windows reject beginner timing errors, yet precise recipes work', () => {
    for (const level of LEVELS) {
        const h = harness('lemonade', level);
        tap(h, 180, 420); tap(h, 180, 420);
        const p = { id: 2, x: 180, y: 420 };
        h.game.down(p); h.advance((.7 + .18) / .7); h.game.up(p);
        assert.equal(h.game._state().stage === 3, .18 <= h.game._state().sweetSpot);
        const fresh = harness('lemonade', level);
        tap(fresh, 180, 420); tap(fresh, 180, 420);
        const pour = { id: 2, x: 180, y: 420 };
        fresh.game.down(pour); fresh.advance(1); fresh.game.up(pour);
        assert.equal(fresh.game._state().stage, 3);
        const c = harness('carryout', level);
        tap(c, 180, 350); c.advance(.65 / c.game._state().cookRate); tap(c, 180, 350);
        assert.equal(c.game._state().stage, 2);
    }
});

test('sub shop has more ingredients and less decision time but exact orders still serve at L50', () => {
    const beginner = harness('subshop', 1).game._state();
    const h = harness('subshop', 50), high = h.game._state();
    assert.ok(high.order.length > beginner.order.length);
    assert.ok(high.limit < beginner.limit * .6);
    for (const i of high.order) tap(h, 45 + i % 4 * 86, 350 + Math.floor(i / 4) * 64);
    tap(h, 260, 505);
    assert.equal(h.game._state().served, 1);
});

test('resale inspections expire per item at higher levels, and timely correct decisions still count', () => {
    for (const level of LEVELS) {
        const h = harness('resale', level), s = h.game._state();
        h.advance(s.inspectLimit + .01);
        assert.equal(h.game._state().round, 1);
        assert.equal(h.game._state().correct, 0);
        assert.equal(h.game._state().profit, 0, 'An expired inspection never automatically buys an item');
        h.advance(1.31);
        const next = h.game._state();
        tap(h, next.ticket.genuine ? 60 : 260, 505);
        assert.equal(h.game._state().correct, 1);
    }
});

test('courier travel speed and row arrival spacing visibly increase', () => {
    let previous;
    for (const level of LEVELS) {
        const h = harness('courier', level);
        h.advance(.5);
        const s = h.game._state(), row = s.rows[0];
        assert.ok(row);
        if (previous) { assert.ok(row.y > previous.y); assert.ok(s.gap < previous.gap); }
        previous = { y: row.y, gap: s.gap };
        assert.ok((s.speed * s.gap) / s.speed >= 1);
    }
});

test('all owned games render finite safe states at extreme campaign levels', () => {
    for (const level of [1, 50, 1e9, Number.MAX_SAFE_INTEGER]) for (const name of GAMES) {
        const h = harness(name, level);
        h.game.draw(h.context);
        h.advance(.05);
        h.game.draw(h.context);
        const state = h.game._state();
        for (const [key, value] of Object.entries(state)) {
            if (typeof value === 'number') assert.ok(Number.isFinite(value), `${name}.${key} L${level}`);
        }
        if (name === 'golf') assert.ok(state.cupSpeed >= 150 && state.cupRadius >= 7);
        if (name === 'pool') assert.ok(state.pocketRadius > Math.SQRT2 * 9);
        if (name === 'baseball') assert.ok(state.window >= .085 && state.flight > .7);
        if (name === 'boxing') assert.ok(state.foe.tel >= .45 && state.dazeWindow >= 1.55);
    }
});
