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

test('modern entertainment archive has separate dated music, sports and TV/film shelves', () => {
    const section = Data.sections.find(s => s.id === 'modern-entertainment');
    assert.match(section.note, /not current headlines or a live feed/);
    const shelves = Data.shelves.filter(s => s.section === section.id);
    assert.equal(shelves.length, 3);
    for (const id of ['modern-music', 'modern-sports', 'modern-screen']) assert.ok(shelves.some(s => s.id === id));
    const cards = Data.capsules.filter(c => shelves.some(s => s.categories.includes(c.category)));
    assert.equal(cards.length, 18);
    for (const card of cards) {
        assert.match(card.era, /^202[1-4]-\d{2}-\d{2}$/);
        assert.ok(Number.isFinite(Date.parse(card.era)));
        assert.ok(httpUrl(card.source));
    }
    assert.ok(cards.some(c => /Commanders/.test(c.fact)));
    assert.ok(cards.some(c => /Ledecky/.test(c.fact)));
});

test('generated books are deterministic per UTC week, readable in 2-4 minutes and change weekly', () => {
    for (const shelf of Data.shelves) {
        const a = Media.shelfBooks(shelf.id, new Date('2026-11-09T00:00:00Z'));
        assert.deepEqual(Media.shelfBooks(shelf.id, new Date('2026-11-15T23:59:59Z')), a);
        for (const book of a) {
            assert.ok(book.minutes >= 2 && book.minutes <= 4, `${book.title}: ${book.words} words`);
            const actualWords = Media.countWords(book.intro) + book.chapters.reduce((sum, c) =>
                sum + Media.countWords(c.heading) + Media.countWords(c.text), 0) +
                book.review.reduce((sum, p) => sum + Media.countWords(p), 0) + Media.countWords(book.closing);
            assert.equal(book.words, actualWords);
            assert.ok(actualWords >= 400 && actualWords <= 800, `${book.title}: actual reading length ${actualWords}`);
            assert.equal(new Set(book.chapters.map(c => c.heading)).size, book.chapters.length);
        }
        const later = Media.shelfBooks(shelf.id, new Date('2026-11-16T00:00:00Z'));
        assert.notDeepEqual(later, a);
        const editions = Array.from({ length: 8 }, (_, week) => Media.shelfBooks(shelf.id,
            new Date(Date.UTC(2026, 10, 9 + week * 7))));
        assert.ok(new Set(editions.map(books => JSON.stringify(books.map(b => [b.chapters, b.review])))).size > 1,
            `${shelf.id}: content and reflection prompts rotate within the finite catalog`);
    }
    assert.throws(() => Media.shelfBooks('missing'), /Unknown shelf/);
});

test('short documentaries run 2-4 minutes and TV clips stay on channel', () => {
    for (const channel of Data.channels) {
        const doc = Media.documentary(channel.id, new Date('2026-03-02T12:00:00Z'));
        assert.ok(doc.seconds >= 120 && doc.seconds <= 240, `${channel.id}: ${doc.seconds}s`);
        let i = 0;
        const seq = [0.01, 0.5, 0.99];
        for (let n = 0; n < 3; n++) {
            const clip = Media.tvClip(channel.id, () => seq[i++ % seq.length]);
            assert.ok(channel.categories.includes(clip.scene.category));
            const next = Media.tvClip(channel.id, () => seq[i++ % seq.length], clip.scene.title);
            assert.notEqual(next.scene.title, clip.scene.title, 'no immediate repeat on TV');
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
        assert.equal(qs.filter(q => q.jurisdiction === j).length, 7);
        assert.equal(qs.filter(q => q.jurisdiction === 'ALL').length, 3);
        assert.ok(qs.every(q => q.jurisdiction === j || (q.jurisdiction === 'ALL' && q.general)),
            'never teach another jurisdiction’s laws as part of this test');
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
        { quizBest: { nope: 5 }, permits: {} }, { quizBest: {}, permits: {}, extra: 1 }, { quizBest: {}, permits: { DC: 5 } },
        { quizBest: {}, permits: { DC: '2026-02-30' } }, { quizBest: {}, permits: { MD: '2025-02-29' } },
        { quizBest: {}, permits: { VA: '2026-13-01' } }])
        assert.equal(Learning.valid(bad), false, JSON.stringify(bad));
    assert.ok(Learning.valid({ quizBest: {}, permits: { DC: '2024-02-29' } }));
    assert.throws(() => Learning.recordQuiz(s, 'not-a-trade', 100), /Invalid quiz/);
    assert.throws(() => Learning.recordQuiz(s, id, 1000), /Invalid quiz/);
    assert.throws(() => Learning.recordPermit(s, 'NY'), /Invalid practice permit/);
    assert.throws(() => Learning.recordPermit(s, 'DC', new Date('bad')), /Invalid practice permit/);
    assert.throws(() => Learning.recordPermit(s, 'DC', new Date('+010000-01-01T00:00:00Z')), /Invalid practice permit/);
});

