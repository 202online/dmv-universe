'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Art = require('./residential-art.js');
const Layout = require('./city-layout.js');

test('nine residential silhouettes reserve bounded driveways or apartment parking without changing lots', () => {
    const forms = new Set();
    for (const kind of ['house', 'apartment', 'condo']) for (const variant of [0, 1, 2]) {
        const b = { x: 100, y: 200, w: 80, d: 60, h: 125, kind, variant };
        const plan = Art.plan(b);
        forms.add(JSON.stringify(plan.parts.map(p => [p.x, p.y, p.w, p.d, p.z, p.h, p.roof])));
        for (const p of [...plan.parts, plan.parking, ...(plan.garden ? [plan.garden] : [])]) {
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
    for (const [w, d] of [[80, 60], [140, 100], [160, 110], [170, 130]]) {
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
        for (const kind of ['house', 'apartment', 'condo'].filter(kind => kind !== 'apartment' || w >= 160)) for (const variant of [0, 1, 2]) {
            const before = planes;
            Art.draw({ ...b, kind, variant }, env, true, 1);
            assert.ok(planes > before, `${kind} variant ${variant} renders visible geometry`);
        }
    }
});

test('apartment parking has four full-size spaces, an aisle and a separate animated waterfall garden', () => {
    for (const [w, d] of [[160, 110], [170, 130]]) for (const variant of [0, 1, 2]) {
        const b = { x: 100, y: 200, w, d, h: 150, kind: 'apartment', variant, color: '#976b53', trim: '#e3ceb0' };
        const { parking: p, garden: g, parts } = Art.plan(b);
        assert.equal(p.spaces, 4);
        assert.ok(p.w / p.spaces >= 19, 'Marked bays fit the detailed parked cars');
        assert.ok(p.d * .34 >= 14, 'The clear access aisle fits the widest parked car');
        assert.ok(g.x + g.w <= p.x && g.y >= b.y + b.d / 2, 'Front garden stays outside parking bays');
        assert.ok(parts.every(part => part.y + part.d <= g.y), 'Waterfall garden is outside apartment walls');
        const frames = [];
        for (const time of [0, .5]) {
            const drops = [];
            Art.draw(b, {
                ctx: new Proxy({}, { get: (target, key) => key in target ? target[key] : () => {} }),
                P: (x, y, z = 0) => [x - y, (x + y) / 2 - z],
                poly(points, color) { if (color === '#c5f2eb') drops.push(points); },
                box() {}, shade: color => color
            }, false, time);
            assert.equal(drops.length, 4);
            frames.push(drops);
        }
        assert.notDeepEqual(frames[0], frames[1], 'Waterfall streams animate');
    }
});

test('listing text exactly follows visible sale and availability boards, including style-based buildings', () => {
    for (const kind of ['house', 'apartment', 'condo']) for (const variant of [0, 1, 2])
        for (const available of [undefined, false, true]) {
            const b = { x: 0, y: 0, w: 160, d: 110, h: 140, kind, variant, available };
            const expected = kind === 'house' ? (variant !== 1 ? 'FOR SALE' : null) :
                (available ?? variant === 0) ? 'AVAILABLE' : null;
            assert.equal(Art.listing(b), expected);
            assert.equal(Art.plan(b).listed, expected !== null);
            const boards = [];
            Art.draw({ ...b, color: '#976b53', trim: '#e3ceb0' }, {
                ctx: new Proxy({ fillText(text) { if (text !== 'P') boards.push(text); } },
                    { get: (target, key) => key in target ? target[key] : () => {} }),
                P: (x, y, z = 0) => [x - y, (x + y) / 2 - z],
                poly() {}, box() {}, shade: color => color
            });
            assert.equal(boards.length > 0, expected !== null);
            if (expected) assert.ok(boards.some(text => text.includes(expected)));
        }
    assert.equal(Art.listing({ style: 'apartment' }), null, 'The starter apartment uses its rendered occupied variant');
    assert.equal(Art.listing({ style: 'apartment', available: true }), 'AVAILABLE');
    assert.equal(Art.listing({ style: 'garage', garage: true }), null);
    assert.equal(Art.listing({ kind: 'shop' }), null);
});

test('rear garages have roll-up doors and a physical PARK HERE board fixed to their side wall', () => {
    const b = { x: 100, y: 200, w: 170, d: 70, h: 55, color: '#746c65', trim: '#bb9c84' };
    const text = [], transforms = [], panels = [], solids = [];
    const env = {
        ctx: new Proxy({
            transform(...matrix) { transforms.push(matrix); },
            fillText(title) { text.push(title); }
        }, { get: (target, key) => key in target ? target[key] : () => {} }),
        P(x, y, z = 0) {
            assert.ok(x >= b.x && x <= b.x + b.w);
            assert.ok(y >= b.y && y <= b.y + b.d);
            assert.ok(Number.isFinite(z) && z >= 0);
            return [x - y, (x + y) / 2 - z];
        },
        box(x, y, z, w, d, h, color) {
            assert.match(color, /^#[0-9a-f]{6}$/i);
            env.P(x, y, z); env.P(x + w, y + d, z + h);
            solids.push({ x, y, z, w, d, h });
        },
        poly(points, color) { panels.push({ points, color }); }
    };
    Art.drawGarage(b, env, true, 1);
    assert.deepEqual(text, ['PARK HERE', 'GARAGE']);
    assert.deepEqual(transforms[0].slice(0, 4), [1, -.5, 0, 1]);
    assert.equal(panels.filter(p => p.color === '#425965').length, 3);
    const sign = solids.find(s => s.w === 2);
    assert.equal(sign.x + sign.w, b.x + b.w, 'Board is fixed to the garage side wall');
    assert.ok(sign.z > 0 && sign.z + sign.h <= b.h, 'Board remains below the garage roof');
});

test('property notices are supported 3D boards with lettering projected onto their faces', () => {
    for (const kind of ['house', 'apartment', 'condo']) for (const variant of [0, 1, 2]) {
        const text = [], transforms = [], supports = [];
        let projected = false;
        const env = {
            ctx: new Proxy({
                transform(...matrix) { transforms.push(matrix); projected = true; },
                fillText(title) {
                    if (title === 'P') return;
                    assert.ok(projected, 'Sign lettering uses world projection, not a floating screen label');
                    text.push(title);
                },
                restore() { projected = false; }
            }, { get: (target, key) => key in target ? target[key] : () => {} }),
            P: (x, y, z = 0) => [x - y, (x + y) / 2 - z],
            poly() {}, box(x, y, z, w, d, h) { supports.push({ z, w, d, h }); }, shade: color => color
        };
        Art.draw({ x: 100, y: 200, w: 160, d: 90, h: 140, kind, variant, color: '#976b53', trim: '#e3ceb0' }, env);
        if (kind === 'house' && variant === 1 || kind !== 'house' && variant !== 0) {
            assert.deepEqual(text, [], 'Occupied homes have no availability signs');
            continue;
        }
        assert.deepEqual(text, kind === 'house' ? ['FOR SALE', 'CHOCOLATE CITY'] :
            kind === 'apartment' ? ['1-4 BEDROOMS', 'AVAILABLE'] : ['AVAILABLE CONDOS', 'INQUIRE WITHIN']);
        assert.equal(transforms.length, 1);
        assert.deepEqual(transforms[0].slice(0, 4), [1, .5, 0, 1]);
        assert.ok(supports.some(p => p.z === 0 && p.w === 2 && p.d === 2 && p.h >= 43), 'Boards have ground-supported posts');
        assert.ok(supports.some(p => p.z > 0 && p.w >= 20 && p.d === 2 && p.h >= 20), 'Board has physical thickness');
    }
});

test('driveways have a visible setback from walls and roofs for every house and condo design', () => {
    for (const kind of ['house', 'condo']) for (const variant of [0, 1, 2]) {
        const { parts, parking } = Art.plan({ x: 100, y: 200, w: 80, d: 60, h: 125, kind, variant });
        for (const part of parts) assert.ok(parking.x - part.x - part.w >= 6,
            `${kind} ${variant}: driveway is separated from building geometry`);
        assert.ok(parking.w >= 14, 'Driveway fits a shared-size sedan facing the street');
    }
});

test('availability can be explicitly set without changing residential silhouettes', () => {
    for (const kind of ['apartment', 'condo']) {
        const b = { x: 100, y: 200, w: 160, d: 110, h: 140, kind };
        assert.equal(Art.plan({ ...b, variant: 0 }).available, true);
        assert.equal(Art.plan({ ...b, variant: 1 }).available, false);
        assert.equal(Art.plan({ ...b, variant: 0, available: false }).available, false);
        assert.equal(Art.plan({ ...b, variant: 2, available: true }).available, true);
    }
});

test('rowhome condos reserve front parking bays below their shared wall and balconies', () => {
    for (const variant of [0, 1, 2]) {
        const b = { x: 100, y: 200, w: 140, d: 100, h: 120, kind: 'condo', terrace: true, variant };
        const { parts, parking, terrace } = Art.plan(b);
        assert.ok(terrace);
        assert.equal(parts[0].x, b.x);
        assert.equal(parts[0].w, b.w, 'Full-width walls can join the next rowhome');
        assert.ok(parts.every(p => p.y + p.d + b.d * .08 < parking.y));
        assert.equal(parking.spaces, 2);
        assert.ok(parking.w / parking.spaces >= 14);
        assert.ok(parking.d >= 30);
    }
});

test('decorative cars fit their own spaces and never occupy a player bay or the entrance path', () => {
    for (const kind of ['house', 'condo', 'apartment']) for (const variant of [0, 1, 2]) {
        const plan = Art.plan({ x: 100, y: 200, w: kind === 'house' ? 80 : 160,
            d: kind === 'house' ? 60 : 110, h: 140, kind, variant });
        const reserved = plan.bays.slice(0, kind === 'apartment' ? 2 : undefined);
        for (const car of plan.decorativeCars) {
            const corners = Layout.vehicleCorners(car.x + car.w / 2, car.y + car.d / 2, car.heading, car);
            assert.ok(Layout.contains(plan.parking, corners, 1));
            for (const region of [...reserved, plan.path])
                assert.equal(Layout.polygonsOverlap(corners, Layout.footprint(region).corners), false);
        }
    }
});
