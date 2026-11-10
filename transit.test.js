'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Transit = require('./transit.js');
const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');

test('bus loop stops are 4s apart with a 16s farthest trip; train is 70% faster with the same stops', () => {
    assert.equal(Transit.services.train.fare, Transit.services.bus.fare * 2);
    assert.equal(Transit.services.bus.interval, 4000);
    assert.deepEqual(Transit.route('NW', 'SE'), ['NE', 'SE']);
    assert.deepEqual(Transit.route('NE', 'NW'), ['SE', 'SW', 'NW']);
    let max = 0;
    for (const origin of Transit.loop) for (const destination of Transit.loop) {
        if (origin === destination) continue;
        const bus = Transit.duration('bus', origin, destination), train = Transit.duration('train', origin, destination);
        assert.equal(bus, 4000 * (1 + Transit.route(origin, destination).length));
        assert.ok(Math.abs(bus / train - 1.7) < 1e-9);
        max = Math.max(max, bus);
    }
    assert.equal(max, 16000);
    assert.equal(Transit.duration('bus', 'NW', 'NE'), 8000);
});

test('transit status reports platform wait, next stop and arrival countdown', () => {
    const trip = Transit.start('bus', 'NW', 'SW', 2, 1000);
    let s = Transit.status(trip, 2000);
    assert.equal(s.waiting, true); assert.equal(s.boardIn, 3000); assert.equal(s.remaining, 15000); assert.equal(s.arrivesAt, 17000);
    assert.equal(s.nextStop, 'NE');
    s = Transit.status(trip, 9500);
    assert.equal(s.waiting, false); assert.equal(s.passed, 1); assert.equal(s.nextStop, 'SE'); assert.equal(s.remaining, 7500);
    s = Transit.status(trip, 99999);
    assert.equal(s.remaining, 0); assert.equal(s.passed, 3);
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
    assert.ok(Math.abs(Transit.position(restored, 1000 + Transit.duration('train', 'NW', 'SE') / 2) - .5) < 1e-9);
    assert.equal(Transit.position(restored, 1000 + Transit.duration('train', 'NW', 'SE')), 1);
    assert.equal(Transit.position(restored, 10000000), 1);
    assert.throws(() => Transit.position(restored, NaN), /Invalid/);
    assert.match(html, /if \(transitTrip\) return;/);
    assert.doesNotMatch(html.slice(html.indexOf('function switchQuadrant('), html.indexOf('function nearbyTransit(')), /enterQuadrant/);
});