test('driving questions use precise age and alcohol wording without guessing DC turn-on-red policy', () => {
    const find = id => Learning.data.permitQuestions.find(q => q.id === id);
    const age = find('va-3'), zero = find('dc-3'), turn = find('dc-8');
    assert.equal(age.choices[age.answer], '15 years and 6 months');
    assert.equal(zero.choices[zero.answer], 'Any measurable amount of alcohol');
    assert.match(turn.question, /NO TURN ON RED/);
    assert.doesNotMatch(turn.explanation, /generally allowed/);
    for (const id of ['dc-2', 'md-6', 'va-5']) assert.match(find(id).explanation, /below/);
    const ids = new Set();
    for (const q of Learning.data.permitQuestions) {
        assert.ok(!ids.has(q.id), `duplicate ${q.id}`); ids.add(q.id);
        assert.equal(new Set(q.choices).size, 4, `${q.id}: distinct choices`);
        assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, q.id);
        assert.ok(q.explanation && httpUrl(q.source), q.id);
    }
});

test('career guides remove unsupported salary figures and explain hazardous-work limits', () => {
    for (const trade of Learning.data.trades)
        assert.doesNotMatch(trade.facts.map(f => f.text).join(' '), /\$\d/, `${trade.id}: no unverified pay claims`);
    const facts = id => Learning.data.trades.find(t => t.id === id).facts.map(f => f.text).join(' ');
    assert.match(facts('electrician'), /non-contact voltage tester alone must not/);
    assert.match(facts('hvac'), /do not vent refrigerant or open a pressurized line/);
    assert.match(facts('nursing-assistant'), /body mechanics alone do not/);
    assert.match(facts('culinary'), /1 hour.*90°F/);
});

test('reading and documentary lengths meet actual thresholds across a full year of editions', () => {
    for (let week = 0; week < 52; week++) {
        const date = new Date(Date.UTC(2026, 0, 5 + week * 7));
        for (const shelf of Data.shelves)
            for (const book of Media.shelfBooks(shelf.id, date))
                assert.ok(book.words >= 400 && book.words <= 800, `${shelf.id}, week ${week}: ${book.words}`);
        for (const channel of Data.channels) {
            const doc = Media.documentary(channel.id, date);
            assert.ok(doc.seconds >= 120 && doc.seconds <= 240, `${channel.id}, week ${week}: ${doc.seconds}`);
        }
    }
});

test('chronological scenes recognize month names, eras and pre-colonial history', () => {
    const film = Media.features.find(f => f.channel === 'chocolate-city');
    const position = title => film.scenes.findIndex(s => s.title === title);
    assert.ok(position('The crack cocaine era begins') < position('The homicide peak'));
    const rewind = Media.features.find(f => f.channel === 'news-2000s');
    assert.ok(rewind.scenes.findIndex(s => s.title === 'Attack on the Pentagon') <
        rewind.scenes.findIndex(s => s.title === 'Red Line collision'));
    const freedom = Media.features.find(f => f.channel === 'freedom');
    assert.equal(freedom.scenes[0].title, 'First peoples');
});

test('showtime boundaries and schedules preserve millisecond precision', () => {
    const epoch = Date.UTC(2026, 0, 5), first = Media.features[0];
    for (const ms of [0, 1, 999, first.seconds * 1000 - 1]) {
        const show = Media.nowShowing(new Date(epoch + ms));
        assert.equal(show.startedAt, epoch);
        assert.equal(Media.schedule(new Date(epoch + ms), 1)[0].at.getTime(), epoch + (first.seconds + 60) * 1000);
    }
    const intermission = Media.nowShowing(new Date(epoch + first.seconds * 1000));
    assert.ok(intermission.intermission);
    assert.equal(intermission.nextIn, 60);
    const nextAt = epoch + (first.seconds + 60) * 1000;
    assert.equal(Media.schedule(new Date(nextAt - 1), 1)[0].at.getTime(), nextAt);
    assert.equal(Media.nowShowing(new Date(nextAt)).film.id, Media.features[1].id);
    assert.equal(Media.nowShowing(new Date(epoch - 1)).next.id, first.id);
    assert.throws(() => Media.nowShowing(new Date('invalid')), /Invalid media date/);
});

