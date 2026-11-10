'use strict';

// Shared engine for the library's generated nonfiction shelves, short documentaries, home TV channels
// and the theater's synced showtimes. Every generated item is assembled only from cited fact cards in
// LibraryData; generation changes selection and order, never the facts themselves.
const DMVMedia = (() => {
    const data = typeof LibraryData !== 'undefined' ? LibraryData : require('./library-data.js');
    const DAY = 86400000, WEEK = 7 * DAY, EPOCH = Date.UTC(2026, 0, 5);
    const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const countWords = text => String(text).trim().split(/\s+/).filter(Boolean).length;
    function hash(text) {
        let h = 2166136261;
        for (const ch of String(text)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
        return h >>> 0;
    }
    function rng(seed) {
        let a = hash(seed);
        return () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function shuffle(list, seed) {
        const out = [...list], random = rng(seed);
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
    }
    function weekOf(date = new Date()) {
        if (!Number.isFinite(date.getTime())) throw new Error('Invalid media date');
        const week = Math.floor((date.getTime() - EPOCH) / WEEK);
        return { week, date: new Date(EPOCH + week * WEEK).toISOString().slice(0, 10) };
    }
    const cardsFor = categories => data.capsules.filter(c => categories.includes(c.category));
    const byEra = (a, b) => String(a.era).localeCompare(String(b.era), 'en', { numeric: true });
    const cardText = card => `${card.fact} ${card.context}`.trim();

    function makeBook(shelf, index, week) {
        const pool = cardsFor(shelf.categories);
        const random = rng(`${shelf.id}:${week}:${index}`);
        const count = Math.min(pool.length, 5 + Math.floor(random() * 3));
        const picked = shuffle(pool, `${shelf.id}:${week}:${index}:pick`).slice(0, count);
        if (shelf.chronological !== false) picked.sort(byEra);
        const titles = shelf.titles;
        const title = titles[(hash(`${shelf.id}:${week}`) + index) % titles.length];
        const intro = `${shelf.intro} This edition gathers ${picked.length} short chapters. Each chapter is a checked fact card, and the sources are listed at the end so you can keep reading.`;
        const chapters = picked.map(card => ({ heading: `${card.title} (${card.era})`, text: cardText(card), source: card.source }));
        const closing = shelf.closing || 'History is bigger than any short book. Use the sources below to go deeper, and compare more than one account when you can.';
        const words = countWords(intro) + chapters.reduce((sum, c) => sum + countWords(c.heading) + countWords(c.text), 0) + countWords(closing);
        return { id: `${shelf.id}-${week}-${index}`, shelf: shelf.id, title: `${title}, Vol. ${week + 1}${index ? '-' + String.fromCharCode(65 + index) : ''}`,
            intro, chapters, closing, words, minutes: Math.max(2, Math.ceil(words / 200)) };
    }
    function shelfBooks(shelfId, date = new Date(), count = 2) {
        const shelf = data.shelves.find(s => s.id === shelfId);
        if (!shelf) throw new Error('Unknown shelf');
        const { week } = weekOf(date);
        return Array.from({ length: count }, (_, i) => makeBook(shelf, i, week));
    }

    const SCENE_WPS = 2.2;
    const sceneSeconds = text => Math.max(12, Math.round(countWords(text) / SCENE_WPS) + 3);
    function sceneFrom(card) {
        const narration = cardText(card);
        return { title: card.title, era: card.era, narration, source: card.source, category: card.category, seconds: sceneSeconds(narration) };
    }
    function documentary(channelId, date = new Date(), length = 6) {
        const channel = data.channels.find(c => c.id === channelId);
        if (!channel) throw new Error('Unknown channel');
        const { week, date: weekDate } = weekOf(date);
        const picked = shuffle(cardsFor(channel.categories), `doc:${channel.id}:${week}`).slice(0, length).sort(byEra);
        const scenes = picked.map(sceneFrom);
        return { id: `doc-${channel.id}-${week}`, title: `${channel.docTitle}: Week of ${weekDate}`, channel: channel.id, icon: channel.icon,
            scenes, seconds: scenes.reduce((sum, s) => sum + s.seconds, 0) };
    }
    function tvClip(channelId, random = Math.random) {
        const channel = data.channels.find(c => c.id === channelId);
        if (!channel) throw new Error('Unknown channel');
        const pool = cardsFor(channel.categories);
        return { channel, scene: sceneFrom(pool[Math.floor(random() * pool.length) % pool.length]) };
    }

    // Feature films: every card in a channel, in chronological order, played on a shared UTC loop.
    const features = data.channels.filter(c => c.feature).map(c => {
        const scenes = cardsFor(c.categories).sort(byEra).map(sceneFrom);
        return { id: `feature-${c.id}`, title: c.feature, icon: c.icon, channel: c.id, scenes,
            seconds: scenes.reduce((sum, s) => sum + s.seconds, 0) };
    });
    const INTERMISSION = 60;
    const cycleSeconds = features.reduce((sum, f) => sum + f.seconds + INTERMISSION, 0);
    function nowShowing(date = new Date()) {
        if (!Number.isFinite(date.getTime())) throw new Error('Invalid media date');
        let t = Math.floor((date.getTime() - EPOCH) / 1000) % cycleSeconds;
        if (t < 0) t += cycleSeconds;
        const cycleStart = date.getTime() - t * 1000;
        let start = 0;
        for (let i = 0; i < features.length; i++) {
            const film = features[i], end = start + film.seconds;
            if (t < end) {
                let into = t - start, scene = 0;
                while (into >= film.scenes[scene].seconds) { into -= film.scenes[scene].seconds; scene++; }
                return { film, index: i, scene, sceneElapsed: into, filmElapsed: t - start, intermission: false,
                    startedAt: cycleStart + start * 1000 };
            }
            if (t < end + INTERMISSION)
                return { film, index: i, intermission: true, nextIn: end + INTERMISSION - t, next: features[(i + 1) % features.length] };
            start = end + INTERMISSION;
        }
        throw new Error('Showtime overflow');
    }
    function schedule(date = new Date(), count = 4) {
        const now = nowShowing(date), list = [];
        let at = now.intermission ? date.getTime() + now.nextIn * 1000 : now.startedAt + (now.film.seconds + INTERMISSION) * 1000;
        let i = (now.index + 1) % features.length;
        for (let n = 0; n < count; n++) {
            list.push({ film: features[i], at: new Date(at) });
            at += (features[i].seconds + INTERMISSION) * 1000;
            i = (i + 1) % features.length;
        }
        return list;
    }
    const audience = ['Keisha', 'Dre', 'Ms. Pat', 'Marcus', 'Tasha', 'Coach Ray', 'Lil Mike', 'Nia', 'Mr. Johnson', 'Bri'];
    const reactions = ['Never knew that part.', 'My grandmother used to talk about this.', 'Taking notes for real.',
        'That source list is long, I’m checking it later.', 'This is why the city is the city.', 'Put this in schools.',
        'Respect to everybody who lived through that.', 'Ooh, I remember hearing about this.', 'History class could never.',
        'They need a part two.', 'DMV stand up.', 'Wild how much changed.'];
    function npcChat(filmId, scene) {
        const random = rng(`${filmId}:${scene}`), lines = [];
        const n = 1 + Math.floor(random() * 2);
        for (let i = 0; i < n; i++)
            lines.push({ name: audience[Math.floor(random() * audience.length)], text: reactions[Math.floor(random() * reactions.length)], delay: 2 + Math.floor(random() * 8) });
        return lines;
    }

    function sceneCard(scene, icon, extra = '') {
        return `<div class="doc-screen" role="img" aria-label="${escape(scene.title)}"><span class="doc-icon">${icon}</span>
            <span class="doc-era">${escape(scene.era)}</span><strong>${escape(scene.title)}</strong>${extra}</div>
            <p class="doc-narration">${escape(scene.narration)}</p>
            <p class="book-muted">Source: <a href="${escape(scene.source)}" target="_blank" rel="noopener noreferrer">${escape(scene.source)}</a></p>`;
    }
    const running = new Set();
    function stopAll() { for (const stop of [...running]) stop(); }
    const speechOk = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
    function speak(text, on) {
        if (!speechOk()) return;
        window.speechSynthesis.cancel();
        if (on) window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }

    // A self-advancing scene player used by documentaries and TV.
    function player(host, { scenes, icon, title, next, onEnd, footer = '' }) {
        let index = 0, paused = false, remaining = scenes[0].seconds, timer = null, narrate = false, last = Date.now();
        host.innerHTML = `<div class="doc-player"><h3 class="doc-title"></h3><div class="doc-stage" aria-live="polite"></div>
            <div class="doc-progress"><span></span></div>
            <div class="doc-controls"><button type="button" data-doc="prev">⏮ Back</button><button type="button" data-doc="pause">⏸ Pause</button>
            <button type="button" data-doc="next">${next ? '🔀 Next clip' : '⏭ Next'}</button>${speechOk() ? '<button type="button" data-doc="voice">🔈 Narrate: off</button>' : ''}</div>${footer}</div>`;
        const stage = host.querySelector('.doc-stage'), bar = host.querySelector('.doc-progress span');
        function show() {
            const scene = scenes[index];
            host.querySelector('.doc-title').textContent = `${title} · ${index + 1}/${scenes.length}`;
            stage.innerHTML = sceneCard(scene, icon);
            remaining = scene.seconds;
            speak(scene.narration, narrate && !paused);
        }
        function go(step) {
            if (next && step > 0) { scenes[index] = next(); show(); return; }
            if (index + step >= scenes.length) { stop(); if (onEnd) onEnd(); return; }
            index = Math.max(0, index + step);
            show();
        }
        function tick() {
            if (!host.isConnected) return stop();
            const now = Date.now();
            if (!paused) remaining -= (now - last) / 1000;
            last = now;
            bar.style.width = `${Math.min(100, 100 * (1 - remaining / scenes[index].seconds))}%`;
            if (remaining <= 0) go(1);
        }
        function stop() { clearInterval(timer); speak('', false); running.delete(stop); }
        host.querySelectorAll('[data-doc]').forEach(b => b.addEventListener('click', () => {
            const a = b.dataset.doc;
            if (a === 'prev') go(-1);
            if (a === 'next') go(1);
            if (a === 'pause') { paused = !paused; b.textContent = paused ? '▶ Play' : '⏸ Pause'; if (paused) speak('', false); }
            if (a === 'voice') { narrate = !narrate; b.textContent = `🔈 Narrate: ${narrate ? 'on' : 'off'}`; speak(scenes[index].narration, narrate && !paused); }
        }));
        stopAll();
        show();
        timer = setInterval(tick, 250);
        running.add(stop);
        return { stop };
    }

    function renderTV(content, back) {
        let active = null;
        function channelList() {
            if (active) active.stop();
            content.innerHTML = `<div class="sports-game sportsbook library-reader"><h2>📺 Home TV</h2>
                <p>Every channel plays random short clips built from cited DC and DMV fact cards. Flip channels anytime.</p>
                <div class="tv-guide">${data.channels.map((c, i) => `<button type="button" data-channel="${c.id}"><strong>CH ${i + 2}</strong> ${c.icon} ${escape(c.name)}</button>`).join('')}</div>
                <button type="button" id="tv-back">Turn off TV</button></div>`;
            content.querySelectorAll('[data-channel]').forEach(b => b.addEventListener('click', () => watch(b.dataset.channel)));
            content.querySelector('#tv-back').addEventListener('click', back);
        }
        function watch(id) {
            const i = data.channels.findIndex(c => c.id === id), channel = data.channels[i];
            content.innerHTML = `<div class="sports-game sportsbook library-reader tv-frame"><h2>CH ${i + 2} · ${channel.icon} ${escape(channel.name)}</h2>
                <div class="tv-flip"><button type="button" id="tv-down">◀ CH ${i === 0 ? data.channels.length + 1 : i + 1}</button>
                <button type="button" id="tv-guide">Guide</button><button type="button" id="tv-up">CH ${i === data.channels.length - 1 ? 2 : i + 3} ▶</button></div>
                <div id="tv-player"></div></div>`;
            const first = tvClip(id).scene;
            active = player(content.querySelector('#tv-player'), { scenes: [first], icon: channel.icon, title: 'Now playing', next: () => tvClip(id).scene });
            const flip = d => watch(data.channels[(i + d + data.channels.length) % data.channels.length].id);
            content.querySelector('#tv-down').addEventListener('click', () => { active.stop(); flip(-1); });
            content.querySelector('#tv-up').addEventListener('click', () => { active.stop(); flip(1); });
            content.querySelector('#tv-guide').addEventListener('click', channelList);
        }
        channelList();
    }

    function renderTheater(content, back) {
        let timer = null, shownKey = '', chat = [], pending = [];
        const fmt = d => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        content.innerHTML = `<div class="sports-game sportsbook library-reader"><h2>🎬 U Street Picture House</h2>
            <p class="book-muted">Showtimes run on one shared clock, so every player in the city sees the same scene at the same moment. Long-form documentaries are built from cited fact cards.</p>
            <div id="theater-screen"></div>
            <section class="theater-chat" aria-label="Theater chat"><h3>Audience chat</h3><ol id="theater-log" aria-live="polite"></ol>
            <form id="theater-form"><label for="theater-input" class="book-muted">Your message (local only — live multiplayer chat is coming later)</label>
            <div class="theater-send"><input id="theater-input" maxlength="140" autocomplete="off"><button type="submit">Send</button></div></form></section>
            <h3>Coming up</h3><ul id="theater-schedule" class="book-muted"></ul>
            <button type="button" id="theater-back">Leave theater</button></div>`;
        const screen = content.querySelector('#theater-screen'), log = content.querySelector('#theater-log');
        function addChat(name, text, you = false) {
            chat.push({ name, text, you });
            chat = chat.slice(-30);
            log.innerHTML = chat.map(m => `<li${m.you ? ' class="you"' : ''}><strong>${escape(m.name)}:</strong> ${escape(m.text)}</li>`).join('');
            log.scrollTop = log.scrollHeight;
        }
        function update() {
            if (!content.isConnected || !screen.isConnected) return clearInterval(timer);
            const now = new Date(), show = nowShowing(now);
            content.querySelector('#theater-schedule').innerHTML = schedule(now).map(s =>
                `<li>${fmt(s.at)} · ${s.film.icon} ${escape(s.film.title)} (${Math.round(s.film.seconds / 60)} min)</li>`).join('');
            if (show.intermission) {
                const key = `int-${show.index}`;
                if (key !== shownKey) { shownKey = key; screen.innerHTML = `<div class="doc-screen"><span class="doc-icon">🍿</span><strong>Intermission</strong><span class="doc-era">Next: ${escape(show.next.title)}</span></div><p class="doc-narration" id="theater-count"></p>`; }
                const count = screen.querySelector('#theater-count');
                if (count) count.textContent = `Next film starts in ${Math.ceil(show.nextIn)} seconds.`;
                return;
            }
            const film = show.film, scene = film.scenes[show.scene], key = `${film.id}-${show.scene}`;
            if (key !== shownKey) {
                shownKey = key;
                screen.innerHTML = `<h3 class="doc-title">${film.icon} ${escape(film.title)} · Scene ${show.scene + 1}/${film.scenes.length}</h3>${sceneCard(scene, film.icon)}<div class="doc-progress"><span></span></div>`;
                pending = npcChat(film.id, show.scene).map(m => ({ ...m, at: Date.now() + Math.max(0, m.delay - show.sceneElapsed) * 1000 }));
            }
            pending = pending.filter(m => (Date.now() >= m.at ? (addChat(m.name, m.text), false) : true));
            const bar = screen.querySelector('.doc-progress span');
            if (bar) bar.style.width = `${Math.min(100, 100 * show.sceneElapsed / scene.seconds)}%`;
        }
        content.querySelector('#theater-form').addEventListener('submit', e => {
            e.preventDefault();
            const input = content.querySelector('#theater-input'), text = input.value.trim();
            if (!text) return;
            addChat('You', text, true);
            input.value = '';
        });
        content.querySelector('#theater-back').addEventListener('click', () => { clearInterval(timer); back(); });
        addChat('Usher', 'Welcome! Phones on silent, chat stays kind.');
        stopAll();
        const stopTheater = () => { clearInterval(timer); running.delete(stopTheater); };
        update();
        timer = setInterval(update, 500);
        running.add(stopTheater);
    }

    function renderDocumentaries(content, back) {
        let active = null;
        function list() {
            if (active) active.stop();
            const docs = data.channels.map(c => documentary(c.id));
            content.innerHTML = `<div class="sports-game sportsbook library-reader"><h2>🎞️ Short Documentaries</h2>
                <p>Original 2–4 minute documentaries assembled weekly from cited fact cards. New cuts arrive every Monday (UTC).</p>
                ${docs.map(d => `<article class="book-card"><h3>${d.icon} ${escape(d.title)}</h3><p>${d.scenes.length} scenes · about ${Math.max(2, Math.round(d.seconds / 60))} min</p>
                <button type="button" data-doc-open="${d.channel}">Watch</button></article>`).join('')}
                <details class="book-card"><summary><strong>🎬 DC film guide</strong> — real movies and docs to look for</summary>
                <p class="book-muted">Original summaries only. These titles are not streamed here; check your library or streaming services.</p>
                ${data.films.map(f => `<p><strong>${escape(f.title)}</strong> (${f.year}) · ${escape(f.category)}<br>${escape(f.description)} <em>${escape(f.whyDC)}</em></p>`).join('')}</details>
                <p class="book-muted">Longer feature documentaries play on a shared schedule at the U Street Picture House in NW.</p>
                <button type="button" id="doc-back">Back to library</button></div>`;
            content.querySelectorAll('[data-doc-open]').forEach(b => b.addEventListener('click', () => watch(b.dataset.docOpen)));
            content.querySelector('#doc-back').addEventListener('click', back);
        }
        function watch(id) {
            const doc = documentary(id);
            content.innerHTML = `<div class="sports-game sportsbook library-reader"><h2>${doc.icon} ${escape(doc.title)}</h2><div id="doc-host"></div>
                <button type="button" id="doc-list">Back to documentaries</button></div>`;
            active = player(content.querySelector('#doc-host'), { scenes: doc.scenes, icon: doc.icon, title: 'Scene', onEnd: list });
            content.querySelector('#doc-list').addEventListener('click', list);
        }
        list();
    }

    return { data, hash, rng, shuffle, weekOf, shelfBooks, documentary, tvClip, features, cycleSeconds, nowShowing, schedule,
        npcChat, stopAll, sceneSeconds, countWords, escape, renderTV, renderTheater, renderDocumentaries };
})();

if (typeof module !== 'undefined') module.exports = DMVMedia;
