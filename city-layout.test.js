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
    vm.runInNewContext(`${fs.readFileSync(`${__dirname}/city-layout.js`, 'utf8')}
        ${fs.readFileSync(`${__dirname}/residential-art.js`, 'utf8')}
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
    const tree = html.slice(html.indexOf('function drawPlanting('), html.indexOf('function drawLamp('));
    vm.runInNewContext(`${ground}\n${tree}\nglobalThis.ground=drawGround;globalThis.tree=drawTree;globalThis.planting=drawPlanting;`, env);
    const before = JSON.stringify(context.city.SW);
    env.ground(context.city.SW);
    assert.ok(polygons.some(p=>p.fill==='#d0d5aa0d'),'natural ground has subtle blade texture rather than alternating green tiles');
    assert.ok(polygons.filter(p => p.fill === '#b4e1d04d').length > 100, 'waterfront has layered wave highlights');
    assert.ok(polygons.some(p => p.fill === '#26333b'), 'attached lots include storm drains');
    assert.ok(polygons.some(p => p.fill === '#a5abaa'), 'waterfront has a paved urban promenade');
    assert.ok(polygons.some(p => p.fill === '#555a55'), 'piers project out into the channel');
    assert.ok(polygons.some(p => p.fill === '#d5ddd5'), 'moored boat hulls sit in the water');
    assert.ok(!polygons.some(p => p.fill === '#a89a80'), 'the SW waterfront has no sandy shoreline');
    assert.equal(JSON.stringify(context.city.SW), before, 'decorative details do not change parking or collisions');
    env.tree({ x: 120, y: 210 });
    assert.equal(ellipses.length, 52, 'trees have dense shaded crowns and individual leaf clusters');
    const normal = ellipses.map(args => args[2]);
    ellipses.length = 0;
    env.P = (x, y, z = 0) => [(x - y) * 3.2, (x + y) * 1.6 - z * 2];
    env.tree({ x: 120, y: 210 });
    ellipses.forEach((args, i) => assert.ok(Math.abs(args[2] - normal[i] * 2) < 1e-8, 'foliage scales with map zoom'));
    env.box=(...args)=>args.slice(0,6).forEach(n=>assert.ok(Number.isFinite(n)));
    for(const setting of ['lawn','pit','raised','berm']) {
        const start=polygons.length;
        env.tree({x:120,y:210,setting});
        if(setting==='lawn' || setting==='berm')
            assert.equal(polygons[start].fill,CityLayout.grassColor,'tree turf blends with the surrounding lawn');
    }
    for(const q of Object.values(context.city)) for(const bed of q.plantings) env.planting(bed);
    assert.ok(polygons.some(p=>p.fill==='#4e3e30'),'urban trees have an exposed soil opening');
    assert.ok(polygons.some(p=>p.fill==='#574330'),'root flares anchor tree trunks to the soil');
    for(const color of ['#526240','#81926a','#596f47','#59734b','#63845322'])
        assert.ok(!polygons.some(p=>p.fill===color),'no contrasting grass disks, bed borders or lawn strips');
});

test('all quadrants and natural districts use the unchanged residential lawn color', () => {
    assert.equal(CityLayout.grassColor,'#55754c');
    assert.equal(CityLayout.grassColor,ResidentialArt.grassColor);
    for(const q of Object.values(context.city)) {
        assert.deepEqual([...q.lot],[CityLayout.grassColor,CityLayout.grassColor],'ground and map no longer use quadrant-specific checkerboards');
        for(const district of q.districts.filter(d=>d.grass))
            assert.equal(district.color,CityLayout.grassColor,'district grass matches neighboring lawns');
    }
});

test('trees match their ground surface and planted gardens keep property access and parking clear', () => {
    const settings=new Set(),species=new Set();
    for(const q of Object.values(context.city)) {
        assert.ok(q.plantings.length>=12,'every quadrant has several planted beds');
        for(const tree of q.trees) {
            settings.add(tree.setting);
            assert.ok(['lawn','pit','raised','berm'].includes(tree.setting));
            const area={x:tree.x-10,y:tree.y-10,w:20,d:20,roadAligned:true};
            const natural=CityLayout.footprint(area).corners.every(p=>CityLayout.grassAt(q,...p));
            assert.equal(tree.setting==='lawn',natural,'unboxed trees stand wholly on natural grass');
            for(const a of q.approaches.filter(a=>a.vehicleEntrance))
                assert.equal(CityLayout.polygonsOverlap(CityLayout.footprint(area).corners,
                    a.polygon||CityLayout.footprint(a).corners),false,'tree bases never block a driveway entrance');
        }
        for(const building of CityLayout.targets(q).filter(b=>CityLayout.residentialPlan(b)))
            assert.ok(q.plantings.some(p=>p.building===building),`${building.name} has front landscaping`);
        for(const bed of q.plantings) {
            species.add(bed.kind);
            if(bed.building) {
                const plan=CityLayout.residentialPlan(bed.building);
                assert.ok(CityLayout.contains(bed.building,CityLayout.footprint(bed).corners,2));
                for(const r of [...plan.parts,plan.path,plan.parking,...(plan.garden?[plan.garden]:[])])
                    assert.equal(CityLayout.overlaps(bed,CityLayout.region(bed.building,r),2),false,'beds leave doors, walls and parking clear');
            }
            for(const a of q.approaches)
                assert.equal(CityLayout.polygonsOverlap(CityLayout.footprint(bed).corners,
                    a.polygon||CityLayout.footprint(a).corners),false,'flowers do not cross a vehicle or pedestrian entrance');
        }
    }
    assert.deepEqual([...settings].sort(),['berm','lawn','pit','raised']);
    assert.deepEqual([...species].sort(),['flowers','roses','shrubs']);
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
    assert.match(html, /for\(const r of CityLayout.streetBounds\(q\)\) compassRect\(r.e0,r.e1,r.s0,r.s1,'#c3c6c5'\)/);
    assert.match(html, /q.approaches.filter\(a => !a.pedestrian\)/, 'only vehicle approaches cut through sidewalks; no paths to front doors');
    assert.ok(!html.includes('leaveStreetGap'), 'parking entrances must not be clipped away from streets');
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
                assert.equal(bay.area.w * bay.area.d, 12600, 'Public lots are 140 by 90, with a broader maneuvering aisle');
                assert.ok(CityLayout.overlaps(bay.area,bay.destination,.001) && !CityLayout.overlaps(bay.area,bay.destination),
                    'Lot shares an edge with its destination instead of becoming isolated');
                const bounds=CityLayout.footprint(bay.area);
                for(const road of CityLayout.streetBounds(q,12))
                    assert.ok(bounds.e1<=road.e0 || bounds.e0>=road.e1 || bounds.s1<=road.s0 || bounds.s0>=road.s1,
                        `${bay.destination.name}: full-size lot stays twelve units outside sidewalk perimeter`);
                assert.ok(q.approaches.some(a=>a.vehicleEntrance && a.destination===bay.destination &&
                    CityLayout.polygonsOverlap(a.polygon||CityLayout.footprint(a).corners,bounds.corners)),
                    'Only an entrance apron connects the lot to the street');
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
test('apartment garages attach beside the residence so its roof cannot hide their parking deck', () => {
    for (const q of Object.values(context.city)) for (const garage of q.buildings.filter(b => b.garage)) {
        const apartment = q.buildings.find(b => b.style === 'apartment');
        assert.ok(apartment);
        assert.equal(garage.w, apartment.w);
        const side=CityLayout.point(apartment,apartment.x+apartment.w,apartment.y+apartment.d);
        const attached=CityLayout.point(garage,garage.x,garage.y+garage.d);
        assert.ok(Math.hypot(side[0]-attached[0],side[1]-attached[1])<1e-7,'Garage shares the residence side boundary');
        assert.ok(garage.h < apartment.h);
    }
    assert.match(html, /if \(b\.garage\) ResidentialArt\.drawGarage/);
});
for (const [id, q] of Object.entries(context.city)) {
    test(`${id} has a distinct residential district, bounded properties and unobstructed streets to every destination`, () => {
        const objects = CityLayout.targets(q);
        assert.ok(q.neighborhood.buildings.filter(b => b.type === 'crib').length >= 5);
        assert.ok(q.districts.length >= 2);
        assert.equal(q.roadAccess.length, objects.length+(q.parkingLot?1:0));
        for (const street of q.neighborhood.streets) {
            for (const b of [...objects, ...(q.parkingLot ? [q.parkingLot] : [])])
                assert.equal(CityLayout.intersects(street, b), false, `Full street surface clears ${b.name || b.kind}`);
        }
        for (const p of [[0, 20], [0, 2 * WORLD - 20], [-WORLD + 20, WORLD], [WORLD - 20, WORLD]])
            assert.ok(walkable(q,...world(...p)), 'Quadrant crossings stay open');
        for (const [i, b] of objects.entries()) {
            const f=CityLayout.footprint(b);
            assert.ok(f.e1 <= -CityLayout.halfWidth || f.e0 >= CityLayout.halfWidth,
                `${b.name || b.kind} clears the full north-south road`);
            assert.ok(f.s1 <= WORLD-CityLayout.halfWidth || f.s0 >= WORLD+CityLayout.halfWidth,
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
            assert.ok(Math.abs(end[0]) <= CityLayout.roadHalfWidth || Math.abs(end[1]-WORLD) <= CityLayout.roadHalfWidth || joined.has(key),
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
            assert.ok(distance <= 110, `${b.name} has an adjacent approach beyond the wider sidewalk`);
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

test('main and side streets share two pickup-sized lanes in rendering, routing and the map', () => {
    const half=CityLayout.roadHalfWidth,sidewalk=CityLayout.halfWidth,truck=context.VehicleArt.sizes.truck;
    assert.equal(half,44);
    assert.ok(half/Math.SQRT2 >= truck.d+14,'each lane has at least fourteen world units beyond pickup width');
    assert.ok(half*Math.SQRT2 < truck.w*2,'street stays proportional to two vehicles rather than a highway');
    assert.ok(sidewalk>half);
    assert.match(html,/const roads = CityLayout.streets\(q\)/,'map uses the same street network');
    assert.doesNotMatch(html,/r\.main \? 24 : 14/,'map no longer exaggerates main roads');
    const env=rideWorld();
    env.setRidePacked(true);
    for(const [id,q] of Object.entries(env.quadrants)) {
        const roads=CityLayout.streets(q),bounds=CityLayout.streetBounds(q,0,true),outer=CityLayout.streetBounds(q);
        for(const [i,road] of roads.entries()) {
            const vertical=road.a[0]===road.b[0],axis=vertical?'e':'s',f=bounds[i],g=outer[i];
            assert.equal(f[axis+'1']-f[axis+'0'],2*half,`${id} road ${i}: same asphalt width`);
            assert.equal(g[axis+'1']-g[axis+'0'],2*sidewalk,`${id} road ${i}: same sidewalks`);
            const length=Math.hypot(road.b[0]-road.a[0],road.b[1]-road.a[1]);
            const heading=vertical?[Math.SQRT1_2,Math.SQRT1_2]:[Math.SQRT1_2,-Math.SQRT1_2];
            for(let t=0;t<=length;t+=12) {
                const e=road.a[0]+(vertical?0:Math.sign(road.b[0]-road.a[0])*t);
                const s=road.a[1]+(vertical?Math.sign(road.b[1]-road.a[1])*t:0);
                const vehicles=[];
                for(const side of [-1,1]) {
                    const center=world(e+(vertical?side*CityLayout.laneOffset:0),s+(vertical?0:side*CityLayout.laneOffset));
                    const corners=CityLayout.vehicleCorners(...center,heading,truck);
                    assert.ok(corners.every(([x,y])=>x-y>=f.e0 && x-y<=f.e1 && x+y>=f.s0 && x+y<=f.s1),'pickup fits wholly on asphalt in its lane');
                    assert.equal(env.carBlocked(...center,id,heading,truck),false,`${id} road ${i} pickup lane stays clear`);
                    vehicles.push(corners);
                }
                assert.equal(CityLayout.polygonsOverlap(...vehicles),false,'opposing pickups pass without overlapping');
            }
        }
        for(const access of q.roadAccess) for(let i=1;i<access.path.length-1;i++) {
            const a=access.path[i-1],p=access.path[i],b=access.path[i+1];
            if((a[0]===p[0])===(p[0]===b[0]))continue;
            const center=world(...p);
            for(let angle=0;angle<Math.PI*2;angle+=Math.PI/12) {
                const heading=[Math.cos(angle),Math.sin(angle)];
                assert.equal(env.carBlocked(...center,id,heading,truck),false,`${id} pickup can turn at side-street corners`);
            }
        }
    }
});

test('pickups can drive from the resized streets through every parking entrance', () => {
    const env=rideWorld(),truck=env.vehicles.truck;
    env.setRidePacked(true);
    for(const [id,q] of Object.entries(env.quadrants)) for(const apron of q.approaches.filter(a=>a.vehicleEntrance)) {
        let start,end;
        if(apron.polygon) {
            const p=apron.polygon;
            start=[(p[0][0]+p[3][0])/2,(p[0][1]+p[3][1])/2];
            end=[(p[1][0]+p[2][0])/2,(p[1][1]+p[2][1])/2];
        } else {
            const across=apron.heading[0]*apron.heading[1]<0;
            start=CityLayout.point(apron,apron.x+(across?0:apron.w/2),apron.y+(across?apron.d/2:0));
            end=CityLayout.point(apron,apron.x+(across?apron.w:apron.w/2),apron.y+(across?apron.d/2:apron.d));
        }
        const dx=end[0]-start[0],dy=end[1]-start[1],length=Math.hypot(dx,dy),heading=[dx/length,dy/length];
        for(let distance=0;distance<=length;distance+=2) {
            const x=start[0]+heading[0]*distance,y=start[1]+heading[1]*distance;
            assert.equal(env.carBlocked(x,y,id,heading,truck),false,`${id} ${apron.destination.name||apron.destination.kind}: pickup entrance stays clear at ${distance}/${length}`);
        }
    }
});

test('attached lots and residential driveways keep their pedestrian approaches clear of parked pickups', () => {
    for (const q of Object.values(context.city)) for (const approach of q.approaches) {
        for (const b of CityLayout.targets(q).filter(b => b !== approach.destination))
            assert.equal(CityLayout.polygonsOverlap(approach.polygon || CityLayout.footprint(approach).corners,
                CityLayout.footprint(b).corners),false,'approaches must not cross another property');
        if (!approach.pedestrian) continue;
        for (const bay of q.playerParking) {
            const corners = CityLayout.vehicleCorners(bay.x + bay.w / 2, bay.y + bay.d / 2, bay.heading, context.VehicleArt.sizes.truck);
            assert.equal(CityLayout.polygonsOverlap(corners, CityLayout.footprint(approach).corners), false,
                `${bay.destination.name || bay.destination.kind} leaves the entrance approach clear`);
        }
    }
});

test('parking entrances overlap both lot pavement and street asphalt instead of stopping at sidewalks', () => {
    for (const q of Object.values(context.city)) {
        const streetPolygons = CityLayout.streetBounds(q,0,true).map(({e0,e1,s0,s1})=>
            [[e0,s0],[e1,s0],[e1,s1],[e0,s1]].map(p=>world(...p)));
        for (const area of q.parkingAreas.filter(a=>!CityLayout.residentialPlan(a.destination))) {
            const entrances = q.approaches.filter(a=>a.vehicleEntrance && a.destination===area.destination);
            assert.ok(entrances.some(a=>{
                const corners = a.polygon || CityLayout.footprint(a).corners;
                return CityLayout.polygonsOverlap(corners,CityLayout.footprint(area).corners) &&
                    streetPolygons.some(road=>CityLayout.polygonsOverlap(corners,road));
            }), `${area.destination.name || area.kind} has a continuous open street entrance`);
        }
        for (const apron of q.approaches.filter(a=>a.vehicleEntrance)) {
            const corners = apron.polygon || CityLayout.footprint(apron).corners;
            for (const b of [...q.buildings.filter(b=>!b.garage),...q.neighborhood.buildings])
                for (const solid of CityLayout.buildingSolids(b))
                    assert.equal(CityLayout.polygonsOverlap(corners,solid.corners),false,'entrance must not cross a building or garden');
        }
        for (const b of CityLayout.targets(q).filter(b=>CityLayout.residentialPlan(b))) {
            assert.ok(q.approaches.filter(a=>!a.pedestrian && a.destination===b).some(a=>
                streetPolygons.some(road=>CityLayout.polygonsOverlap(CityLayout.footprint(a).corners,road))),
            `${b.name} driveway reaches the street, not just its sidewalk`);
        }
    }
});

test('opaque buildings are repositioned so projected roofs clear roads, parking and entrances', () => {
    assert.doesNotMatch(html,/drawWithClearSightlines|worldSightlines|withSightlines|globalAlpha\s*\*=\s*\.12/);
    assert.match(html,/KX = CityLayout\.projection\.x, KY = CityLayout\.projection\.y/,'placement and canvas use exactly the same projection');
    for(const q of Object.values(context.city)) for(const b of CityLayout.targets(q)) {
        const layout=CityLayout.residentialPlan(b);
        if(layout) for(const part of layout.parts) {
            const height=part.z+part.h+(part.roof==='gable'||part.roof==='hip'?18:12);
            for(const [x,y] of CityLayout.footprint(CityLayout.region(b,part)).corners) {
                const projected=world(x-y,x+y-height/CityLayout.projection.y);
                assert.ok(CityLayout.visualSolids(b).some(v=>CityLayout.contains(v,[projected])),
                    'clearance contains the actual projected roof vertices, including upper floors');
            }
        }
        for(const visual of CityLayout.visualSolids(b)) {
            const f=CityLayout.footprint(visual);
            f.corners.flat().forEach(n=>assert.ok(Number.isFinite(n)));
            for(const r of q.neighborhood.streets)
                assert.equal(CityLayout.intersects(r,visual),false,`${b.name||b.type} roof stays off local streets`);
            assert.ok(f.e1<=-CityLayout.halfWidth || f.e0>=CityLayout.halfWidth,`${b.name} roof stays off main north-south street`);
            assert.ok(f.s1<=WORLD-CityLayout.halfWidth || f.s0>=WORLD+CityLayout.halfWidth,`${b.name} roof stays off main east-west street`);
            for(const bay of q.playerParking)
                assert.equal(CityLayout.overlaps(visual,bay),false,`${b.name} cannot obscure a parking bay`);
            for(const other of CityLayout.targets(q).filter(other=>other!==b))
                assert.equal(CityLayout.overlaps(visual,other),false,`${b.name} roof stays off neighboring properties`);
            for(const a of q.approaches.filter(a=>a.vehicleEntrance))
                assert.equal(CityLayout.polygonsOverlap(f.corners,a.polygon||CityLayout.footprint(a).corners),false,
                    `${b.name} cannot obscure a driving entrance`);
        }
    }
});

test('all parked vehicles follow the painted bay long axis in the shared road rotation', () => {
    for(const q of Object.values(context.city)) for(const bay of q.playerParking) {
        const expected=CityLayout.region(bay,{x:0,y:0,w:1,d:1,heading:bay.w>bay.d?[1,0]:[0,1]}).heading;
        const dot=bay.heading[0]*expected[0]+bay.heading[1]*expected[1];
        assert.ok(Math.abs(Math.abs(dot)-1)<1e-8,`${bay.destination.name||bay.destination.type} vehicle runs parallel to its bay`);
    }
});

test('garage lane stays separate from every aligned bay and connects to its entrance', () => {
    for(const q of Object.values(context.city)) for(const area of q.parkingAreas.filter(a=>a.kind==='garage')) {
        const bays=q.playerParking.filter(b=>b.area===area),lane=area.lane;
        assert.equal(bays.length,3);assert.ok(lane.w>=48);
        assert.ok(CityLayout.contains(area,CityLayout.footprint(lane).corners));
        const apron=q.approaches.find(a=>a.destination===area.destination && a.vehicleEntrance);
        assert.ok(CityLayout.polygonsOverlap(CityLayout.footprint(lane).corners,apron.polygon||CityLayout.footprint(apron).corners));
        for(const bay of bays) {
            assert.equal(CityLayout.overlaps(lane,bay),false);
            const localHeading=CityLayout.region(area,{x:0,y:0,w:1,d:1,heading:[1,0]}).heading;
            assert.deepEqual(bay.heading,localHeading,'parked vehicles run parallel to the long sides of the garage markings');
            const [bx,by]=CityLayout.point(area,bay.x+bay.w/2,bay.y+bay.d/2,true);
            for(let x=area.destination.x+area.destination.w-72;x<=bx;x+=3) {
                const center=CityLayout.point(area.destination,x,by);
                const corners=CityLayout.vehicleCorners(...center,bay.heading,context.VehicleArt.sizes.truck);
                for(const solid of q.solids)
                    assert.equal(CityLayout.polygonsOverlap(corners,solidCorners(solid)),false,'pickup can drive from aisle into each bay');
            }
            for(let y=area.destination.y+18;y<area.destination.y+area.destination.d+20;y+=2) {
                const center=CityLayout.point(area.destination,area.destination.x+area.destination.w-72,y);
                const heading=CityLayout.region(area.destination,{x:0,y:0,w:1,d:1,heading:[0,1]}).heading;
                const corners=CityLayout.vehicleCorners(...center,heading,context.VehicleArt.sizes.truck);
                for(const solid of q.solids)
                    assert.equal(CityLayout.polygonsOverlap(corners,solidCorners(solid)),false,'pickup drives the entire aisle to the apron');
                for(const bay of bays)
                    assert.equal(CityLayout.polygonsOverlap(corners,CityLayout.footprint(bay).corners),false,
                        'aisle remains usable when every bay is occupied');
            }
        }
    }
});
