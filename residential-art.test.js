'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Art = require('./residential-art.js');

test('nine residential silhouettes reserve bounded driveways or apartment parking without changing lots', () => {
    const forms = new Set();
    for (const kind of ['house', 'apartment', 'condo']) for (const variant of [0, 1, 2]) {
        const b = { x: 100, y: 200, w: 80, d: 60, h: 125, kind, variant };
        const plan = Art.plan(b);
        forms.add(JSON.stringify(plan.parts.map(p => [p.x, p.y, p.w, p.d, p.z, p.h, p.roof])));
        for (const p of [...plan.parts, plan.parking]) {
            assert.ok(p.x >= b.x && p.y >= b.y);
            assert.ok(p.x + p.w <= b.x + b.w + 1e-8);
            assert.ok(p.y + p.d <= b.y + b.d + 1e-8);
        }
        for (const p of plan.parts)
            assert.ok(!(p.x < plan.parking.x + plan.parking.w && p.x + p.w > plan.parking.x &&
                p.y < plan.parking.y + plan.parking.d && p.y + p.d > plan.parking.y), 'Structure leaves parking clear');
    }
    assert.equal(forms.size, 9);
});

test('roofs, balconies, driveways, garages and apartment spaces draw within each property boundary', () => {
    for (const [w, d] of [[80, 60], [140, 100], [160, 90], [170, 130]]) {
        const b = { x: 100, y: 200, w, d, h: 125, color: '#976b53', trim: '#e3ceb0' };
        let planes = 0;
        const env = {
            ctx: new Proxy({}, { get: (target, key) => key in target ? target[key] : (...args) => {
                args.filter(a => typeof a === 'number').forEach(n => assert.ok(Number.isFinite(n)));
            } }),
            P(x, y, z = 0) {
                assert.ok(Number.isFinite(z) && z >= 0);
                assert.ok(x >= b.x - 1e-8 && x <= b.x + w + 1e-8, `x ${x}`);
                assert.ok(y >= b.y - 1e-8 && y <= b.y + d + 1e-8, `y ${y}`);
                return [x - y, (x + y) / 2 - z];
            },
            poly() { planes++; }, box(x, y, z, ww, dd, h, color) {
                assert.match(color, /^#[0-9a-f]{6}$/i, 'Box shading receives a hex color, not an already-shaded rgb value');
                env.P(x, y, z); env.P(x + ww, y + dd, z + h);
            }, shade: color => color
        };
        for (const kind of ['house', 'apartment', 'condo']) for (const variant of [0, 1, 2])
            Art.draw({ ...b, kind, variant }, env, true, 1);
        assert.ok(planes > 300);
    }
});

test('property notices are supported 3D boards with lettering projected onto their faces', () => {
    for (const kind of ['house', 'apartment', 'condo']) for (const variant of [0, 1, 2]) {
        const text = [], transforms = [], supports = [];
        let projected = false;
        const env = {
            ctx: new Proxy({
                transform(...matrix) { transforms.push(matrix); projected = true; },
                fillText(title) {
                    assert.ok(projected, 'Sign lettering uses world projection, not a floating screen label');
                    text.push(title);
                },
                restore() { projected = false; }
            }, { get: (target, key) => key in target ? target[key] : () => {} }),
            P: (x, y, z = 0) => [x - y, (x + y) / 2 - z],
            poly() {}, box(x, y, z, w, d, h) { supports.push({ z, w, d, h }); }, shade: color => color
        };
        Art.draw({ x: 100, y: 200, w: 160, d: 90, h: 140, kind, variant, color: '#976b53', trim: '#e3ceb0' }, env);
        if (kind === 'house' && variant === 1) {
            assert.deepEqual(text, [], 'Occupied houses have parked cars instead of sale signs');
            continue;
        }
        assert.deepEqual(text, kind === 'house' ? ['FOR SALE', 'CHOCOLATE CITY'] : ['1-4 BEDROOMS', 'AVAILABLE']);
        assert.equal(transforms.length, 1);
        assert.deepEqual(transforms[0].slice(0, 4), [1, .5, 0, 1]);
        assert.ok(supports.some(p => p.z === 0 && p.w === 2 && p.d === 2 && p.h >= 43), 'Boards have ground-supported posts');
        assert.ok(supports.some(p => p.z > 0 && p.w >= 40 && p.d === 2 && p.h >= 20), 'Board has physical thickness');
    }
});
