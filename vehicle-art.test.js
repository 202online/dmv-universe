'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const VehicleArt = require('./vehicle-art.js');
const ResidentialArt = require('./residential-art.js');

test('car wheels are inset world-oriented shapes under the chassis, never side-mounted screen circles', () => {
    for (const kind of ['car', 'truck']) for (const heading of [[1, 0], [0, 1], [-1, 0], [0, -1],
        [Math.SQRT1_2, -Math.SQRT1_2], [-Math.SQRT1_2, Math.SQRT1_2]]) {
        const c = { ...VehicleArt.sizes[kind], x: 100, y: 200, kind, color: '#8b3344', heading };
        const faces = [], screenArcs = [];
        VehicleArt.draw(c, {
            ctx: { arc: (...args) => screenArcs.push(args) },
            P: (x, y, z = 0) => [x, y, z],
            poly: (points, color) => faces.push({ points, color }),
            shade: color => color
        });
        const tires = faces.filter(f => f.color === '#101821');
        assert.equal(tires.length, 4);
        assert.equal(screenArcs.length, 0, 'wheels must rotate with the car, not stay circular in screen space');
        const [fx, fy] = heading, cx = c.x + c.w / 2, cy = c.y + c.d / 2;
        for (const tire of tires) for (const [x, y, z] of tire.points) {
            const forward = (x - cx) * fx + (y - cy) * fy;
            const side = -(x - cx) * fy + (y - cy) * fx;
            assert.ok(Math.abs(forward) < c.w / 2);
            assert.ok(Math.abs(side) < c.d / 2, 'tire stays inside body width');
            assert.ok(z >= 0 && z <= 6.4, 'tires touch the ground beneath the body');
        }
        assert.ok(faces.indexOf(tires.at(-1)) < faces.findIndex(f => f.color === c.color), 'body must occlude the top of every tire');
    }
});

test('owned and parked vehicles share dimensions and one renderer regardless of location', () => {
    const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
    const env = { VehicleArt };
    vm.runInNewContext(html.slice(html.indexOf('const vehicles ='), html.indexOf('const ownCar =')) + ';globalThis.rides=vehicles;', env);
    for (const ride of Object.values(env.rides)) {
        assert.equal(ride.w, VehicleArt.sizes[ride.kind].w);
        assert.equal(ride.d, VehicleArt.sizes[ride.kind].d);
    }
    assert.ok(VehicleArt.sizes.truck.w / VehicleArt.sizes.car.w < 1.2);
    assert.ok(VehicleArt.sizes.bike.w < VehicleArt.sizes.car.w);
    assert.ok(html.indexOf('src="vehicle-art.js"') < html.indexOf('src="residential-art.js"'));
    assert.match(html, /function drawOwnCar\(c\) \{\s*VehicleArt.draw/);
    for (const kind of ['car', 'truck']) for (const heading of [[1, 0], [0, 1], [-1, 0], [0, -1], [Math.SQRT1_2, Math.SQRT1_2]]) {
        const heights = [];
        VehicleArt.draw({ ...VehicleArt.sizes[kind], x: 100, y: 200, kind, color: '#8b3344', heading }, {
            ctx: new Proxy({}, { get: (target, key) => key in target ? target[key] : () => {} }),
            P(x, y, z = 0) { assert.ok([x,y,z].every(Number.isFinite)); heights.push(z); return [x-y,(x+y)/2-z]; },
            poly() {}, shade: color => color
        });
        assert.equal(Math.max(...heights), 18, 'The same roof height applies to decorative and drivable cars');
    }
});

test('house driveways reserve their single space for player rides, not decorative cars', () => {
    const original = VehicleArt.draw;
    try {
        for (const variant of [0, 1, 2]) {
            let cars = 0;
            VehicleArt.draw = c => {
                cars++;
                assert.equal(c.w, VehicleArt.sizes.car.w);
                assert.equal(c.d, VehicleArt.sizes.car.d);
            };
            const text = [];
            ResidentialArt.draw({ x: 100, y: 200, w: 80, d: 60, h: 85, kind: 'house', variant, color: '#976b53', trim: '#e3ceb0' }, {
                ctx: new Proxy({ fillText(t) { text.push(t); } }, { get: (target, key) => key in target ? target[key] : () => {} }),
                P: (x,y,z=0) => [x-y,(x+y)/2-z], poly() {}, box() {}, shade: color => color
            });
            assert.equal(cars, 0);
        }
    } finally { VehicleArt.draw = original; }
});
