'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const AvatarMotion = require('./avatar-motion.js');

const run = (state, moving, seconds, dt = 1 / 60, t0 = 0) => {
    const frames = [];
    for (let i = 0, t = t0; i < Math.round(seconds / dt); i++, t += dt) {
        AvatarMotion.step(state, moving, dt);
        frames.push(AvatarMotion.pose(state, t + dt));
    }
    return frames;
};

test('walking eases in and out without jumps between frames', () => {
    const state = AvatarMotion.create();
    const frames = [...run(state, false, .5), ...run(state, true, 1.2, 1 / 60, .5), ...run(state, false, 1.2, 1 / 60, 1.7)];
    for (let i = 1; i < frames.length; i++) {
        assert.ok(Math.abs(frames[i].bob - frames[i - 1].bob) < .45, `bob jump at frame ${i}`);
        assert.ok(Math.abs(frames[i].sw - frames[i - 1].sw) < 1, `stride jump at frame ${i}`);
    }
    const walking = frames[Math.round(1.6 * 60)];
    assert.ok(walking.walk > .99);
    const settled = frames.at(-1);
    assert.ok(settled.walk < .01 && Math.abs(settled.sw) < .05, 'legs settle after stopping');
});

test('idle breathing is subtle and stops while walking', () => {
    const idle = Array.from({ length: 300 }, (_, i) => AvatarMotion.pose({ phase: 0, walk: 0 }, i / 30).bob);
    assert.ok(Math.max(...idle) > .3 && Math.max(...idle) <= .35 && Math.min(...idle) >= -.35);
    assert.strictEqual(AvatarMotion.pose({ phase: 0, walk: 1 }, 1).bob, 0);
});

test('eyes blink briefly and irregularly', () => {
    const samples = Array.from({ length: 19000 }, (_, i) => AvatarMotion.blink(i / 1000));
    assert.ok(samples.every(v => v >= 0 && v <= 1));
    const starts = [];
    samples.forEach((v, i) => { if (v > 0 && !(samples[i - 1] > 0)) starts.push(i); });
    assert.ok(starts.length >= 4 && starts.length <= 7, `${starts.length} blinks in 19s`);
    const gaps = starts.slice(1).map((s, i) => s - starts[i]);
    assert.ok(new Set(gaps).size > 1, 'blink rhythm varies');
    const closed = samples.filter(v => v > 0).length / starts.length;
    assert.ok(closed <= AvatarMotion.BLINK_MS + 1);
    assert.ok(Math.max(...samples) > .95);
});

test('hair trails the step and drifts gently at rest', () => {
    const still = Array.from({ length: 200 }, (_, i) => AvatarMotion.hair({ t: i / 20 }));
    assert.ok(still.every(h => Math.abs(h.swayX) <= .3 && h.lift === 0 && h.bounce === 0));
    const walk = Array.from({ length: 63 }, (_, i) => AvatarMotion.hair({ t: 0, walk: 1, phase: i / 10 }));
    assert.ok(Math.max(...walk.map(h => h.swayX)) > .9 && Math.min(...walk.map(h => h.swayX)) < -.9);
    for (let i = 1; i < walk.length; i++) assert.ok(Math.abs(walk[i].swayX - walk[i - 1].swayX) < .2);
    assert.ok(AvatarMotion.hair({ walk: 1, phase: 1, fx: 1 }).swayX < AvatarMotion.hair({ walk: 1, phase: 1, fx: -1 }).swayX, 'hair trails behind the facing');
});

test('the player avatar uses eased motion, blinking and swaying hair', () => {
    const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
    assert.ok(html.includes('<script src="avatar-motion.js"></script>'));
    assert.ok(html.includes('AvatarMotion.step(player.motion, player.moving'));
    assert.ok(html.includes('m.bob, m.sw, player.fx, player.fy, m);'));
    assert.ok(html.includes('if (blink > .6)'));
    assert.ok(!/Math\.sin\(t \* 10\)\) \* 2 : 0/.test(html), 'no abrupt walk cut-off');
});
