'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Transit = require('./transit.js');
const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');

test('bus is between walking and the scooter; train costs twice as much and travels twice as fast', () => {
    const env = { VehicleArt: require('./vehicle-art.js'), TravelArt: require('./travel-art.js') };
    vm.runInNewContext(html.slice(html.indexOf('const vehicles ='), html.indexOf('const ownCar =')) + ';globalThis.rides=vehicles;', env);
    assert.ok(Transit.services.bus.speed > 1);
    assert.ok(Transit.services.bus.speed < env.rides.scooter.speed);
    assert.equal(Transit.services.train.speed, Transit.services.bus.speed * 2);
    assert.equal(Transit.services.train.fare, Transit.services.bus.fare * 2);
    assert.ok(Transit.services.train.speed > env.rides.truck.speed);
    for (const origin of ['NW', 'NE', 'SE', 'SW']) for (const destination of ['NW', 'NE', 'SE', 'SW']) {
        if (origin === destination) continue;
        const bus = Transit.duration('bus', origin, destination), train = Transit.duration('train', origin, destination);
        assert.ok(bus > 20000, 'Journey reflects actual district distances rather than instant travel');
        assert.equal(bus, train * 2);
        assert.equal(bus, Transit.duration('bus', destination, origin));
    }
    assert.equal(Transit.duration('bus', 'NW', 'SE'), Transit.duration('bus', 'NW', 'NE') * 2);
});

test('transit rejects invalid routes and unaffordable fares and restores a paid journey without charging again', () => {
    assert.throws(() => Transit.start('bus', 'NW', 'SE', 1, 1000), /Not enough/);
    assert.throws(() => Transit.start('train', 'NW', 'SE', 3, 1000), /Not enough/);
    assert.throws(() => Transit.start('bus', 'NW', 'NW', 5, 1000), /Invalid/);
    assert.throws(() => Transit.start('taxi', 'NW', 'NE', 5, 1000), /Invalid/);
    assert.equal(Transit.valid({ mode: 'bus', origin: 'NW', destination: 'SE', started: NaN }), false);
    const trip = Transit.start('train', 'NW', 'SE', 4, 1000);
    const restored = JSON.parse(JSON.stringify(trip));
    assert.ok(Transit.valid(restored));
    assert.equal(Transit.position(restored, 0), 0);
    assert.equal(Transit.position(restored, 1000 + Transit.duration('train', 'NW', 'SE') / 2), .5);
    assert.equal(Transit.position(restored, 1000 + Transit.duration('train', 'NW', 'SE')), 1);
    assert.equal(Transit.position(restored, 10000000), 1);
    assert.throws(() => Transit.position(restored, NaN), /Invalid/);
    assert.match(html, /if \(transitTrip\) return;/);
    assert.doesNotMatch(html.slice(html.indexOf('function switchQuadrant('), html.indexOf('function nearbyTransit(')), /enterQuadrant/);
});
