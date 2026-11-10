'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Library = require('./library.js');

test('all six original stories meet the requested two-to-four minute reading length', () => {
    assert.equal(Library.stories.length, 6);
    assert.equal(new Set(Library.stories.map(s => s.id)).size, 6);
    for (const story of Library.stories) {
        assert.ok(Library.words(story) >= 400 && Library.words(story) <= 800, `${story.title}: ${Library.words(story)} words`);
        assert.ok(Library.minutes(story) >= 2 && Library.minutes(story) <= 4);
        assert.ok(story.paragraphs.length >= 5);
    }
});

test('weekly shelf stays stable during the UTC week and rotates at Monday midnight', () => {
    const monday = Library.shelf(new Date('2026-11-09T00:00:00Z'));
    assert.deepEqual(Library.shelf(new Date('2026-11-15T23:59:59Z')), monday);
    assert.notDeepEqual(Library.shelf(new Date('2026-11-16T00:00:00Z')).stories, monday.stories);
    assert.equal(monday.date, '2026-11-09');
    assert.equal(new Set(monday.stories.map(s => s.id)).size, 3);
    assert.equal(Library.shelf(new Date('2026-11-08T19:00:00-05:00')).date, monday.date);
    const featured = new Set();
    for (let week = 0; week < 6; week++)
        Library.shelf(new Date(Date.UTC(2026, 10, 9 + week * 7))).stories.forEach(s => featured.add(s.id));
    assert.equal(featured.size, Library.stories.length);
    assert.equal(Library.shelf(new Date('2025-01-01')).stories.length, 3);
    assert.throws(() => Library.shelf(new Date('invalid')), /Invalid library date/);
});

test('SE library clears roads and other destinations, is solid, and has a walkable approach from the crossroads', () => {
    const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
    const world = html.split('// ---------- World data ----------')[1].split('// ---------- State & input ----------')[0];
    const context = { WORLD: 1000, CityLayout: require('./city-layout.js'), VehicleArt: require('./vehicle-art.js') };
    vm.runInNewContext(`${world}\nglobalThis.city = quadrants;`, context);
    const q = context.city.SE, library = q.buildings.find(b => b.type === 'library');
    assert.ok(library);
    assert.ok(library.x + library.w - library.y < -130);
    assert.ok(library.x + library.y > 1170);
    const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.d && a.y + a.d > b.y;
    for (const item of [...q.buildings, ...q.activities, ...q.neighborhood.buildings])
        if (item !== library) assert.equal(overlaps(library, item), false, `Overlaps ${item.name || item.kind}`);
    assert.ok(q.solids.some(s => s.x0 === library.x && s.y0 === library.y));
    const walkable = (x, y) => Math.abs(x - y) < 980 && x + y > 20 && x + y < 1980 &&
        !q.solids.some(s => x + 9 > s.x0 && x - 9 < s.x1 && y + 9 > s.y0 && y - 9 < s.y1);
    const queue = [[500, 500]], visited = new Set(['500,500']);
    let reachable = false;
    for (let i = 0; i < queue.length; i++) {
        const [x, y] = queue[i];
        if (x >= library.x && x <= library.x + library.w && y > library.y + library.d &&
            y < library.y + library.d + 50) { reachable = true; break; }
        for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
            const key = `${x + dx},${y + dy}`;
            if (!visited.has(key) && walkable(x + dx, y + dy)) { visited.add(key); queue.push([x + dx, y + dy]); }
        }
    }
    assert.ok(reachable, 'Player can walk from the crossroads to interaction range');
});
