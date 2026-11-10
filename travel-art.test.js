'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const TravelArt = require('./travel-art.js');

test('travel cards are unique original illustrations with captions', () => {
    const ids = TravelArt.cards.map(c => c.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.length >= 10);
    for (const card of TravelArt.cards) {
        const svg = TravelArt.svg(card.id);
        assert.match(svg, /^<svg viewBox="0 0 320 180" role="img" aria-label="Original illustration: /);
        assert.ok(card.title && card.caption.length > 30);
        assert.doesNotMatch(svg, /<image|https?:\/\/(?!www\.w3\.org)|url\(#g\)/);
        assert.equal((svg.match(/<svg/g) || []).length, (svg.match(/<\/svg>/g) || []).length);
        assert.doesNotMatch(svg, /NaN|undefined/);
    }
    assert.throws(() => TravelArt.svg('missing'), /Unknown travel art card/);
});

test('card rotation is deterministic per trip and survives reloads', () => {
    const trip = { mode: 'train', origin: 'NW', destination: 'SE', started: 1000 };
    const first = TravelArt.cardAt(trip, 1000);
    assert.equal(TravelArt.cardAt(trip, 1000 + TravelArt.INTERVAL - 1), first);
    const next = TravelArt.cardAt(trip, 1000 + TravelArt.INTERVAL);
    assert.notEqual(next, first);
    assert.equal(TravelArt.cardAt({ ...trip }, 1000 + TravelArt.INTERVAL), next);
    const seen = new Set();
    for (let i = 0; i < TravelArt.cards.length; i++) seen.add(TravelArt.cardAt(trip, 1000 + i * TravelArt.INTERVAL).id);
    assert.equal(seen.size, TravelArt.cards.length);
    assert.equal(TravelArt.cardAt(trip, 0), first);
    assert.throws(() => TravelArt.cardAt(null, 0), /Invalid travel art time/);
});

test('every quadrant has three distinct street billboards', () => {
    const all = [];
    for (const q of ['NW', 'NE', 'SE', 'SW']) {
        const cards = TravelArt.billboards(q);
        assert.equal(cards.length, 3);
        all.push(...cards.map(c => c.id));
    }
    assert.equal(new Set(all).size, all.length);
    assert.throws(() => TravelArt.billboards('XX'), /Unknown quadrant/);
});

test('game loads travel art after city art and wires the metro gallery', () => {
    const html = fs.readFileSync(require.resolve('./index.html'), 'utf8');
    assert.ok(html.indexOf('src="city-art.js"') < html.indexOf('src="travel-art.js"'));
    assert.match(html, /id="metro-gallery"/);
    assert.match(html, /prefers-reduced-motion: reduce\) \{ #metro-gallery::before/);
    assert.match(html, /TravelArt\.drawBillboard/);
});
