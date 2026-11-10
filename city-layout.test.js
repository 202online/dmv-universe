'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const CityLayout = require('./city-layout.js');
const ResidentialArt = require('./residential-art.js');
const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
const source = html.split('// ---------- World data ----------')[1].split('// ---------- State & input ----------')[0];
const WORLD = CityLayout.world;
const context = { WORLD, CityLayout, VehicleArt: require('./vehicle-art.js') };
vm.runInNewContext(`${source}\nglobalThis.city = quadrants;`, context);
const world = (e, s) => [(s + e) / 2, (s - e) / 2];
const overlaps = CityLayout.overlaps;
const solidCorners = s => s.corners || [[s.x0,s.y0],[s.x1,s.y0],[s.x1,s.y1],[s.x0,s.y1]];
const walkable = (q,x,y) => !q.solids.some(s => CityLayout.polygonsOverlap(
    [[x-9,y-9],[x+9,y-9],[x+9,y+9],[x-9,y+9]],solidCorners(s)));

test('baseball has a standalone SW outdoor diamond with a connected street approach', () => {
    const q = context.city.SW;
    const diamond = q.activities.find(a => a.type === 'baseball');
    assert.ok(diamond);
    assert.equal(diamond.w, 240);
    assert.equal(diamond.d, 220);
    assert.ok(q.roadAccess.some(access => access.building === diamond));
    assert.ok(!q.solids.some(s => CityLayout.polygonsOverlap(CityLayout.footprint(diamond).corners,solidCorners(s))));
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
test('outdoor activities use a consistent arcade size hierarchy and parked cars match the Bucket', () => {
    const activities = Object.values(context.city).flatMap(q => q.activities);
    const area = type => { const b = activities.find(a => a.type === type); return b.w * b.d; };
    assert.ok(area('basketball') < area('tennis'));
    assert.ok(area('tennis') < area('baseball'));
    assert.ok(area('baseball') < area('soccer'));
    assert.ok(area('basketball') < area('football'));
    const car = context.VehicleArt.sizes.car;
    for (const q of Object.values(context.city)) for (const parked of q.cars) {
        assert.equal(parked.w, car.w);
        assert.equal(parked.d, car.d);
    }
});
test('district distances expand by 60 percent without enlarging venues or rides; all quadrants have physical transit stations', () => {
    const q = context.city.NW, lounge = q.buildings.find(b => b.type === 'gogo');
    assert.equal(WORLD, 1600);
    assert.equal(lounge.w, 190);
    assert.equal(lounge.d, 120);
    assert.equal(lounge.x + lounge.w / 2 - lounge.y - lounge.d / 2, 560 * 1.6);
    assert.equal(lounge.x + lounge.w / 2 + lounge.y + lounge.d / 2, 640 * 1.6);
    for (const quadrant of Object.values(context.city)) for (const type of ['busstop', 'metro']) {
        const station = quadrant.buildings.find(b => b.type === type);
        assert.ok(station);
        assert.ok(quadrant.roadAccess.some(access => access.building === station));
    }
});
test('every public destination has a separate marked parking bay clear of streets, structures, trees and other bays', () => {
    const intersects = CityLayout.overlaps;
    for (const q of Object.values(context.city)) {
        const destinations = CityLayout.targets(q).filter(b => !b.privateHome);
        assert.equal(q.playerParking.length, destinations.length);
        for (const [i, bay] of q.playerParking.entries()) {
            assert.ok(destinations.includes(bay.destination));
            assert.equal(q.playerParking.filter(b => b.destination === bay.destination).length, 1);
            assert.ok(bay.w >= context.VehicleArt.sizes.truck.w + 4);
            assert.ok(bay.d >= context.VehicleArt.sizes.truck.d + 4);
            for (const object of [...CityLayout.targets(q), ...(q.parkingLot ? [q.parkingLot] : []), ...q.playerParking.slice(i+1)])
                assert.equal(intersects(bay,object), false, `Parking clears ${object.name || object.kind || 'another bay'}`);
            assert.ok(q.neighborhood.streets.every(r => !CityLayout.intersects(r,bay)));
            assert.ok(q.trees.every(t => !intersects(bay,{x:t.x-6,y:t.y-6,w:12,d:12})));
        }
    }
});
test('apartment garages attach flush to the rear wall, never a separate front or side outbuilding', () => {
    for (const q of Object.values(context.city)) for (const garage of q.buildings.filter(b => b.garage)) {
        const apartment = q.buildings.find(b => b.style === 'apartment');
        assert.ok(apartment);
        assert.equal(garage.w, apartment.w);
        const rear=CityLayout.point(apartment,apartment.x,apartment.y);
        const attached=CityLayout.point(garage,garage.x,garage.y+garage.d);
        assert.ok(Math.hypot(rear[0]-attached[0],rear[1]-attached[1])<1e-7,'Garage shares the rotated rear wall');
        const rearWall = ResidentialArt.plan({ ...apartment, variant: 1 }).parts.find(p => p.z === 0);
        assert.equal(garage.w, rearWall.w);
        assert.equal(rearWall.y,apartment.y,'Rendered rear wall uses the same footprint');
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
        for (const p of [[0, 20], [0, 2 * WORLD - 20], [-WORLD + 20, WORLD], [WORLD - 20, WORLD]])
            assert.ok(walkable(q,...world(...p)), 'Quadrant crossings stay open');
        for (const [i, b] of objects.entries()) {
            const f=CityLayout.footprint(b);
            assert.ok(f.e1 <= -120 || f.e0 >= 120,
                `${b.name || b.kind} clears the full north-south road`);
            assert.ok(f.s1 <= WORLD - 165 || f.s0 >= WORLD + 165,
                `${b.name || b.kind} clears the full east-west road`);
            for (const [x, y] of f.corners) {
                assert.ok(Math.abs(x - y) <= WORLD && x + y >= 0 && x + y <= 2 * WORLD, `${b.name || b.kind} in bounds`);
            }
            for (const other of objects.slice(i + 1))
                assert.ok(!overlaps(b, other), `${b.name || b.kind} overlaps ${other.name || other.kind}`);
        }
        const joined = new Set();
        for (const access of q.roadAccess) {
            assert.ok(access.path.length);
            const end = access.path.at(-1), key = end.join(',');
            assert.ok(Math.abs(end[0]) <= 60 || Math.abs(end[1] - WORLD) <= 100 || joined.has(key),
                `${access.building.name} joins main or connected street`);
            for (let i = 0; i < access.path.length; i++) {
                const p = access.path[i], [x, y] = world(...p);
                joined.add(p.join(','));
                assert.ok(CityLayout.nearRoad(q, x, y));
                if (i) assert.equal(Math.abs(p[0] - access.path[i - 1][0]) + Math.abs(p[1] - access.path[i - 1][1]), 20);
                // A compass-aligned street square is a diamond in world coordinates.
                for (const b of [...objects, ...(q.parkingLot ? [q.parkingLot] : [])])
                    assert.ok(!CityLayout.intersects({a:p,b:p},b),
                        `Street clears ${b.name || b.kind}`);
                assert.ok(!q.trees.some(t => Math.hypot(t.x - x, t.y - y) < 20), 'Trees stay off streets');
            }
            const [x, y] = world(...access.path[0]), b = access.building;
            const distance = CityLayout.distanceTo(b,x,y);
            assert.ok(distance <= 80, `${b.name} has an adjacent approach`);
            const [lx,ly]=CityLayout.point(b,x,y,true);
            const [tx,ty]=CityLayout.point(b,Math.max(b.x,Math.min(lx,b.x+b.w)),Math.max(b.y,Math.min(ly,b.y+b.d)));
            assert.ok(walkable(q,tx + (x - tx) / distance * 40, ty + (y - ty) / distance * 40),
                `${b.name || b.kind} can be approached within interaction range`);
        }
    });
}
test('every quadrant keeps its homes and mixes houses, apartments and condos with selective availability', () => {
    for (const [id, q] of Object.entries(context.city)) {
        const homes = q.neighborhood.buildings.filter(b => b.type === 'crib');
        assert.equal(homes.length, id === 'SW' ? 5 : 6);
        assert.equal(new Set(homes.map(b => b.kind)).size, 3);
        const multi = homes.filter(b => b.kind !== 'house');
        assert.ok(multi.some(b => !ResidentialArt.plan(b).available), 'Not every multi-family building has a sign');
        for (const kind of ['apartment', 'condo'])
            assert.ok(homes.filter(b => b.kind === kind && b.available).length <= 1);
    }
});
test('close-set apartments and attached rowhome condos share street-aligned frontages without overlapping', () => {
    const apartments = context.city.SE.neighborhood.buildings.filter(b => b.kind === 'apartment').slice(0, 2);
    const [a, b] = apartments.map(CityLayout.footprint);
    assert.ok(Math.abs((b.e0 - a.e1) / Math.SQRT2 - 8) < 1e-7, 'Apartment pair has an eight-unit gap');
    const condos = context.city.SW.neighborhood.buildings.filter(b => b.terrace);
    const [c, d] = condos.map(CityLayout.footprint);
    assert.ok(Math.abs(c.e1 - d.e0) < 1e-7 && Math.abs(c.s0 - d.s0) < 1e-7, 'Condo pair shares a party wall');
    assert.ok(condos.every(b => ResidentialArt.plan(b).terrace));
    assert.equal(overlaps(condos[0], condos[1]), false);
});
test('all building and field footprints run parallel to the unchanged compass street grid', () => {
    for (const q of Object.values(context.city)) for (const b of [...CityLayout.targets(q), ...q.playerParking]) {
        assert.equal(b.roadAligned, true, b.name);
        const corners = CityLayout.footprint(b).corners;
        corners.forEach(([x, y], i) => {
            const [nx, ny] = corners[(i + 1) % 4];
            assert.ok(Math.abs((nx - x) - (ny - y)) < 1e-7 || Math.abs((nx - x) + (ny - y)) < 1e-7, b.name);
        });
        const p = CityLayout.front(b);
        assert.ok(Math.abs(CityLayout.distanceTo(b, ...p) - 26) < 1e-7, 'Entrance follows the rotated front');
    }
});
test('rotated collision polygons leave their empty bounding-box corners walkable', () => {
    const b = { x: 100, y: 200, w: 80, d: 60, roadAligned: true };
    const f = CityLayout.footprint(b), outside = { x: f.x0, y: f.y0, w: 1, d: 1 };
    assert.equal(CityLayout.overlaps(b, outside), false);
    assert.equal(CityLayout.polygonsOverlap(f.corners, CityLayout.footprint(outside).corners), false);
    assert.ok(CityLayout.overlaps(b, { x: 139, y: 229, w: 2, d: 2 }));
    const p = CityLayout.point(b, 122, 245), inverse = CityLayout.point(b, ...p, true);
    assert.ok(Math.hypot(inverse[0] - 122, inverse[1] - 245) < 1e-7);
    b.x += 50;
    assert.notEqual(CityLayout.footprint(b), f, 'Moving an object invalidates its cached footprint');
});
