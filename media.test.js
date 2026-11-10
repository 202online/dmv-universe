'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Data = require('./library-data.js');
const Media = require('./media.js');
const Learning = require('./learning.js');

const httpUrl = url => /^https:\/\/[^\s]+$/.test(url);

test('every fact card is cited, sized for reading, and belongs to a used category', () => {
    const ids = new Set(), used = new Set([...Data.shelves, ...Data.channels].flatMap(x => x.categories));
    for (const c of Data.capsules) {
        assert.ok(!ids.has(c.id), `duplicate ${c.id}`); ids.add(c.id);
        for (const key of ['id', 'category', 'era', 'title', 'fact', 'context', 'source']) assert.equal(typeof c[key], 'string', `${c.id}.${key}`);
        assert.ok(httpUrl(c.source), `${c.id} source`);
        const words = Media.countWords(`${c.fact} ${c.context}`);
        assert.ok(words >= 20 && words <= 110, `${c.id}: ${words} words`);
        assert.ok(used.has(c.category), `${c.id} category ${c.category} unused`);
    }
    for (const x of [...Data.shelves, ...Data.channels]) {
        const n = Data.capsules.filter(c => x.categories.includes(c.category)).length;
        assert.ok(n >= 6, `${x.id} has only ${n} cards`);
    }
});

test('Chocolate City aisle covers the requested subjects', () => {
    const shelves = Data.shelves.filter(s => s.section === 'chocolate').map(s => s.id).join(' ');
    for (const topic of ['gogo', 'style', 'crime', 'sports', 'entertainment', 'politics'])
        assert.match(shelves, new RegExp(topic), topic);
    const text = Data.capsules.map(c => `${c.title} ${c.fact}`).join(' ');
    for (const name of ['Chuck Brown', 'Marion Barry', 'Rayful Edmond', 'Len Bias', 'sniper'])
        assert.match(text, new RegExp(name, 'i'), name);
    assert.ok(Data.sections.some(s => s.id === 'news2000s'));
});

test('generated books are deterministic per UTC week, readable in 2-4 minutes and change weekly', () => {
    let changedChapters = 0;
    for (const shelf of Data.shelves) {
        const a = Media.shelfBooks(shelf.id, new Date('2026-11-09T00:00:00Z'));
        assert.deepEqual(Media.shelfBooks(shelf.id, new Date('2026-11-15T23:59:59Z')), a);
        for (const book of a) {
            assert.ok(book.minutes >= 2 && book.minutes <= 4, `${book.title}: ${book.words} words`);
            assert.equal(new Set(book.chapters.map(c => c.heading)).size, book.chapters.length);
        }
        const later = Media.shelfBooks(shelf.id, new Date('2026-11-16T00:00:00Z'));
        assert.notDeepEqual(later, a);
        if (JSON.stringify(later.map(b => b.chapters)) !== JSON.stringify(a.map(b => b.chapters))) changedChapters++;
    }
    assert.equal(changedChapters, Data.shelves.length, 'every shelf reshuffles its chapters weekly');
    assert.throws(() => Media.shelfBooks('missing'), /Unknown shelf/);
});

test('short documentaries run 2-4 minutes and TV clips stay on channel', () => {
    for (const channel of Data.channels) {
        const doc = Media.documentary(channel.id, new Date('2026-03-02T12:00:00Z'));
        assert.ok(doc.seconds >= 100 && doc.seconds <= 260, `${channel.id}: ${doc.seconds}s`);
        let i = 0;
        const seq = [0.01, 0.5, 0.99];
        for (let n = 0; n < 3; n++) {
            const clip = Media.tvClip(channel.id, () => seq[i++ % seq.length]);
            assert.ok(channel.categories.includes(clip.scene.category));
        }
    }
    for (const id of ['gogo-history', 'black-history', 'native-history', 'dc-black-history', 'dmv-history', 'dmv-sports'])
        assert.ok(Data.channels.some(c => c.id === id), id);
});

test('theater showtimes are shared by clock, longer than shorts and loop seamlessly', () => {
    assert.ok(Media.features.length >= 4);
    for (const f of Media.features) assert.ok(f.seconds > 300, `${f.title} ${f.seconds}s`);
    const t = new Date('2026-05-01T18:00:00Z');
    assert.deepEqual(Media.nowShowing(t), Media.nowShowing(new Date(t.getTime())));
    const later = new Date(t.getTime() + Media.cycleSeconds * 1000);
    const a = Media.nowShowing(t), b = Media.nowShowing(later);
    assert.equal(a.film.id, b.film.id); assert.equal(a.scene, b.scene); assert.equal(a.intermission, b.intermission);
    let sawIntermission = false, sawFilm = false;
    for (let s = 0; s < Media.cycleSeconds; s += 7) {
        const now = Media.nowShowing(new Date(t.getTime() + s * 1000));
        if (now.intermission) sawIntermission = true;
        else { sawFilm = true; assert.ok(now.sceneElapsed >= 0 && now.sceneElapsed < now.film.scenes[now.scene].seconds); }
    }
    assert.ok(sawIntermission && sawFilm);
    const next = Media.schedule(t, 3);
    assert.equal(next.length, 3);
    assert.ok(next[0].at > t && next[1].at > next[0].at);
    assert.deepEqual(Media.npcChat('x', 3), Media.npcChat('x', 3));
});

test('film guide entries are original summaries with sources', () => {
    assert.ok(Data.films.length >= 10);
    for (const f of Data.films) {
        assert.ok(f.title && f.category && f.description && f.whyDC);
        assert.ok(httpUrl(f.source), f.title);
        assert.ok(Number.isInteger(f.year));
    }
});

