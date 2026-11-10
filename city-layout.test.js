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
const context = { WORLD, CityLayout, VehicleArt: require('./vehicle-art.js'), TravelArt: require('./travel-art.js') };
vm.runInNewContext(`${source}\nglobalThis.city = quadrants;`, context);
const world = (e, s) => [(s + e) / 2, (s - e) / 2];
const overlaps = CityLayout.overlaps;
const solidCorners = s => s.corners || [[s.x0,s.y0],[s.x1,s.y0],[s.x1,s.y1],[s.x0,s.y1]];
const walkable = (q,x,y) => !q.solids.some(s => CityLayout.polygonsOverlap(
    [[x-9,y-9],[x+9,y-9],[x+9,y+9],[x-9,y+9]],solidCorners(s)));

test('browser global scripts share the same residential geometry without requiring a window property', () => {
    const env = { VehicleArt: context.VehicleArt };
    vm.runInNewContext(`${fs.readFileSync(`${__dirname}/residential-art.js`, 'utf8')}
        ${fs.readFileSync(`${__dirname}/city-layout.js`, 'utf8')}
        globalThis.layout = CityLayout.residentialPlan({kind:'apartment',x:0,y:0,w:160,d:110,h:140});`, env);
    assert.equal(env.layout.parking.spaces, 4);
});

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

test('detailed parking, waterfront and trees render finite scalable scenery without changing access geometry', () => {
    const polygons = [], ellipses = [];
    const canvas = new Proxy({}, { get: (target, key) => key in target ? target[key] : (...args) => {
        args.filter(a => typeof a === 'number').forEach(n => assert.ok(Number.isFinite(n), `${key}: ${n}`));
        if (key === 'ellipse') ellipses.push(args);
    } });
    const env = {
        ctx: canvas, WORLD, TILE: 100, W: 1200, H: 900, KX: 1.6, KY: .8,
        CityLayout, currentQuadrant: 'SW', performance: { now: () => 1200 },
        fromCompass: world, roadAligned: (_, draw) => draw(),
        P: (x, y, z = 0) => [(x - y) * 1.6, (x + y) * .8 - z],
        poly(points, fill) {
            points.flat().forEach(n => assert.ok(Number.isFinite(n)));
            polygons.push({ points, fill });
        }
    };
    const ground = html.slice(html.indexOf('function drawGround('), html.indexOf('function groundCircle('));
    const tree = html.slice(html.indexOf('function drawTree('), html.indexOf('function drawLamp('));
    vm.runInNewContext(`${ground}\n${tree}\nglobalThis.ground=drawGround;globalThis.tree=drawTree;`, env);
    const before = JSON.stringify(context.city.SW);
    env.ground(context.city.SW);
    assert.ok(polygons.filter(p => p.fill === '#b4e1d04d').length > 100, 'waterfront has layered wave highlights');
    assert.ok(polygons.some(p => p.fill === '#26333b'), 'attached lots include storm drains');
    assert.equal(JSON.stringify(context.city.SW), before, 'decorative details do not change parking or collisions');
    env.tree({ x: 120, y: 210 });
    assert.equal(ellipses.length, 23, 'trees have layered crowns and individual leaf clusters');
    const normal = ellipses.map(args => args[2]);
    ellipses.length = 0;
    env.P = (x, y, z = 0) => [(x - y) * 3.2, (x + y) * 1.6 - z * 2];
    env.tree({ x: 120, y: 210 });
    ellipses.forEach((args, i) => assert.ok(Math.abs(args[2] - normal[i] * 2) < 1e-8, 'foliage scales with map zoom'));
});
test('apartments and condos have broad, multi-family footprints proportional to the main apartment', () => {
    const homes = Object.values(context.city).flatMap(q => q.neighborhood.buildings).filter(b => b.type === 'crib');
    const house = homes.find(b => b.kind === 'house');
    const mainApartment = context.city.SE.buildings.find(b => b.style === 'apartment');
    for (const b of homes.filter(b => ['apartment', 'condo'].includes(b.kind))) {
        assert.ok(b.w * b.d > house.w * house.d, 'Multi-family lots remain larger than the expanded single-family yard plots');
        assert.ok(b.w >= mainApartment.w * .8, 'Width is comparable to the existing main apartment');
        assert.ok(b.h / b.w <= 1.1, 'Residential blocks do not become thin towers');
    }
});

