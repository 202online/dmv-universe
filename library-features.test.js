'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Features = require('./library-features.js');
const Data = require('./library-data.js');

test('gaming books cover history and practical development without claiming a single first game', () => {
    const shelves = Data.shelves.filter(s => s.section === 'video-games');
    assert.equal(shelves.length, 2);
    for (const s of shelves) assert.ok(Data.capsules.filter(c => s.categories.includes(c.category)).length >= 6);
    const text = Data.capsules.filter(c => c.category === 'gamedev').map(c => c.fact + c.context).join(' ');
    for (const topic of ['prototype', 'loop', 'art', 'audio', 'testing', 'accessibility'])
        assert.match(text.toLowerCase(), new RegExp(topic));
    assert.match(Data.capsules.find(c => c.id === 'games-tennis').context, /no single uncontested first/);
});

test('featured gaming briefs are short, dated and linked, while gossip is entirely invented', () => {
    assert.ok(Features.gaming.length >= 4);
    assert.ok(Features.gossip.length >= 6);
    for (const a of [...Features.gaming, ...Features.gossip]) {
        assert.ok(Features.words(a) >= 90 && Features.words(a) <= 200, `${a.id}: ${Features.words(a)}`);
        assert.ok(a.paragraphs.length >= 3);
    }
    for (const a of Features.gaming) {
        assert.match(a.date, /^\d{4}-\d{2}-\d{2}$/);
        assert.ok(Date.parse(a.date) < Date.parse('2026-11-10'));
        assert.match(a.source, /^https:\/\//);
    }
    for (const a of Features.gossip) {
        assert.equal(a.source, undefined);
        assert.ok(a.magazine);
        assert.match(a.paragraphs.join(' '), /fictional|invented/i);
    }
    assert.equal(new Set([...Features.gaming, ...Features.gossip].map(a => a.id)).size, Features.gaming.length + Features.gossip.length);
});

test('magazine and gaming features rotate weekly and remain stable during the UTC week', () => {
    for (const list of [Features.gossip, Features.gaming]) {
        const monday = Features.weekly(list, new Date('2026-11-09T00:00:00Z'));
        assert.deepEqual(Features.weekly(list, new Date('2026-11-15T23:59:59Z')), monday);
        assert.notDeepEqual(Features.weekly(list, new Date('2026-11-16T00:00:00Z')), monday);
        assert.equal(new Set(monday.map(a => a.id)).size, 2);
    }
    assert.throws(() => Features.weekly(Features.gossip, new Date('invalid')), /Invalid magazine date/);
});
