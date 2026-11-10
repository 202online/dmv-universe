'use strict';

// Shared engine for the touch-first sports minigames. Each sport registers a factory with
// Minigames.register(name, env => game); the shell owns the canvas, input, effects and result flow.
const Minigames = (() => {
    const W = 360, H = 560;
    const art = typeof CityArt !== 'undefined' ? CityArt : require('./city-art.js');
    const games = {};
    let S = null;

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const rand = (a, b) => a + Math.random() * (b - a);
    const pick = list => list[Math.floor(Math.random() * list.length)];
    const ease = t => t * t * (3 - 2 * t);
    const hash = (i, j) => ((Math.imul(i + 11, 73856093) ^ Math.imul(j + 7, 19349663)) >>> 0);

    // ---------- Audio and haptics (both optional) ----------
    let actx = null;
    function tone(f0, f1, dur, type, vol, delay) {
        try {
            if (typeof window === 'undefined') return;
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            if (!actx) actx = new AC();
            if (actx.state === 'suspended') actx.resume();
            const t = actx.currentTime + (delay || 0);
            const o = actx.createOscillator(), g = actx.createGain();
            o.type = type || 'sine';
            o.frequency.setValueAtTime(f0, t);
            o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
            g.gain.setValueAtTime(vol || 0.05, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g); g.connect(actx.destination);
            o.start(t); o.stop(t + dur + 0.03);
        } catch (e) { /* sound is optional */ }
    }
    const SFX = {
        tap: () => tone(620, 520, .05, 'square', .025),
        whoosh: () => tone(280, 900, .18, 'sawtooth', .02),
        bounce: () => tone(230, 110, .12, 'sine', .08),
        swish: () => tone(1250, 500, .32, 'triangle', .05),
        rim: () => { tone(700, 350, .18, 'square', .035); tone(520, 300, .2, 'square', .025, .07); },
        thud: () => tone(140, 50, .18, 'sine', .12),
        hit: () => { tone(180, 60, .12, 'square', .06); tone(90, 40, .22, 'sine', .1); },
        cheer: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, .16, 'triangle', .045, i * .08)),
        sad: () => { tone(400, 300, .2, 'triangle', .045); tone(300, 200, .3, 'triangle', .045, .18); },
        whistle: () => tone(2300, 2100, .3, 'sine', .04),
        coin: () => { tone(988, 988, .08, 'square', .03); tone(1319, 1319, .18, 'square', .03, .08); },
        splash: () => tone(520, 90, .3, 'sawtooth', .025),
        bell: () => tone(1500, 1450, .55, 'sine', .05),
        click: () => tone(900, 700, .04, 'square', .02)
    };
    const sfx = name => { if (SFX[name]) SFX[name](); };
    const buzz = ms => {
        try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* optional */ }
    };

    // ---------- Drawing helpers shared by every sport ----------
    const U = {
        clamp, lerp, rand, pick, ease, hash,
        challenge(level = 1) {
            return level <= 5 ? level - 1 : 4 + 4 * ((level - 5) / (level + 25));
        },
        rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); },
        text(c, str, x, y, o = {}) {
            c.save();
            c.font = `${o.weight || 800} ${o.size || 16}px ${o.font || 'system-ui, sans-serif'}`;
            c.textAlign = o.align || 'center';
            c.textBaseline = o.base || 'middle';
            if (o.alpha !== undefined) c.globalAlpha = o.alpha;
            if (o.shadow) { c.shadowColor = o.shadow; c.shadowBlur = o.blur || 6; }
            if (o.stroke) { c.lineWidth = o.lw || 4; c.strokeStyle = o.stroke; c.lineJoin = 'round'; c.strokeText(str, x, y); }
            c.fillStyle = o.color || '#fff';
            c.fillText(str, x, y);
            c.restore();
        },
        vgrad(c, y0, y1, stops) {
            const g = c.createLinearGradient(0, y0, 0, y1);
            stops.forEach(([o, col]) => g.addColorStop(o, col));
            return g;
        },
        glow(c, x, y, r, color, alpha = 1) {
            const g = c.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, color);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            c.save(); c.globalAlpha = alpha; c.fillStyle = g;
            c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.restore();
        },
        shadow(c, x, y, rx, ry, a = .35) {
            c.save(); c.fillStyle = `rgba(0,0,0,${a})`;
            c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); c.restore();
        },
        poly(c, n, rad, rot) {
            c.beginPath();
            for (let i = 0; i < n; i++) {
                const a = rot + i * Math.PI * 2 / n - Math.PI / 2;
                i ? c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad) : c.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
            }
            c.closePath();
        },
        // kind: basket | soccer | tennis | golf
        ball(c, x, y, r, rot, kind) {
            c.save();
            c.translate(x, y);
            const g = c.createRadialGradient(-r * .35, -r * .4, r * .1, 0, 0, r * 1.05);
            const palette = {
                basket: ['#ffb35c', '#e07a1f', '#963f0a'],
                soccer: ['#ffffff', '#e5e7eb', '#9ca3af'],
                tennis: ['#f2ff7a', '#cde334', '#8aa10f'],
                golf: ['#ffffff', '#f1f5f9', '#b6c0cc']
            }[kind];
            g.addColorStop(0, palette[0]); g.addColorStop(.6, palette[1]); g.addColorStop(1, palette[2]);
            c.fillStyle = g;
            c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
            c.save();
            c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.clip();
            c.rotate(rot);
            c.lineWidth = Math.max(1, r * .09);
            if (kind === 'basket') {
                c.strokeStyle = '#2b1204';
                c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.moveTo(0, -r); c.lineTo(0, r); c.stroke();
                c.beginPath(); c.arc(-r * 1.2, 0, r * .98, -.95, .95); c.stroke();
                c.beginPath(); c.arc(r * 1.2, 0, r * .98, Math.PI - .95, Math.PI + .95); c.stroke();
            } else if (kind === 'soccer') {
                c.fillStyle = '#1b1b22';
                U.poly(c, 5, r * .36, 0); c.fill();
                for (let i = 0; i < 5; i++) {
                    c.save(); c.rotate(i * Math.PI * 2 / 5);
                    c.translate(0, -r * .98); U.poly(c, 5, r * .3, Math.PI); c.fill();
                    c.restore();
                }
                c.strokeStyle = 'rgba(30,30,40,.7)';
                for (let i = 0; i < 5; i++) {
                    const a = i * Math.PI * 2 / 5 - Math.PI / 2;
                    c.beginPath(); c.moveTo(Math.cos(a) * r * .36, Math.sin(a) * r * .36);
                    c.lineTo(Math.cos(a) * r * .72, Math.sin(a) * r * .72); c.stroke();
                }
            } else if (kind === 'tennis') {
                c.strokeStyle = '#fff'; c.lineWidth = Math.max(1.2, r * .14);
                c.beginPath(); c.arc(-r * 1.1, 0, r * .95, -.9, .9); c.stroke();
                c.beginPath(); c.arc(r * 1.1, 0, r * .95, Math.PI - .9, Math.PI + .9); c.stroke();
            } else {
                c.fillStyle = 'rgba(120,130,145,.55)';
                for (let i = 0; i < 7; i++) {
                    const a = i * 2.4, d = r * (.25 + (i % 3) * .25);
                    c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, Math.max(.6, r * .11), 0, Math.PI * 2); c.fill();
                }
            }
            c.restore();
            c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1;
            c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
            c.restore();
        },
        // Silhouette crowd with optional jumping reactions.
        crowd(c, x, y, w, h, o = {}) {
            const rows = o.rows || 4, gap = o.gap || 17, t = o.t || 0, amp = o.amp || 0;
            const palette = o.palette || ['#7c3aed', '#be123c', '#0e7490', '#b45309', '#475569', '#15803d', '#a21caf'];
            const skin = ['#f2c9a0', '#c68642', '#8d5524', '#e0ac69'];
            for (let r = 0; r < rows; r++) {
                const ry = y + h * (r + .5) / rows, sc = .72 + .28 * (rows > 1 ? r / (rows - 1) : 1);
                for (let i = 0; i < Math.ceil(w / gap) + 1; i++) {
                    const hs = hash(i, r + (o.seed || 0));
                    const px = x + (i + .5 + (r % 2) * .5) * gap - gap / 2;
                    const jump = amp * Math.max(0, Math.sin(t * 7 + (hs % 100) * .3)) * 5;
                    const py = ry - jump;
                    c.fillStyle = palette[hs % palette.length];
                    c.beginPath(); c.ellipse(px, py + 7 * sc, 7.2 * sc, 6.2 * sc, 0, Math.PI, 0); c.fill();
                    c.fillRect(px - 7.2 * sc, py + 7 * sc, 14.4 * sc, 5 * sc);
                    c.fillStyle = skin[(hs >> 3) % skin.length];
                    c.beginPath(); c.arc(px, py, 4.2 * sc, 0, Math.PI * 2); c.fill();
                }
            }
            if (o.dim) { c.fillStyle = `rgba(5,8,20,${o.dim})`; c.fillRect(x, y, w, h); }
        }
    };

    function register(name, factory) { games[name] = factory; }

    // ---------- Session management ----------
    function fit() {
        if (!S) return;
        const overlay = S.api.overlay;
        const wrap = S.host.querySelector('.mg-wrap');
        if (wrap) wrap.dataset.phase = S.phase;
        const chrome = wrap ? Array.from(wrap.children).reduce((sum, child) =>
            sum + (child === S.canvas ? 0 : child.offsetHeight), 0) + (wrap.children.length - 1) * 6 + 34 : 240;
        const availW = Math.max(180, (overlay ? overlay.clientWidth : W + 40) - 38);
        const availH = Math.max(180, (overlay ? overlay.clientHeight : H + chrome) - chrome);
        const scale = clamp(Math.min(availW / W, availH / H), .3, 1.45);
        const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
        S.canvas.style.width = Math.round(W * scale) + 'px';
        S.canvas.style.height = Math.round(H * scale) + 'px';
        S.canvas.width = Math.round(W * scale * dpr);
        S.canvas.height = Math.round(H * scale * dpr);
        S.k = S.canvas.width / W;
    }

    function open(name, host, api, selectedLevel) {
        stop();
        const factory = games[name];
        if (!factory) return false;
        const campaign = api.campaign ? api.campaign.info() : null;
        const level = campaign ? selectedLevel === undefined ? campaign.unlocked : selectedLevel : 1;
        if (!Number.isSafeInteger(level) || level < 1 || (campaign && level > campaign.unlocked)) {
            throw new Error('Level is locked');
        }
        const first = Math.max(1, Math.min(level - 2, campaign ? campaign.unlocked - 4 : 1));
        const levels = Array.from({ length: 5 }, (_, i) => first + i);
        host.innerHTML = `
            <div class="mg-wrap">
                <div class="mg-title" id="mg-title"></div>
                ${art.gallery(name)}
                ${campaign ? `<div class="mg-levels" role="group" aria-label="Choose level">
                    ${levels.map(n => `<button type="button" data-level="${n}"
                        aria-pressed="${level === n}" ${n > campaign.unlocked ? 'disabled' : ''}>
                        ${n}${n <= campaign.cleared ? ' ✓' : n > campaign.unlocked ? ' 🔒' : ''}</button>`).join('')}
                </div><div class="mg-level-nav">
                    <button type="button" id="mg-prev" ${level <= 1 ? 'disabled' : ''}>Previous</button>
                    <button type="button" id="mg-current">Latest unlocked: ${campaign.unlocked}</button>
                </div><div class="mg-campaign-info" id="mg-campaign-info"></div>` : ''}
                <canvas class="mg-canvas" id="mg-canvas" role="img"></canvas>
                <div class="mg-bar">
                    <button type="button" id="mg-next" hidden>Next level</button>
                    <button type="button" id="mg-again" hidden>↻ Play again</button>
                    <button type="button" id="mg-quit">Leave</button>
                </div>
            </div>`;
        const canvas = host.querySelector('#mg-canvas');
        S = {
            name, host, api, canvas, ctx: canvas.getContext('2d'), k: 1, phase: 'intro', t: 0, last: 0,
            parts: [], texts: [], banners: [], shakeM: 0, shakeT: 0, flashC: null, flashT: 0,
            pointers: new Map(), result: null, raf: 0, game: null, level
        };
        const env = { W, H, U, sfx, buzz, level, difficulty: U.challenge(level) / 4,
            time: () => S.t, fx, banner, end, phase: () => S.phase, running: () => S.phase === 'play' };
        S.game = factory(env);
        if (S.game.init) S.game.init();
        host.querySelector('#mg-title').textContent = S.game.title + (campaign ? ` · Level ${level}` : '');
        if (campaign) {
            updateCampaign();
            host.querySelectorAll('[data-level]').forEach(button => button.addEventListener('click', () =>
                open(name, host, api, Number(button.dataset.level))));
            host.querySelector('#mg-prev').addEventListener('click', () => open(name, host, api, level - 1));
            host.querySelector('#mg-current').addEventListener('click', () => open(name, host, api));
        }
        const tribute = art.theme(name).people.map(id => art.legends[id].name).join(' and ');
        canvas.setAttribute('aria-label', `${S.game.title} play area. Original tribute artwork features ${tribute}. Touch gestures control the game.`);
        if (api.overlay) api.overlay.classList.add('mg-mode');
        fit();
        canvas.addEventListener('pointerdown', e => handle(e, 'down'));
        canvas.addEventListener('pointermove', e => handle(e, 'move'));
        canvas.addEventListener('pointerup', e => handle(e, 'up'));
        canvas.addEventListener('pointercancel', e => handle(e, 'cancel'));
        canvas.addEventListener('contextmenu', e => e.preventDefault());
        host.querySelector('#mg-quit').addEventListener('click', () => api.close());
        host.querySelector('#mg-again').addEventListener('click', () => open(name, host, api, level));
        host.querySelector('#mg-next').addEventListener('click', () => open(name, host, api, level + 1));
        if (typeof window !== 'undefined') window.addEventListener('resize', fit);
        step(0);
        if (typeof requestAnimationFrame === 'function') S.raf = requestAnimationFrame(frame);
        return true;
    }

    function updateCampaign() {
        const status = S.api.campaign.info(), level = S.level;
        const reward = level > status.cleared ? `First win: ${status.reward} stars` : 'Cleared level: practice only (0 stars)';
        S.host.querySelector('#mg-campaign-info').textContent =
            `${S.game.goal} · ${reward}. Stars are earned once per level. Losses: 0.`;
        S.host.querySelector('#mg-current').textContent = `Latest unlocked: ${status.unlocked}`;
        S.host.querySelectorAll('[data-level]').forEach(button => {
            const n = Number(button.dataset.level);
            button.disabled = n > status.unlocked;
            button.textContent = `${n}${n <= status.cleared ? ' ✓' : n > status.unlocked ? ' 🔒' : ''}`;
        });
    }

    function stop() {
        if (!S) return;
        if (S.raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(S.raf);
        if (typeof window !== 'undefined') window.removeEventListener('resize', fit);
        if (S.api.overlay) S.api.overlay.classList.remove('mg-mode');
        S = null;
    }

    function handle(e, kind) {
        if (!S) return;
        e.preventDefault();
        const r = S.canvas.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
        if (kind === 'down') { try { S.canvas.setPointerCapture(e.pointerId); } catch (err) { /* optional */ } }
        pointer(kind, e.pointerId, x, y, e.timeStamp / 1000);
    }

    // Exposed for tests: kind is down | move | up | cancel, time in seconds.
    function pointer(kind, id, x, y, time) {
        if (!S) return;
        let p = S.pointers.get(id);
        if (kind === 'down') {
            p = { id, x, y, sx: x, sy: y, t0: time, t: time, path: [{ x, y, t: time }], vx: 0, vy: 0, dx: 0, dy: 0, len: 0 };
            S.pointers.set(id, p);
            if (S.phase === 'intro') { p.ignore = true; startGame(); return; }
            if (S.phase === 'play' && S.game.down) S.game.down(p);
            return;
        }
        if (!p) return;
        p.len += Math.hypot(x - p.x, y - p.y);
        p.x = x; p.y = y; p.t = time; p.dx = x - p.sx; p.dy = y - p.sy;
        p.path.push({ x, y, t: time });
        if (p.path.length > 300) p.path.shift();
        const last = p.path[p.path.length - 1];
        let i = p.path.length - 1;
        while (i > 0 && last.t - p.path[i - 1].t <= 0.1) i--;
        const dt = Math.max(0.016, last.t - p.path[i].t);
        p.vx = (last.x - p.path[i].x) / dt;
        p.vy = (last.y - p.path[i].y) / dt;
        if (kind === 'move') {
            if (!p.ignore && S.phase === 'play' && S.game.move) S.game.move(p);
        } else {
            S.pointers.delete(id);
            p.cancelled = kind === 'cancel';
            p.dur = time - p.t0;
            if (!p.ignore && S.phase === 'play' && S.game.up) S.game.up(p);
        }
    }

    function startGame() {
        S.phase = 'play';
        sfx('whistle');
        if (S.game.start) S.game.start();
        fit();
    }

    function end(result) {
        if (!S || S.phase === 'over') return;
        S.phase = 'over';
        if (S.api.campaign) {
            const payout = S.api.campaign.settle(S.level, result.win === true);
            result = { ...result, stars: payout.stars, rewardMessage: payout.message };
            updateCampaign();
            const next = S.host.querySelector('#mg-next');
            next.hidden = !result.win;
            S.host.querySelector('#mg-again').textContent = result.win ? 'Replay' : 'Retry level';
        }
        S.result = result;
        S.pointers.clear();
        if (result.stars > 0 && !S.api.campaign) S.api.award(result.stars);
        sfx(result.win ? 'cheer' : 'sad');
        const again = S.host.querySelector('#mg-again');
        if (again) again.hidden = false;
        fit();
    }

    // ---------- Effects ----------
    const fx = {
        burst(x, y, o = {}) {
            if (!S) return;
            const n = o.n || 14, colors = o.colors || ['#fff'];
            for (let i = 0; i < n; i++) {
                const a = (o.angle || 0) + (rand(-.5, .5)) * (o.spread === undefined ? Math.PI * 2 : o.spread);
                const sp = (o.speed || 180) * rand(.35, 1);
                S.parts.push({
                    x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: o.g === undefined ? 320 : o.g,
                    life: (o.life || .7) * rand(.6, 1), max: o.life || .7, size: (o.size || 4) * rand(.6, 1.3),
                    color: colors[i % colors.length], shape: o.shape || 'dot', rot: rand(0, 6), vr: rand(-8, 8)
                });
            }
        },
        text(x, y, str, o = {}) {
            if (!S) return;
            S.texts.push({ x, y, str, color: o.color || '#fff', size: o.size || 22, life: o.life || 1, max: o.life || 1, vy: o.vy === undefined ? -48 : o.vy });
        },
        shake(m, d = .25) { if (S) { S.shakeM = Math.max(S.shakeM, m); S.shakeT = Math.max(S.shakeT, d); } },
        flash(color, d = .25) { if (S) { S.flashC = color; S.flashT = d; S.flashMax = d; } }
    };

    function banner(text, color, sub) {
        if (S) S.banners.push({ text, color: color || '#fde047', sub, t: 0, dur: 1.5 });
    }

    function updateFx(dt) {
        S.parts = S.parts.filter(p => (p.life -= dt) > 0);
        S.parts.forEach(p => { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; });
        S.texts = S.texts.filter(p => (p.life -= dt) > 0);
        S.texts.forEach(p => { p.y += p.vy * dt; });
        S.banners = S.banners.filter(b => (b.t += dt) < b.dur);
        if (S.shakeT > 0) { S.shakeT -= dt; if (S.shakeT <= 0) S.shakeM = 0; }
        if (S.flashT > 0) S.flashT -= dt;
    }

    function drawFx(c) {
        S.parts.forEach(p => {
            c.globalAlpha = clamp(p.life / (p.max * .5), 0, 1);
            c.fillStyle = p.color;
            if (p.shape === 'rect') {
                c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.size, -p.size * .5, p.size * 2, p.size); c.restore();
            } else {
                c.beginPath(); c.arc(p.x, p.y, p.size, 0, Math.PI * 2); c.fill();
            }
        });
        c.globalAlpha = 1;
        S.texts.forEach(p => {
            U.text(c, p.str, p.x, p.y, { size: p.size, color: p.color, stroke: 'rgba(0,0,0,.75)', lw: 4, alpha: clamp(p.life / (p.max * .4), 0, 1) });
        });
        S.banners.forEach(b => {
            const a = b.t < .2 ? b.t / .2 : b.t > b.dur - .3 ? (b.dur - b.t) / .3 : 1;
            const sc = b.t < .25 ? 1.5 - 2 * b.t : 1;
            c.save();
            c.translate(W / 2, 205); c.scale(sc, sc);
            U.text(c, b.text, 0, 0, { size: 38, color: b.color, stroke: 'rgba(0,0,0,.85)', lw: 7, alpha: a, shadow: b.color, blur: 14 });
            if (b.sub) U.text(c, b.sub, 0, 32, { size: 15, color: '#fff', stroke: 'rgba(0,0,0,.8)', lw: 4, alpha: a });
            c.restore();
        });
    }

    function card(c, x, y, w, h) {
        U.rr(c, x, y, w, h, 20);
        c.fillStyle = 'rgba(8,12,26,.93)'; c.fill();
        c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 2; c.stroke();
    }

    function drawIntro(c) {
        const intro = S.game.intro || { head: S.game.title, lines: [] };
        art.drawLobby(c, S.name, U);
        const h = 112 + intro.lines.length * 30;
        const y = Math.max(204, H - h - 24);
        card(c, 22, y, W - 44, h);
        U.text(c, intro.head, W / 2, y + 30, { size: 21, color: '#fde047', stroke: 'rgba(0,0,0,.6)', lw: 4 });
        intro.lines.forEach((line, i) => U.text(c, line, W / 2, y + 66 + i * 30, { size: 14, weight: 700, color: '#dbe4f0' }));
        const pulse = .65 + .35 * Math.sin(S.t * 5);
        U.rr(c, W / 2 - 86, y + h - 52, 172, 38, 19);
        c.fillStyle = `rgba(16,185,129,${pulse})`; c.fill();
        U.text(c, 'TAP TO PLAY', W / 2, y + h - 33, { size: 16, color: '#fff' });
    }

    function drawResult(c) {
        const r = S.result;
        c.fillStyle = 'rgba(0,0,0,.62)'; c.fillRect(0, 0, W, H);
        const h = 210 + r.lines.length * 30;
        const y = (H - h) / 2 - 20;
        card(c, 22, y, W - 44, h);
        U.text(c, r.head, W / 2, y + 44, { size: 29, color: r.win ? '#86efac' : '#fca5a5', stroke: 'rgba(0,0,0,.6)', lw: 5 });
        r.lines.forEach((line, i) => U.text(c, line, W / 2, y + 92 + i * 30, { size: 15, weight: 700, color: '#e2e8f0' }));
        const sy = y + h - 58;
        const pop = 1 + .06 * Math.sin(S.t * 6);
        c.save(); c.translate(W / 2, sy); c.scale(pop, pop);
        U.text(c, `+${r.stars} ⭐`, 0, 0, { size: 36, color: '#fde047', stroke: 'rgba(0,0,0,.7)', lw: 6 });
        c.restore();
        U.text(c, r.rewardMessage || 'Stars added to your total', W / 2, sy + 34, { size: 11, weight: 600, color: '#94a3b8' });
    }

    function draw() {
        const c = S.ctx;
        c.setTransform(S.k, 0, 0, S.k, 0, 0);
        c.save();
        if (S.shakeT > 0) c.translate(rand(-1, 1) * S.shakeM, rand(-1, 1) * S.shakeM);
        S.game.draw(c);
        drawFx(c);
        c.restore();
        if (S.flashT > 0) {
            c.globalAlpha = clamp(S.flashT / S.flashMax, 0, 1) * .45;
            c.fillStyle = S.flashC; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
        }
        if (S.phase === 'intro') drawIntro(c);
        if (S.phase === 'over') drawResult(c);
    }

    function step(dt) {
        if (!S) return;
        S.t += dt;
        updateFx(dt);
        if (S.phase === 'play') S.game.update(dt);
        else if (S.game.idle) S.game.idle(dt);
        if (S) draw();
    }

    function frame(ts) {
        if (!S) return;
        if (!S.canvas.isConnected || (S.api.isOpen && !S.api.isOpen())) { stop(); return; }
        const now = ts / 1000;
        const dt = clamp(S.last ? now - S.last : .016, 0, .033);
        S.last = now;
        step(dt);
        if (S) S.raf = requestAnimationFrame(frame);
    }

    return {
        W, H, register, open, stop, U,
        isActive: () => !!S,
        _step: step, _pointer: pointer, _session: () => S
    };
})();

if (typeof module !== 'undefined') module.exports = Minigames;