test('single-family houses line up with small side yards and generous grassy front setbacks', () => {
    for (const q of Object.values(context.city)) {
        const houses = q.neighborhood.buildings.filter(b => b.kind === 'house');
        assert.ok(houses.length >= 2, 'single-family homes have neighboring houses instead of an isolated plot');
        const centers = houses.map(b => [b.x + b.w / 2 - b.y - b.d / 2, b.x + b.w / 2 + b.y + b.d / 2]);
        assert.equal(q.houseYards.length, 1, 'a continuous lawn surrounds the residential row');
        for (let i = 0; i < houses.length; i++) {
            const b = houses[i], layout = ResidentialArt.plan(b);
            assert.ok(Math.abs(centers[i][1] - centers[0][1]) < 1e-7, 'houses share a street-aligned frontage');
            if (i) assert.ok(Math.abs(centers[i][0] - centers[i-1][0] - 112 * Math.SQRT2) < 1e-7, 'twelve units of side yard separate plots');
            for (const part of layout.parts) {
                assert.ok(part.x >= b.x + 10, 'house walls are inset from the left yard edge');
                assert.ok(part.y + part.d <= b.y + b.d - 25, 'at least 25 units of front lawn before the plot edge');
            }
            assert.ok(layout.parking.y + layout.parking.d < b.y + b.d - 10, 'driveway ends inside the yard, before the sidewalk');
            const [e,s] = q.roadAccess.find(a => a.building === b).path[0];
            const [lx,ly] = CityLayout.point(b, ...world(e,s), true);
            assert.ok(ly > b.y + b.d + 45 && Math.abs(lx - b.x - b.w / 2) < 15,
                'each house faces its street across the front lawn, never a rear or side service road');
        }
    }
    assert.match(html, /streetRect\(r, CityLayout.halfWidth, '#c3c6c5'\)/);
    assert.ok(!html.includes('for (const approach of q.approaches) roadAligned'), 'no visible connector paths between homes and parking');
    assert.match(html, /leaveStreetGap\(-124, 124/);
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
test('every destination owns real parking containing sized, collision-free bays instead of isolated markers', () => {
    const intersects = CityLayout.overlaps;
    for (const q of Object.values(context.city)) {
        const destinations = CityLayout.targets(q).filter(b => !b.privateHome);
        for (const destination of destinations) assert.ok(q.playerParking.some(b => b.destination === destination), destination.name || destination.kind);
        for (const [i, bay] of q.playerParking.entries()) {
            assert.ok(destinations.includes(bay.destination));
            assert.ok(q.parkingAreas.includes(bay.area));
            assert.equal(bay.area.destination, bay.destination);
            assert.ok(CityLayout.contains(bay.area, CityLayout.footprint(bay).corners));
            const corners = CityLayout.vehicleCorners(bay.x + bay.w / 2, bay.y + bay.d / 2, bay.heading, context.VehicleArt.sizes.truck);
            assert.ok(CityLayout.contains(bay, corners, 1), `${bay.destination.name || bay.destination.kind} fits a pickup with clearance`);
            for (const solid of q.solids)
                assert.equal(CityLayout.polygonsOverlap(corners, solidCorners(solid)), false, `${bay.destination.name || bay.destination.kind} does not spawn in a solid`);
            const residential = CityLayout.residentialPlan(bay.destination);
            if (residential || bay.destination.garage)
                assert.ok(CityLayout.contains(bay.destination, CityLayout.footprint(bay).corners), 'Residential parking stays on its own plot');
            else {
                assert.ok(bay.area.w * bay.area.d >= 7000, 'Public venues own a full lot with an aisle, not asphalt behind a bay');
                assert.ok(Math.abs(CityLayout.distanceTo(bay.destination, ...CityLayout.point(bay.area, bay.area.x + bay.area.w / 2, bay.area.y + bay.area.d / 2)) - 33) < 1e-7, 'Lot attaches directly to its destination');
                assert.ok(q.neighborhood.streets.some(r => CityLayout.intersects(r, bay.area)), 'The lot connects directly to an approach');
            }
            for (const object of [...CityLayout.targets(q).filter(b => b !== bay.destination), ...q.playerParking.slice(i+1)])
                assert.equal(intersects(bay,object), false, `Parking clears ${object.name || object.kind || 'another bay'}`);
            assert.ok(q.neighborhood.streets.every(r => !CityLayout.intersects(r,bay)));
            assert.ok(q.trees.every(t => !intersects(bay,{x:t.x-6,y:t.y-6,w:12,d:12})));
        }
    }
});

test('residential entrances and paths are physically walkable and waterfalls are visually beside doors', () => {
    for (const q of Object.values(context.city)) for (const b of CityLayout.targets(q)) {
        const layout = CityLayout.residentialPlan(b);
        if (!layout) continue;
        const { door, path, garden } = layout;
        for (let y = door.y + 13; y <= path.y + path.d; y += 3)
            assert.ok(walkable(q, ...CityLayout.point(b, door.x, y)), `${b.name} has an unobstructed door path`);
        for (const bay of q.playerParking.filter(bay => bay.destination === b)) {
            const corners = CityLayout.vehicleCorners(bay.x + bay.w / 2, bay.y + bay.d / 2, bay.heading, context.VehicleArt.sizes.truck);
            assert.equal(CityLayout.polygonsOverlap(corners, CityLayout.footprint(CityLayout.region(b, path)).corners), false, 'Parked cars leave the entrance open');
        }
        if (garden) {
            const projectX = (x, y) => { const p = CityLayout.point(b, x, y); return (p[0] - p[1]) * .87; };
            const gardenRight = Math.max(...[[garden.x,garden.y],[garden.x+garden.w,garden.y+garden.d]].map(p => projectX(...p)));
            const doorLeft = projectX(door.x - door.w / 2, door.y);
            assert.ok(doorLeft - gardenRight >= 8, 'The waterfall silhouette is separated horizontally from the door, regardless of its height');
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
        assert.equal(homes.length, CityLayout.designs[id].homes.length);
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

function rideWorld() {
    const env = { WORLD, CityLayout, VehicleArt: context.VehicleArt, TravelArt: require('./travel-art.js'),
        HomeLife: require('./home-life.js'), homeLife: { quadrant: 'SE', residence: 'The Crib (Apartment)', parkingUntil: Date.now() + 86400000 },
        RideBag: require('./ride-bag.js'), console, updateProgressHud() {}, snapCamera() {}, transitNotice() {} };
    vm.runInNewContext(`${source}
        ${html.slice(html.indexOf('const starterBay ='), html.indexOf('const SAVE_KEY ='))}
        ${html.slice(html.indexOf('function overlaps(rect, s)'), html.indexOf('let metroCardId ='))}
        ${html.slice(html.indexOf('function secureLogoutRides('), html.indexOf('function showDrivingMessage('))}
        ${html.slice(html.indexOf('function selectRide('), html.indexOf('function openItemBag('))}
        globalThis.quadrants = quadrants; globalThis.vehicles = vehicles;
        globalThis.ownCar = ownCar; globalThis.driving = driving;
        globalThis.player = {x: 800, y: 800, r: 9};
        globalThis.currentQuadrant = 'NW';
        globalThis.progress = {vehicle:'bike', ownedVehicles:['bike','impala','truck']};
        globalThis.rideLook = id => ({...vehicles[id]});
        globalThis.storedAwaySince = {};
        globalThis.starterBay = starterBay;
        `, env);
    return env;
}

test('starter, purchased, called and secured rides use their bay heading and persist inside real parking', () => {
    const env = rideWorld();
    assert.ok(CityLayout.contains(env.starterBay,
        CityLayout.vehicleCorners(env.ownCar.x + env.ownCar.w / 2, env.ownCar.y + env.ownCar.d / 2, env.ownCar.heading, env.ownCar), 1));
    const parkedIn = (id, p) => {
        const vehicle = env.vehicles[id];
        const corners = CityLayout.vehicleCorners(p.x + vehicle.w / 2, p.y + vehicle.d / 2, p.heading, vehicle);
        const bay = env.quadrants[p.quadrant].playerParking.find(b => CityLayout.contains(b, corners, 1));
        assert.ok(bay, `${id} is contained in a real bay`);
        assert.equal(env.carBlocked(p.x + vehicle.w / 2, p.y + vehicle.d / 2, p.quadrant, p.heading, vehicle, id), false);
        return bay;
    };
    env.setRidePacked(true);
    env.selectRide('impala');
    parkedIn('impala', {...env.ownCar, quadrant: env.driving.quadrant});
    env.selectRide('truck');
    parkedIn('truck', {...env.ownCar, quadrant: env.driving.quadrant});
    const stored = vm.runInNewContext('parkedVehicles.impala', env);
    parkedIn('impala', stored);
    env.secureLogoutRides(false);
    const bay = parkedIn('truck', {...env.ownCar, quadrant: env.driving.quadrant});
    assert.equal(bay.destination.style, 'apartment', 'Logout returns cars to the home property, not random grass');
    assert.equal(stored.quadrant, 'SE');
    const storedBay = parkedIn('impala', stored);
    assert.equal(storedBay.destination, bay.destination, 'Both owned cars fit at home without overlapping');
    stored.x = 800; stored.y = 800; stored.heading = [1, 0];
    env.selectRide('impala');
    parkedIn('impala', {...env.ownCar, quadrant: env.driving.quadrant});
    const parkedTruck = vm.runInNewContext('parkedVehicles.truck', env);
    parkedIn('truck', parkedTruck);
});

test('cars without a parking pass use public lots while bicycles need no garage', () => {
    const env = rideWorld();
    env.homeLife.parkingUntil = 0;
    env.setRidePacked(true);
    env.selectRide('impala');
    env.secureLogoutRides(false);
    const car = env.ownCar;
    const bay = env.quadrants[env.driving.quadrant].playerParking.find(b =>
        CityLayout.contains(b, CityLayout.vehicleCorners(car.x + car.w / 2, car.y + car.d / 2, car.heading, car), 1));
    assert.ok(bay);
    assert.notEqual(bay.destination.type, 'crib');
    env.selectRide('bike');
    assert.equal(env.progress.vehicle, 'bike');
    const garage = env.quadrants.SE.playerParking.find(b => b.area.kind === 'garage');
    const cx = garage.x + garage.w / 2, cy = garage.y + garage.d / 2;
    assert.equal(env.carBlocked(cx,cy,'SE',garage.heading,env.vehicles.impala), true, 'locked physical garage blocks car entry');
    assert.equal(env.carBlocked(cx,cy,'SE',garage.heading,env.vehicles.bike), false, 'bike needs no garage pass');
    env.homeLife.parkingUntil = Date.now() + 86400000;
    assert.equal(env.carBlocked(cx,cy,'SE',garage.heading,env.vehicles.impala), false, 'valid pass permits garage entry');
});

test('attached lots and residential driveways keep their pedestrian approaches clear of parked pickups', () => {
    for (const q of Object.values(context.city)) for (const approach of q.approaches) {
        for (const b of CityLayout.targets(q).filter(b => b !== approach.destination))
            assert.equal(CityLayout.overlaps(approach, b), false, 'The approach does not run through another property');
        if (!approach.pedestrian) continue;
        for (const bay of q.playerParking) {
            const corners = CityLayout.vehicleCorners(bay.x + bay.w / 2, bay.y + bay.d / 2, bay.heading, context.VehicleArt.sizes.truck);
            assert.equal(CityLayout.polygonsOverlap(corners, CityLayout.footprint(approach).corners), false,
                `${bay.destination.name || bay.destination.kind} leaves the entrance approach clear`);
        }
    }
});
