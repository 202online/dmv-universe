'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const CityLayout = require('./city-layout.js');
const ResidentialArt = require('./residential-art.js');
const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
const source = html.split('// ---------- World data ----------')[1].split('// ---------- State & input ----------')[0];
const context = { WORLD: 1000, CityLayout };
vm.runInNewContext(`${source}\nglobalThis.city = quadrants;`, context);
const world = (e, s) => [(s + e) / 2, (s - e) / 2];
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.d && a.y + a.d > b.y;

test('baseball has a standalone SW outdoor diamond with a connected street approach', () => {
    const q = context.city.SW;
    const diamond = q.activities.find(a => a.type === 'baseball');
    assert.ok(diamond);
    assert.equal(diamond.w, 240);
    assert.equal(diamond.d, 220);
    assert.ok(q.roadAccess.some(access => access.building === diamond));
    assert.ok(!q.solids.some(s => overlaps(diamond, { x: s.x0, y: s.y0, w: s.x1 - s.x0, d: s.y1 - s.y0 })));
});

test('every outdoor sport renders its equipment and a defined map sign', () => {
    const canvas = new Proxy({}, { get: (target, key) => key in target ? target[key] : (...args) => {
        args.filter(a => typeof a === 'number').forEach(n => assert.ok(Number.isFinite(n)));
        if (key === 'measureText') {
            assert.equal(typeof args[0], 'string', 'Every activity has a sign label');
            return { width: args[0].length * 7 };
        }
    } });
    const env = { ctx: canvas, P: (x, y, z = 0) => [x - y, (x + y) / 2 - z], poly() {}, activeBuilding: null };
    const draw = html.slice(html.indexOf('function drawActivityEquipment('), html.indexOf('// ---------- Rendering: objects ----------'));
    vm.runInNewContext(`${draw}\nglobalThis.equipment = drawActivityEquipment;`, env);
    for (const q of Object.values(context.city))
        for (const activity of q.activities.filter(a => a.type !== 'boxing')) env.equipment(activity);
});
test('apartments and condos have broad, multi-family footprints proportional to the main apartment', () => {
    const homes = Object.values(context.city).flatMap(q => q.neighborhood.buildings).filter(b => b.type === 'crib');
    const house = homes.find(b => b.kind === 'house');
    const mainApartment = context.city.SE.buildings.find(b => b.style === 'apartment');
    for (const b of homes.filter(b => ['apartment', 'condo'].includes(b.kind))) {
        assert.ok(b.w * b.d >= house.w * house.d * 2.5, 'Multi-family lots are substantially larger than a house');
        assert.ok(b.w >= mainApartment.w * .8, 'Width is comparable to the existing main apartment');
        assert.ok(b.h / b.w <= 1.1, 'Residential blocks do not become thin towers');
    }
});
test('apartment garages attach flush to the rear wall, never a separate front or side outbuilding', () => {
    for (const q of Object.values(context.city)) for (const garage of q.buildings.filter(b => b.garage)) {
        const apartment = q.buildings.find(b => b.style === 'apartment');
        assert.ok(apartment);
        assert.equal(garage.x, apartment.x);
        assert.equal(garage.w, apartment.w);
        assert.equal(garage.y + garage.d, apartment.y, 'Rear garage shares the apartment wall without a gap');
        const rearWall = ResidentialArt.plan({ ...apartment, variant: 1 }).parts.find(p => p.z === 0);
        assert.equal(garage.x, rearWall.x);
        assert.equal(garage.w, rearWall.w);
        assert.equal(garage.y + garage.d, rearWall.y, 'Rendered structures touch, not just their collision lots');
        assert.ok(garage.h < apartment.h);
    }
    assert.match(html, /if \(b\.garage\) ResidentialArt\.drawGarage/);
});
for (const [id, q] of Object.entries(context.city)) {
    test(`${id} has a distinct residential district, bounded properties and unobstructed streets to every destination`, () => {
        const objects = CityLayout.targets(q);
        assert.ok(q.neighborhood.buildings.filter(b => b.type === 'crib').length >= 5);
        assert.ok(q.districts.length >= 2);
        assert.equal(q.roadAccess.length, objects.length);
        for (const street of q.neighborhood.streets) {
            for (const b of [...objects, ...(q.parkingLot ? [q.parkingLot] : [])])
                assert.equal(CityLayout.intersects(street, b), false, `Full street surface clears ${b.name || b.kind}`);
        }
        const walkable = (x, y) => !q.solids.some(s => x + 9 > s.x0 && x - 9 < s.x1 && y + 9 > s.y0 && y - 9 < s.y1);
        for (const p of [[0, 20], [0, 1980], [-980, 1000], [980, 1000]])
            assert.ok(walkable(...world(...p)), 'Quadrant crossings stay open');
        for (const [i, b] of objects.entries()) {
            assert.ok(b.x + b.w - b.y <= -120 || b.x - b.y - b.d >= 120,
                `${b.name || b.kind} clears the full north-south road`);
            assert.ok(b.x + b.y + b.w + b.d <= 835 || b.x + b.y >= 1165,
                `${b.name || b.kind} clears the full east-west road`);
            for (const [x, y] of [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.d], [b.x + b.w, b.y + b.d]]) {
                assert.ok(Math.abs(x - y) <= 1000 && x + y >= 0 && x + y <= 2000, `${b.name || b.kind} in bounds`);
            }
            for (const other of objects.slice(i + 1))
                assert.ok(!overlaps(b, other), `${b.name || b.kind} overlaps ${other.name || other.kind}`);
        }
        const joined = new Set();
        for (const access of q.roadAccess) {
            assert.ok(access.path.length);
            const end = access.path.at(-1), key = end.join(',');
            assert.ok(Math.abs(end[0]) <= 60 || Math.abs(end[1] - 1000) <= 100 || joined.has(key),
                `${access.building.name} joins main or connected street`);
            for (let i = 0; i < access.path.length; i++) {
                const p = access.path[i], [x, y] = world(...p);
                joined.add(p.join(','));
                assert.ok(CityLayout.nearRoad(q, x, y));
                if (i) assert.equal(Math.abs(p[0] - access.path[i - 1][0]) + Math.abs(p[1] - access.path[i - 1][1]), 20);
                // A compass-aligned street square is a diamond in world coordinates.
                for (const b of [...objects, ...(q.parkingLot ? [q.parkingLot] : [])])
                    assert.ok(Math.max(b.x - x, 0, x - b.x - b.w) + Math.max(b.y - y, 0, y - b.y - b.d) >= 44,
                        `Street clears ${b.name || b.kind}`);
                assert.ok(!q.trees.some(t => Math.hypot(t.x - x, t.y - y) < 20), 'Trees stay off streets');
            }
            const [x, y] = world(...access.path[0]), b = access.building;
            const distance = Math.hypot(Math.max(b.x - x, 0, x - b.x - b.w), Math.max(b.y - y, 0, y - b.y - b.d));
            assert.ok(distance <= 80, `${b.name} has an adjacent approach`);
            const tx = Math.max(b.x, Math.min(x, b.x + b.w)), ty = Math.max(b.y, Math.min(y, b.y + b.d));
            assert.ok(walkable(tx + (x - tx) / distance * 40, ty + (y - ty) / distance * 40),
                `${b.name || b.kind} can be approached within interaction range`);
        }
    });
}
