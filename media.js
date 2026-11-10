'use strict';

// Shared engine for the library's generated nonfiction shelves, short documentaries, home TV channels
// and the theater's synced showtimes. Nonfiction is assembled only from cited LibraryData cards;
// the separate stage program contains explicitly fictional illustrated previews.
const DMVMedia = (() => {
    const data = typeof LibraryData !== 'undefined' ? LibraryData : require('./library-data.js');
    const stageProgram = typeof TheaterProgram !== 'undefined' ? TheaterProgram : require('./theater-program.js');
    const DAY = 86400000, WEEK = 7 * DAY, EPOCH = Date.UTC(2026, 0, 5);
    const CONTENT_NOTICE = 'Educational summaries, not live reporting. Sources are linked for further reading; this collection has not had a complete independent fact-check. Confirm details with the linked institutions and current official guidance.';
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
    const eraYear = era => {
        if (/thousands/i.test(era)) return -20000;
        if (era === 'Always') return -10000;
        const year = String(era).match(/\d{4}/);
        return year ? Number(year[0]) - (/^Before /i.test(era) ? 1 : 0) : 0;
    };
    const byEra = (a, b) => eraYear(a.era) - eraYear(b.era) || a.id.localeCompare(b.id);
    const cardText = card => `${card.fact} ${card.context}`.trim();
    const contentNote = categories => [...new Set(categories.map(c => data.contentNotes[c]).filter(Boolean))].join(' ');

    function makeBook(shelf, index, week) {
        const pool = cardsFor(shelf.categories);
        const random = rng(`${shelf.id}:${week}:${index}`);
        const count = Math.min(pool.length, 5 + Math.floor(random() * 3));
        const ordered = shuffle(pool, `${shelf.id}:${week}:${index}:pick`);
        const picked = ordered.slice(0, count);
        const titles = shelf.titles;
        const title = titles[(hash(`${shelf.id}:${week}`) + index) % titles.length];
        const closing = shelf.closing || 'History is bigger than any short book. Use the sources below to go deeper, and compare more than one account when you can.';
        const focus = ordered[0];
        const review = [
            `Memory check: without looking back, describe "${focus.title}" in your own words. Name the people or communities involved, place the story in its era, and explain one detail that you want to remember.`,
            'Connect the chapters: choose two events or ideas from this edition. What connects them, and what makes them different? Separate what the text actually says from your interpretation. Reopen the relevant chapters to check your answer.',
            'Read beyond this book: follow one source below. Who created it, which evidence does it use, and whose perspective might be missing? Write down one question for a librarian or teacher, rather than assuming this short introduction tells the whole story.'
        ];
        const makeIntro = () => `${shelf.intro} This edition gathers ${picked.length} short chapters from a finite collection of cited fact cards. Sources and reflection questions are included so you can keep learning.`;
        const wordTotal = () => countWords(makeIntro()) + picked.reduce((sum, c) => sum + countWords(`${c.title} (${c.era}) ${cardText(c)}`), 0) +
            countWords(closing) + review.reduce((sum, p) => sum + countWords(p), 0);
        while (wordTotal() < 400 && picked.length < ordered.length) picked.push(ordered[picked.length]);
        if (shelf.chronological !== false) picked.sort(byEra);
        const intro = makeIntro(), words = wordTotal();
        const chapters = picked.map(card => ({ heading: `${card.title} (${card.era})`, text: cardText(card), source: card.source }));
        return { id: `${shelf.id}-${week}-${index}`, shelf: shelf.id, title: `${title}, Vol. ${week + 1}${index ? '-' + String.fromCharCode(65 + index) : ''}`,
            intro, chapters, review, closing, words, minutes: Math.ceil(words / 200) };
    }
    function shelfBooks(shelfId, date = new Date(), count = 2) {
        const shelf = data.shelves.find(s => s.id === shelfId);
        if (!shelf) throw new Error('Unknown shelf');
        const { week } = weekOf(date);
        return Array.from({ length: count }, (_, i) => makeBook(shelf, i, week));
    }

    const SCENE_WPS = 2.2;
    const sceneSeconds = text => Math.max(20, Math.round(countWords(text) / SCENE_WPS) + 3);
    function sceneFrom(card) {
        const narration = cardText(card);
        return { title: card.title, era: card.era, narration, source: card.source, category: card.category,
            content: contentNote([card.category]), seconds: sceneSeconds(narration) };
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
    function tvClip(channelId, random = Math.random, previousTitle) {
        const channel = data.channels.find(c => c.id === channelId);
        if (!channel) throw new Error('Unknown channel');
        const cards = cardsFor(channel.categories), pool = cards.filter(c => c.title !== previousTitle);
        return { channel, scene: sceneFrom(pool[Math.floor(random() * pool.length) % pool.length]) };
    }

    // Feature films: every card in a channel, in chronological order, played on a shared UTC loop.
    const features = data.channels.filter(c => c.feature).map(c => {
        const scenes = cardsFor(c.categories).sort(byEra).map(sceneFrom);
        return { id: `feature-${c.id}`, title: c.feature, icon: c.icon, channel: c.id, kind: 'film', scenes,
            seconds: scenes.reduce((sum, s) => sum + s.seconds, 0) };
    });
    const performances = stageProgram.map(event => {
        if (!features.some(f => f.id === event.afterFeature) || !['music', 'play'].includes(event.kind) ||
            !event.id || !event.title || !event.scenes.length ||
            event.scenes.some(s => !s.title || !s.narration || !Number.isFinite(s.seconds) || s.seconds <= 0))
            throw new Error(`Invalid theater performance: ${event.id}`);
        return { ...event, seconds: event.scenes.reduce((sum, scene) => sum + scene.seconds, 0) };
    });
    const program = features.flatMap(film => [film, ...performances.filter(p => p.afterFeature === film.id)]);
    if (new Set(program.map(event => event.id)).size !== program.length) throw new Error('Duplicate theater program ID');
    const showLabel = event => event.kind === 'film' ? 'Film' :
        `Live performance slot - ${event.kind === 'music' ? 'music' : 'play'} (illustrated preview)`;
    const INTERMISSION = 60;
    const cycleSeconds = program.reduce((sum, f) => sum + f.seconds + INTERMISSION, 0);
    function nowShowing(date = new Date()) {
        if (!Number.isFinite(date.getTime())) throw new Error('Invalid media date');
        let t = ((date.getTime() - EPOCH) / 1000) % cycleSeconds;
        if (t < 0) t += cycleSeconds;
        const cycleStart = date.getTime() - t * 1000;
        let start = 0;
        for (let i = 0; i < program.length; i++) {
            const film = program[i], end = start + film.seconds;
            if (t < end) {
                let into = t - start, scene = 0;
                while (into >= film.scenes[scene].seconds) { into -= film.scenes[scene].seconds; scene++; }
                return { film, index: i, scene, sceneElapsed: into, filmElapsed: t - start, intermission: false,
                    startedAt: cycleStart + start * 1000 };
            }
            if (t < end + INTERMISSION)
                return { film, index: i, intermission: true, nextIn: end + INTERMISSION - t, next: program[(i + 1) % program.length] };
            start = end + INTERMISSION;
        }
        throw new Error('Showtime overflow');
    }
    function schedule(date = new Date(), count = 4) {
        const now = nowShowing(date), list = [];
        let at = now.intermission ? date.getTime() + now.nextIn * 1000 : now.startedAt + (now.film.seconds + INTERMISSION) * 1000;
        let i = (now.index + 1) % program.length;
        for (let n = 0; n < count; n++) {
            list.push({ film: program[i], at: new Date(at) });
            at += (program[i].seconds + INTERMISSION) * 1000;
            i = (i + 1) % program.length;
        }
        return list;
    }
    const audience = ['Keisha', 'Dre', 'Ms. Pat', 'Marcus', 'Tasha', 'Coach Ray', 'Lil Mike', 'Nia', 'Mr. Johnson', 'Bri'];
    const reactions = ['Never knew that part.', 'My grandmother used to talk about this.', 'Taking notes for real.',
        'That source list is long, I’m checking it later.', 'This is why the city is the city.', 'Put this in schools.',
        'Respect to everybody who lived through that.', 'Ooh, I remember hearing about this.', 'History class could never.',
        'They need a part two.', 'DMV stand up.', 'Wild how much changed.'];
    function npcChat(filmId, scene, kind = 'film') {
        const random = rng(`${filmId}:${scene}`), lines = [];
        const comments = kind === 'film' ? reactions : [
            'That fictional stage manager needs their own show.', 'Love the curtain and lights.',
            'This illustrated preview has me ready for a real performance.', 'Front row for the imaginary curtain call!'];
        const n = 1 + Math.floor(random() * 2);
        for (let i = 0; i < n; i++)
            lines.push({ name: audience[Math.floor(random() * audience.length)], text: comments[Math.floor(random() * comments.length)], delay: 2 + Math.floor(random() * 8) });
        return lines;
    }

    function sceneCard(scene, icon, extra = '') {
        return `${scene.content ? `<p class="book-warning">${escape(scene.content)}</p>` : ''}
            <div class="doc-screen"><span class="doc-icon" aria-hidden="true">${icon}</span>
            <span class="doc-era">${escape(scene.era)}</span><strong>${escape(scene.title)}</strong>${extra}</div>
            <p class="doc-narration">${escape(scene.narration)}</p>
            <p class="book-muted">Source: <a href="${escape(scene.source)}" target="_blank" rel="noopener noreferrer">${escape(scene.source)}</a></p>`;
    }
    function stageCard(scene, kind, sceneIndex) {
        const performers = kind === 'music' ?
            '<ellipse cx="70" cy="127" rx="25" ry="12" fill="#c79351"/><path d="M45 127v31h50v-31" fill="#914c2d"/><path d="M174 103v65m-10 0h20" stroke="#cbd5e1" stroke-width="4"/><circle cx="174" cy="98" r="7" fill="#e2e8f0"/><path d="M225 116h68v16h-68zm10 16v31m49-31v31" stroke="#d9cbba" stroke-width="4" fill="#263e56"/>' :
            '<path d="M147 133h27v7h-27zm3 7v25m21-25v25m-24-32v-26h27v26" stroke="#ccb089" stroke-width="5"/><path d="M214 135h35v27h-35z" fill="#a16b41"/><path d="M220 137h23v4h-23" stroke="#fff1d2" stroke-width="3"/>';
        return `<div class="doc-screen stage-screen"><svg viewBox="0 0 340 190" aria-hidden="true" focusable="false">
            <path d="M0 0h340v190H0z" fill="#171427"/><path d="M0 161h340v29H0z" fill="#805435"/>
            <path d="M70 0l-35 161h115zm200 0-80 161h115z" fill="${sceneIndex % 2 ? '#f5c872' : '#9ad9ef'}" opacity=".18"/>
            ${[95, 235].map((x, i) => `<circle cx="${x}" cy="77" r="12" fill="${i ? '#b17e59' : '#865539'}"/><path d="M${x - 13} 92h26v40h-26z" fill="${i ? '#6598b7' : '#b14d69'}"/><path d="M${x - 7} 132v31m14-31v31" stroke="#d5d8d8" stroke-width="6"/>`).join('')}
            ${performers}</svg><strong>${escape(scene.title)}</strong></div>
            <p class="doc-narration">${escape(scene.narration)}</p>
            <p class="book-muted">Original fictional stage preview. No live feed, performance recording or musical audio.</p>`;
    }
    const running = new Set();
    function stopAll() { for (const stop of [...running]) stop(); }
    const speechOk = () => typeof window !== 'undefined' && !!window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined';
    function speak(text, on, onError) {
        if (!speechOk()) return;
        window.speechSynthesis.cancel();
        if (on) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onerror = event => {
                if (!['canceled', 'interrupted'].includes(event.error) && onError) onError(event.error);
            };
            window.speechSynthesis.speak(utterance);
        }
    }

    // A self-advancing scene player used by documentaries and TV.
    function player(host, { scenes, icon, title, next, footer = '' }) {
        let index = 0, paused = false, remaining = scenes[0].seconds, timer = null, narrate = false, last = Date.now(), ended = false;
        const history = [...scenes];
        host.innerHTML = `<div class="doc-player"><h3 class="doc-title"></h3><div class="doc-stage" aria-live="polite"></div>
            <div class="doc-progress" role="progressbar" aria-label="Scene progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>
            <p class="book-muted" data-doc-status role="status"></p>
            <div class="doc-controls"><button type="button" data-doc="prev">⏮ Back</button><button type="button" data-doc="pause">⏸ Pause</button>
            <button type="button" data-doc="next">${next ? '🔀 Next clip' : '⏭ Next'}</button>${speechOk() ? '<button type="button" data-doc="voice" aria-pressed="false">🔈 Narrate: off</button>' : ''}</div>${footer}</div>`;
        const stage = host.querySelector('.doc-stage'), bar = host.querySelector('.doc-progress span');
        const pauseButton = host.querySelector('[data-doc="pause"]'), nextButton = host.querySelector('[data-doc="next"]');
        function narrationError() {
            if (!stage.isConnected) return;
            narrate = false;
            const voice = host.querySelector('[data-doc="voice"]');
            if (voice) { voice.textContent = '🔈 Narrate: off'; voice.setAttribute('aria-pressed', 'false'); }
            host.querySelector('[data-doc-status]').textContent = 'Browser narration is unavailable. You can still read every scene and use the playback controls.';
        }
        function progress() {
            const value = Math.max(0, Math.min(100, 100 * (1 - remaining / history[index].seconds)));
            bar.style.width = `${value}%`;
            bar.parentElement.setAttribute('aria-valuenow', String(Math.round(value)));
        }
        function show() {
            const scene = history[index];
            host.querySelector('.doc-title').textContent = `${title} · ${index + 1}${next ? '' : '/' + history.length}`;
            stage.innerHTML = sceneCard(scene, icon);
            remaining = scene.seconds;
            last = Date.now();
            ended = false;
            nextButton.disabled = false;
            pauseButton.textContent = paused ? '▶ Play' : '⏸ Pause';
            pauseButton.setAttribute('aria-pressed', String(paused));
            host.querySelector('[data-doc="prev"]').disabled = index === 0;
            host.querySelector('[data-doc-status]').textContent = '';
            progress();
            speak(scene.narration, narrate && !paused, narrationError);
        }
        function go(step) {
            if (step > 0 && next && index === history.length - 1) {
                history.push(next(history[index]));
                if (history.length > 30) { history.shift(); index--; }
            }
            if (index + step >= history.length) {
                ended = true; paused = true; remaining = 0;
                pauseButton.textContent = '↻ Replay';
                pauseButton.setAttribute('aria-pressed', 'true');
                nextButton.disabled = true;
                host.querySelector('[data-doc-status]').textContent = 'Documentary complete. Replay it, revisit a scene, or return to the movie room.';
                progress();
                speak('', false);
                return;
            }
            index = Math.max(0, index + step);
            show();
        }
        function tick() {
            if (!host.isConnected || !stage.isConnected) return stop();
            const now = Date.now();
            if (!paused) remaining -= (now - last) / 1000;
            last = now;
            progress();
            if (!paused && remaining <= 0) go(1);
        }
        function stop() {
            clearInterval(timer); speak('', false);
            document.removeEventListener('visibilitychange', visibility);
            running.delete(stop);
        }
        function visibility() {
            if (document.hidden && !paused) {
                paused = true;
                pauseButton.textContent = '▶ Play';
                pauseButton.setAttribute('aria-pressed', 'true');
                host.querySelector('[data-doc-status]').textContent = 'Paused while this tab is in the background.';
                speak('', false);
            }
            last = Date.now();
        }
        host.querySelectorAll('[data-doc]').forEach(b => b.addEventListener('click', () => {
            const a = b.dataset.doc;
            if (a === 'prev') go(-1);
            if (a === 'next') go(1);
            if (a === 'pause') {
                if (ended) { index = 0; paused = false; show(); }
                else {
                    paused = !paused; last = Date.now();
                    b.textContent = paused ? '▶ Play' : '⏸ Pause';
                    b.setAttribute('aria-pressed', String(paused));
                    host.querySelector('[data-doc-status]').textContent = '';
                    speak(history[index].narration, narrate && !paused, narrationError);
                }
            }
            if (a === 'voice') {
                narrate = !narrate; b.textContent = `🔈 Narrate: ${narrate ? 'on' : 'off'}`;
                b.setAttribute('aria-pressed', String(narrate));
                speak(history[index].narration, narrate && !paused, narrationError);
            }
        }));
        stopAll();
        show();
        timer = setInterval(tick, 250);
        document.addEventListener('visibilitychange', visibility);
        running.add(stop);
        return { stop };
    }

    function renderTV(content, back) {
        let active = null;
        function channelList() {
            if (active) active.stop();
            content.innerHTML = `<div class="sports-game sportsbook library-reader"><h2>📺 Home TV</h2>
                <p>Every channel plays illustrated reading clips, with optional browser narration. These are not streamed video footage. Flip channels anytime.</p>
                <p class="book-muted">${escape(CONTENT_NOTICE)}</p>
                <div class="tv-guide">${data.channels.map((c, i) => `<button type="button" data-channel="${c.id}"><strong>CH ${i + 2}</strong> ${c.icon} ${escape(c.name)}${contentNote(c.categories) ? `<small>${escape(contentNote(c.categories))}</small>` : ''}</button>`).join('')}</div>
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
            active = player(content.querySelector('#tv-player'), { scenes: [first], icon: channel.icon, title: 'Clip', next: previous => tvClip(id, Math.random, previous.title).scene });
            const flip = d => watch(data.channels[(i + d + data.channels.length) % data.channels.length].id);
            content.querySelector('#tv-down').addEventListener('click', () => { active.stop(); flip(-1); });
            content.querySelector('#tv-up').addEventListener('click', () => { active.stop(); flip(1); });
            content.querySelector('#tv-guide').addEventListener('click', channelList);
        }
        channelList();
    }

    function renderTheater(content, back, onMode = () => {}) {
        let timer = null, shownKey = '', pending = [], reading = false, narrate = false;
        let presentation = '';
        const fmt = d => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        content.innerHTML = `<div class="sports-game sportsbook library-reader"><h2>🎬 U Street Picture House</h2>
            <p class="book-muted">Cinema screenings + occasional stage previews. Illustrated scenes only, not streamed video or a live feed.</p>
            <details class="theater-info"><summary>About this program & showtimes</summary>
                <p class="book-muted">Films are illustrated reading documentaries. Music and plays are original fictional previews until performances are added. The schedule follows your device clock, not a live connection between players.</p>
                <p class="book-muted">${escape(CONTENT_NOTICE)}</p></details>
            <div class="doc-controls"><button type="button" id="theater-reading" aria-pressed="false">Pause to read</button>
            ${speechOk() ? '<button type="button" id="theater-voice" aria-pressed="false">🔈 Narrate: off</button>' : ''}</div>
            <p id="theater-status" class="book-muted" role="status">Following the shared showtime.</p>
            <section class="theater-auditorium" data-mode="film" aria-label="Theater auditorium">
                <p id="theater-marquee" class="theater-marquee" role="status"></p>
                <div id="theater-screen"></div><div class="theater-seat-rows" aria-hidden="true"></div></section>
            <section class="theater-chat" aria-label="Local theater chat"><h3>Local audience chat</h3>
            <p class="book-muted">NPCs are scripted characters, not real people. Your messages stay in this visit and are not sent to anyone.</p>
            <ol id="theater-log" role="log" aria-live="polite" aria-relevant="additions"></ol>
            <form id="theater-form"><label for="theater-input" class="book-muted">Your message (140 characters maximum)</label>
            <div class="theater-send"><input id="theater-input" maxlength="140" autocomplete="off" required><button type="submit">Send</button></div></form></section>
            <h3>Coming up (your local time)</h3><ul id="theater-schedule" class="book-muted"></ul>
            <button type="button" id="theater-back">Leave theater</button></div>`;
        const screen = content.querySelector('#theater-screen'), log = content.querySelector('#theater-log');
        const auditorium = content.querySelector('.theater-auditorium');
        function narrationError() {
            if (!screen.isConnected) return;
            narrate = false;
            const voice = content.querySelector('#theater-voice');
            if (voice) { voice.textContent = '🔈 Narrate: off'; voice.setAttribute('aria-pressed', 'false'); }
            content.querySelector('#theater-status').textContent = 'Browser narration is unavailable. All scene text remains readable; use Pause to read if needed.';
        }
        function addChat(name, text, you = false) {
            const item = document.createElement('li');
            if (you) item.className = 'you';
            const label = document.createElement('strong');
            label.textContent = `${name}${you ? '' : ' (NPC)'}: `;
            item.append(label, document.createTextNode(text));
            log.append(item);
            while (log.children.length > 30) log.firstElementChild.remove();
            log.scrollTop = log.scrollHeight;
        }
        function update() {
            if (!content.isConnected || !screen.isConnected) return stopTheater();
            const now = new Date(), show = nowShowing(now);
            if (reading) return;
            const upcoming = show.intermission ? show.next : show.film;
            const mode = upcoming.kind === 'film' ? 'film' : 'performance';
            const presentationKey = `${mode}-${upcoming.kind}`;
            if (presentation !== presentationKey) {
                presentation = presentationKey;
                auditorium.dataset.mode = mode;
                auditorium.dataset.kind = upcoming.kind;
                onMode(mode);
            }
            content.querySelector('#theater-marquee').textContent =
                `${show.intermission ? 'Next up' : 'Now showing'}: ${showLabel(upcoming)}`;
            const scheduleKey = `${show.index}-${show.intermission}`;
            const list = content.querySelector('#theater-schedule');
            if (list.dataset.show !== scheduleKey) {
                list.dataset.show = scheduleKey;
                list.innerHTML = schedule(now).map(s =>
                    `<li><time datetime="${s.at.toISOString()}">${fmt(s.at)}</time> · <strong>${escape(showLabel(s.film))}</strong><br>${s.film.icon} ${escape(s.film.title)} (${Math.ceil(s.film.seconds / 60)} min)</li>`).join('');
            }
            if (show.intermission) {
                const key = `int-${show.index}`;
                if (key !== shownKey) {
                    shownKey = key; pending = []; speak('', false);
                    screen.innerHTML = `<div class="doc-screen"><span class="doc-icon">🍿</span><strong>Intermission</strong><span class="doc-era">Next: ${escape(show.next.title)}</span></div><p class="doc-narration" id="theater-count"></p>`;
                }
                const count = screen.querySelector('#theater-count');
                if (count) count.textContent = `Next ${show.next.kind === 'film' ? 'film' : 'performance preview'} starts in ${Math.ceil(show.nextIn)} seconds.`;
                return;
            }
            const film = show.film, scene = film.scenes[show.scene], key = `${film.id}-${show.scene}`;
            if (key !== shownKey) {
                shownKey = key;
                screen.innerHTML = `<h3 class="doc-title">${film.icon} ${escape(film.title)} · Scene ${show.scene + 1}/${film.scenes.length}</h3>${film.kind === 'film' ? sceneCard(scene, film.icon) : stageCard(scene, film.kind, show.scene)}<div class="doc-progress"><span></span></div>`;
                speak(scene.narration, narrate && !document.hidden, narrationError);
                pending = npcChat(film.id, show.scene, film.kind).map(m => ({ ...m, at: Date.now() + Math.max(0, m.delay - show.sceneElapsed) * 1000 }));
            }
            pending = pending.filter(m => (Date.now() >= m.at ? (addChat(m.name, m.text), false) : true));
            const bar = screen.querySelector('.doc-progress span');
            if (bar) bar.style.width = `${Math.min(100, 100 * show.sceneElapsed / scene.seconds)}%`;
        }
        content.querySelector('#theater-form').addEventListener('submit', e => {
            e.preventDefault();
            const input = content.querySelector('#theater-input'), text = input.value.trim().slice(0, 140);
            if (!text) {
                input.setCustomValidity('Type a message before sending.');
                input.reportValidity();
                return;
            }
            input.setCustomValidity('');
            addChat('You', text, true);
            input.value = '';
        });
        content.querySelector('#theater-input').addEventListener('input', e => e.target.setCustomValidity(''));
        content.querySelector('#theater-reading').addEventListener('click', e => {
            reading = !reading;
            e.currentTarget.textContent = reading ? 'Rejoin shared showtime' : 'Pause to read';
            e.currentTarget.setAttribute('aria-pressed', String(reading));
            content.querySelector('#theater-status').textContent = reading ? 'Paused only on your screen. The shared show continues; rejoin when ready.' : 'Following the shared showtime.';
            speak('', false);
            if (!reading) { shownKey = ''; update(); }
        });
        const voice = content.querySelector('#theater-voice');
        if (voice) voice.addEventListener('click', () => {
            narrate = !narrate;
            voice.textContent = `🔈 Narrate: ${narrate ? 'on' : 'off'}`;
            voice.setAttribute('aria-pressed', String(narrate));
            speak(screen.querySelector('.doc-narration')?.textContent || '', narrate, narrationError);
        });
        content.querySelector('#theater-back').addEventListener('click', () => { stopTheater(); back(); });
        addChat('Usher', 'Welcome! I’m a scripted guide. Chat here is local, so other players cannot read it.');
        stopAll();
        const onVisibility = () => { if (document.hidden) speak('', false); else if (!reading) { shownKey = ''; update(); } };
        const stopTheater = () => {
            clearInterval(timer); speak('', false);
            document.removeEventListener('visibilitychange', onVisibility);
            running.delete(stopTheater);
        };
        update();
        timer = setInterval(update, 500);
        document.addEventListener('visibilitychange', onVisibility);
        running.add(stopTheater);
    }

    function renderDocumentaries(content, back) {
        let active = null;
        function list() {
            if (active) active.stop();
            const docs = data.channels.map(c => documentary(c.id));
            content.innerHTML = `<div class="sports-game sportsbook library-reader"><h2>🎞️ Short Documentaries</h2>
                <p>Original 2–4 minute illustrated reading documentaries, with optional browser narration, not streamed footage. New selections arrive every Monday (UTC); topics may repeat.</p>
                <p class="book-muted">${escape(CONTENT_NOTICE)}</p>
                ${docs.map(d => `<article class="book-card"><h3>${d.icon} ${escape(d.title)}</h3><p>${d.scenes.length} scenes · about ${Math.max(2, Math.round(d.seconds / 60))} min</p>
                ${contentNote(data.channels.find(c => c.id === d.channel).categories) ? `<p class="book-warning">${escape(contentNote(data.channels.find(c => c.id === d.channel).categories))}</p>` : ''}
                <button type="button" data-doc-open="${d.channel}">Watch</button></article>`).join('')}
                <details class="book-card"><summary><strong>🎬 DC film guide</strong> — real movies and docs to look for</summary>
                <p class="book-muted">Original summaries only. These titles are not streamed here; check your library or streaming services.</p>
                ${data.films.map(f => `<p><strong>${escape(f.title)}</strong> (${f.year}) · ${escape(f.category)}<br>${escape(f.description)} <em>${escape(f.whyDC)}</em>
                <a href="${escape(f.source)}" target="_blank" rel="noopener noreferrer">Read about ${escape(f.title)}</a></p>`).join('')}</details>
                <p class="book-muted">Longer feature documentaries play on a shared schedule at the U Street Picture House in NW.</p>
                <button type="button" id="doc-back">Back to library</button></div>`;
            content.querySelectorAll('[data-doc-open]').forEach(b => b.addEventListener('click', () => watch(b.dataset.docOpen)));
            content.querySelector('#doc-back').addEventListener('click', back);
        }
        function watch(id) {
            const doc = documentary(id);
            content.innerHTML = `<div class="sports-game sportsbook library-reader"><h2>${doc.icon} ${escape(doc.title)}</h2><div id="doc-host"></div>
                <button type="button" id="doc-list">Back to documentaries</button></div>`;
            active = player(content.querySelector('#doc-host'), { scenes: doc.scenes, icon: doc.icon, title: 'Scene' });
            content.querySelector('#doc-list').addEventListener('click', list);
        }
        list();
    }

    return { data, hash, rng, shuffle, weekOf, shelfBooks, documentary, tvClip, features, performances, program, showLabel, cycleSeconds, nowShowing, schedule,
        npcChat, player, stopAll, sceneSeconds, countWords, escape, contentNote, CONTENT_NOTICE, renderTV, renderTheater, renderDocumentaries };
})();

if (typeof module !== 'undefined') module.exports = DMVMedia;