test('trade guides and quizzes are well formed', () => {
    assert.ok(Learning.data.trades.length >= 8);
    for (const t of Learning.data.trades) {
        assert.ok(t.facts.length >= 6 && t.mnemonic && t.icon, t.id);
        t.facts.forEach(f => assert.ok(httpUrl(f.source), `${t.id}: ${f.text}`));
        assert.ok(t.quiz.length >= 5, t.id);
        for (const q of t.quiz) {
            assert.equal(q.choices.length, 4, q.question);
            assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4);
            assert.ok(q.explanation);
        }
    }
    const titles = Learning.data.trades.map(t => t.title).join(' ');
    for (const name of ['Plumb', 'Electric', 'Construction', 'IT']) assert.match(titles, new RegExp(name), name);
});

test('permit tests draw ten valid questions led by the chosen jurisdiction', () => {
    for (const j of Learning.JURISDICTIONS) {
        assert.ok(Learning.data.testFormats[j].summary && httpUrl(Learning.data.testFormats[j].source));
        const qs = Learning.permitTest(j, Math.random);
        assert.equal(qs.length, Learning.PERMIT_QUESTIONS);
        assert.equal(new Set(qs.map(q => q.id)).size, qs.length);
        assert.ok(qs.filter(q => q.jurisdiction === j).length >= 7);
        qs.forEach(q => { assert.equal(q.choices.length, 4); assert.ok(httpUrl(q.source)); });
    }
    const q = Learning.data.permitQuestions[0];
    for (let n = 0; n < 20; n++) {
        const mixed = Learning.shuffleChoices(q);
        assert.equal(mixed.choices[mixed.answer], q.choices[q.answer]);
        assert.deepEqual([...mixed.choices].sort(), [...q.choices].sort());
    }
    const slots = new Set(Array.from({ length: 40 }, () => Learning.shuffleChoices(q).answer));
    assert.ok(slots.size > 1, 'correct answer position varies');
    assert.ok(Learning.passed(8, 10)); assert.ok(!Learning.passed(7, 10));
    assert.throws(() => Learning.permitTest('NY'), /Unknown jurisdiction/);
});

test('learning save data validates and records best scores and permits', () => {
    let s = Learning.initial();
    assert.ok(Learning.valid(s));
    const id = Learning.data.trades[0].id;
    s = Learning.recordQuiz(s, id, 60); s = Learning.recordQuiz(s, id, 40);
    assert.equal(s.quizBest[id], 60);
    s = Learning.recordPermit(s, 'DC', new Date('2026-02-03T10:00:00Z'));
    s = Learning.recordPermit(s, 'DC', new Date('2026-04-03T10:00:00Z'));
    assert.equal(s.permits.DC, '2026-02-03');
    assert.ok(Learning.valid(JSON.parse(JSON.stringify(s))));
    for (const bad of [null, [], { quizBest: {}, permits: { NY: '2026-01-01' } }, { quizBest: { [id]: 101 }, permits: {} },
        { quizBest: { nope: 5 }, permits: {} }, { quizBest: {}, permits: {}, extra: 1 }, { quizBest: {}, permits: { DC: 5 } }])
        assert.equal(Learning.valid(bad), false, JSON.stringify(bad));
});

test('theater (NW) and DMV (SW) are clear of roads and objects, solid and reachable', () => {
    const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
    const world = html.split('// ---------- World data ----------')[1].split('// ---------- State & input ----------')[0];
    const context = { WORLD: 1000 };
    vm.runInNewContext(`${world}\nglobalThis.city = quadrants;`, context);
    for (const [qid, type] of [['NW', 'theater'], ['SW', 'dmv']]) {
        const q = context.city[qid], b = q.buildings.find(x => x.type === type);
        assert.ok(b, type);
        const corners = [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.d], [b.x + b.w, b.y + b.d]].map(([x, y]) => [x - y, x + y]);
        assert.ok(corners.every(([e, s]) => Math.abs(e) > 150 && (s < 810 || s > 1190) && Math.abs(e) < 950 && s > 30 && s < 1970), `${type} clears roads`);
        const overlaps = (a, o) => a.x < o.x + o.w && a.x + a.w > o.x && a.y < o.y + o.d && a.y + a.d > o.y;
        for (const item of [...q.buildings, ...q.activities, ...q.neighborhood.buildings])
            if (item !== b) assert.equal(overlaps(b, item), false, `${type} overlaps ${item.name || item.kind}`);
        assert.ok(q.solids.some(s => s.x0 === b.x && s.y0 === b.y));
        const walkable = (x, y) => Math.abs(x - y) < 980 && x + y > 20 && x + y < 1980 &&
            !q.solids.some(s => x + 9 > s.x0 && x - 9 < s.x1 && y + 9 > s.y0 && y - 9 < s.y1);
        const queue = [[500, 500]], seen = new Set(['500,500']);
        let reachable = false;
        for (let i = 0; i < queue.length && !reachable; i++) {
            const [x, y] = queue[i];
            const dx = Math.max(b.x - x, 0, x - (b.x + b.w)), dy = Math.max(b.y - y, 0, y - (b.y + b.d));
            if (Math.hypot(dx, dy) < 50) reachable = true;
            for (const [mx, my] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
                const k = `${x + mx},${y + my}`;
                if (!seen.has(k) && walkable(x + mx, y + my)) { seen.add(k); queue.push([x + mx, y + my]); }
            }
        }
        assert.ok(reachable, `${type} reachable`);
    }
});
