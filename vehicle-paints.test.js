'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const VehiclePaints = require('./vehicle-paints.js');

test('the Bucket and pickup offer exactly the requested paints', () => {
    assert.deepStrictEqual(VehiclePaints.options('impala').map(p => p.name), ['Red', 'Pink', 'Black', 'Sky blue', 'White', 'Burgundy']);
    assert.deepStrictEqual(VehiclePaints.options('truck').map(p => p.name), ['Black', 'Silver', 'Blue', 'Lavender', 'White', 'Orange']);
    assert.deepStrictEqual(VehiclePaints.options('bike').map(p => p.name), ['Sky blue', 'Red', 'Pink', 'Lavender', 'White', 'Black']);
    assert.deepStrictEqual(VehiclePaints.options('scooter').map(p => p.name), ['Purple', 'Black', 'Pink', 'Lavender', 'White', 'Teal']);
    assert.deepStrictEqual(VehiclePaints.options('ebike').map(p => p.name), ['Green', 'White', 'Pink', 'Lavender', 'Black', 'Yellow']);
    assert.deepStrictEqual(VehiclePaints.options('bus'), []);
    for (const id of Object.keys(VehiclePaints.paints)) for (const p of VehiclePaints.options(id)) {
        assert.match(p.color, /^#[0-9a-f]{6}$/);
        assert.match(p.trim, /^#[0-9a-f]{6}$/);
        assert.notStrictEqual(p.color, p.trim);
    }
});

test('saved paints are validated and fall back to defaults', () => {
    const zero = () => 0, last = () => 0.999;
    assert.deepStrictEqual(VehiclePaints.initial(zero), { impala: 'red', truck: 'silver', bike: 'skyblue', scooter: 'purple', ebike: 'green' });
    assert.deepStrictEqual(VehiclePaints.initial(last), { impala: 'red', truck: 'silver', bike: 'black', scooter: 'teal', ebike: 'yellow' });
    assert.deepStrictEqual(VehiclePaints.restore({ impala: 'skyblue', truck: 'lavender', bike: 'pink' }, zero),
        { impala: 'skyblue', truck: 'lavender', bike: 'pink', scooter: 'purple', ebike: 'green' });
    assert.deepStrictEqual(VehiclePaints.restore({ impala: 'orange', truck: 'red', bike: 'gold' }, zero), VehiclePaints.initial(zero));
    assert.deepStrictEqual(VehiclePaints.restore(undefined, zero), VehiclePaints.initial(zero));
    assert.deepStrictEqual(VehiclePaints.restore('bad', zero), VehiclePaints.initial(zero));
    assert.deepStrictEqual(VehiclePaints.look('truck', 'blue'), { color: '#1d4fbf', trim: '#e2e8f0' });
    assert.deepStrictEqual(VehiclePaints.look('impala', 'nope'), VehiclePaints.look('impala', 'red'));
    assert.deepStrictEqual(VehiclePaints.look('bike', 'pink'), { color: '#f472b6', trim: '#fdf2f8' });
    assert.deepStrictEqual(VehiclePaints.look('bus', 'red'), {});
});

test('bikes and scooters include two feminine colors and every ride offers white and black', () => {
    for (const id of VehiclePaints.randomStart) {
        const names = VehiclePaints.options(id).map(p => p.id);
        assert.ok(names.includes('pink') && names.includes('lavender'));
    }
    for (const id of Object.keys(VehiclePaints.paints)) {
        const names = VehiclePaints.options(id).map(p => p.id);
        assert.ok(names.includes('white') && names.includes('black'), id);
        assert.strictEqual(names.length, 6, id);
    }
    assert.ok(VehiclePaints.options('impala').some(p => p.id === 'pink'));
    assert.ok(VehiclePaints.options('truck').some(p => p.id === 'lavender'));
    const seen = new Set();
    for (let i = 0; i < 6; i++) seen.add(VehiclePaints.initial(() => i / 6).bike);
    assert.strictEqual(seen.size, 6);
});

test('the game saves paints and applies them to owned and parked cars', () => {
    const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
    assert.ok(html.includes('<script src="vehicle-paints.js"></script>'));
    assert.ok(html.includes('paints: progress.paints'));
    assert.ok(html.includes('VehiclePaints.restore(data.paints)'));
    assert.ok(html.includes('({ ...rideLook(id), x:p.x'));
    assert.ok(html.includes('Object.assign(ownCar, rideLook(ride.id))'));
    assert.ok(html.includes('data-paint-ride'));
    assert.ok(html.includes("Object.assign(ownCar, VehiclePaints.look('bike', progress.paints.bike))"));
});