test('occasional music and play slots share precise showtimes with films and preserve film-only collections', () => {
    const epoch = Date.UTC(2026, 0, 5);
    assert.ok(Media.features.every(f => f.kind === 'film'));
    assert.ok(Media.program.length > Media.features.length);
    assert.ok(Media.performances.some(p => p.kind === 'music'));
    assert.ok(Media.performances.some(p => p.kind === 'play'));
    let offset = 0;
    for (const [i, event] of Media.program.entries()) {
        const beginning = new Date(epoch + offset * 1000);
        const show = Media.nowShowing(beginning);
        assert.equal(show.film.id, event.id);
        assert.equal(show.scene, 0);
        assert.equal(show.sceneElapsed, 0);
        assert.equal(show.startedAt, beginning.getTime());
        const last = Media.nowShowing(new Date(beginning.getTime() + event.seconds * 1000 - 1));
        assert.equal(last.film.id, event.id);
        assert.equal(last.intermission, false);
        const interval = Media.nowShowing(new Date(beginning.getTime() + event.seconds * 1000));
        assert.equal(interval.intermission, true);
        assert.equal(interval.next.id, Media.program[(i + 1) % Media.program.length].id);
        const scheduled = Media.schedule(beginning, Media.program.length);
        assert.equal(scheduled.at(-1).film.id, event.id);
        if (event.kind !== 'film') {
            assert.match(Media.showLabel(event), /Live performance slot.*illustrated preview/);
            assert.match(event.scenes[0].narration, /not a live feed or recording/);
            assert.equal(event.seconds, event.scenes.reduce((n, s) => n + s.seconds, 0));
            const previous = Media.program[i - 1];
            assert.equal(previous.id, event.afterFeature);
            assert.ok(Media.npcChat(event.id, 0, event.kind).every(m => !/grandmother|History class/.test(m.text)));
        }
        offset += event.seconds + 60;
    }
    assert.equal(offset, Media.cycleSeconds);
    assert.equal(Media.nowShowing(new Date(epoch + offset * 1000)).film.id, Media.program[0].id);
});

test('sensitive topics carry notes on bookshelves and individual media scenes', () => {
    for (const category of ['crime', 'news2000s', 'blackhistory', 'native', 'dcblack', 'dmvsports'])
        assert.ok(Media.contentNote([category]), category);
    for (const feature of Media.features)
        for (const scene of feature.scenes)
            assert.equal(scene.content, Media.contentNote([scene.category]));
    assert.doesNotMatch(Media.shelfBooks('gogo')[0].intro, /checked|verified/);
    assert.match(Media.CONTENT_NOTICE, /not had a complete independent fact-check/);
});

test('theater (NW) and DMV (SW) are clear of roads and objects, solid and reachable', () => {
    const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
    const world = html.split('// ---------- World data ----------')[1].split('// ---------- State & input ----------')[0];
    const context = { WORLD: 1600, CityLayout: require('./city-layout.js'), VehicleArt: require('./vehicle-art.js'), TravelArt: require('./travel-art.js') };
    vm.runInNewContext(`${world}\nglobalThis.city = quadrants;`, context);
    for (const [qid, type] of [['NW', 'theater'], ['SW', 'dmv']]) {
        const q = context.city[qid], b = q.buildings.find(x => x.type === type);
        assert.ok(b, type);
        const corners = context.CityLayout.footprint(b).corners.map(([x, y]) => [x - y, x + y]);
        assert.ok(corners.every(([e, s]) => Math.abs(e) > 150 && (s < context.WORLD - 190 || s > context.WORLD + 190) &&
            Math.abs(e) < context.WORLD - 50 && s > 30 && s < 2 * context.WORLD - 30), `${type} clears roads`);
        const overlaps = context.CityLayout.overlaps;
        for (const item of [...q.buildings, ...q.activities, ...q.neighborhood.buildings])
            if (item !== b) assert.equal(overlaps(b, item), false, `${type} overlaps ${item.name || item.kind}`);
        assert.ok(q.solids.some(s => s.x === b.x && s.y === b.y && s.corners));
        const walkable = (x, y) => Math.abs(x - y) < context.WORLD - 20 && x + y > 20 && x + y < 2 * context.WORLD - 20 &&
            !q.solids.some(s => x+9>s.x0&&x-9<s.x1&&y+9>s.y0&&y-9<s.y1&&
                (!s.corners||context.CityLayout.polygonsOverlap([[x-9,y-9],[x+9,y-9],[x+9,y+9],[x-9,y+9]],s.corners)));
        const start = context.WORLD / 2;
        const queue = [[start, start]], seen = new Set([`${start},${start}`]);
        let reachable = false;
        for (let i = 0; i < queue.length && !reachable; i++) {
            const [x, y] = queue[i];
            if (context.CityLayout.distanceTo(b,x,y) < 50) reachable = true;
            for (const [mx, my] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
                const k = `${x + mx},${y + my}`;
                if (!seen.has(k) && walkable(x + mx, y + my)) { seen.add(k); queue.push([x + mx, y + my]); }
            }
        }
        assert.ok(reachable, `${type} reachable`);
    }
});
