'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Art = require('./city-art.js');
const { U } = require('./mg-core.js');
const Progression = require('./mg-progression.js');
const Interiors = require('./interiors.js');

test('all games and interiors have original named DC tribute artwork and city murals', () => {
    for (const key of [...Progression.games, ...Object.keys(Interiors.rooms)]) {
        const t = Art.theme(key), gallery = Art.gallery(key), mural = Art.mural(key);
        assert.equal(t.people.length, 2);
        assert.match(gallery, /Original stylized tributes, not photos or endorsements/);
        assert.match(mural, /CHOCOLATE CITY/);
        for (const id of t.people) {
            assert.ok(Art.legends[id].note);
            assert.match(Art.portrait(id), /role="img"/);
            assert.ok(gallery.includes(Art.legends[id].name.replaceAll("'", '&#39;')));
        }
        assert.doesNotMatch(gallery + mural, /https?:|<image|<script/);
    }
    assert.throws(() => Art.theme('missing'), /Unknown/);
});

test('every game lobby renders finite original portrait and venue geometry', () => {
    const noop = () => {};
    const c = new Proxy({}, { get: (target, key) => key in target ? target[key] : (...args) => {
        args.filter(a => typeof a === 'number').forEach(n => assert.ok(Number.isFinite(n), `${key}: ${n}`));
        if (key === 'createLinearGradient') return { addColorStop: noop };
    } });
    for (const key of Progression.games) Art.drawLobby(c, key, U);
});

test('art dependencies load before consumers and vehicle price/speed ratios are exact', () => {
    const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
    for (const consumer of ['casino.js', 'interiors.js', 'mg-core.js'])
        assert.ok(html.indexOf('src="city-art.js"') < html.indexOf(`src="${consumer}"`));
    const source = html.slice(html.indexOf('const vehicles ='), html.indexOf('const ownCar ='));
    const env = { VehicleArt: require('./vehicle-art.js'), TravelArt: require('./travel-art.js') };
    vm.runInNewContext(`${source}\nglobalThis.rides = vehicles;`, env);
    assert.equal(env.rides.impala.name, 'the Bucket');
    assert.equal(env.rides.truck.price, Math.round(env.rides.impala.price * 1.15));
    assert.ok(Math.abs(env.rides.truck.speed / env.rides.impala.speed - 1.1) < 1e-12);
});
