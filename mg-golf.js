'use strict';

// Putt Club DMV: pull back from the ball and release to putt. 6 holes with walls, sand, water & a windmill.
Minigames.register('golf', env => {
    const { W, H, U, sfx, buzz, fx, banner, end } = env;
    const BR = 7, FR = 2.2; // ball radius, friction
    const TOP = 70, BOT = 470;

    // hole: tee, cup, par, walls [x,y,w,h], sand/water [x,y,w,h], windmill {x,y}
    const HOLES = [
        { par: 2, tee: [180, 420], cup: [180, 140], walls: [], sand: [], water: [], name: 'The Mall' },
        { par: 2, tee: [80, 420], cup: [280, 150], walls: [[150, 230, 120, 24]], sand: [[40, 240, 80, 70]], water: [], name: 'Rock Creek Bend' },
        { par: 3, tee: [180, 430], cup: [180, 130], walls: [], sand: [], water: [[70, 250, 220, 60]], name: 'Potomac Carry' },
        { par: 3, tee: [70, 430], cup: [290, 140], walls: [[140, 150, 24, 180], [220, 300, 120, 24]], sand: [[230, 180, 90, 70]], water: [[30, 150, 80, 90]], name: 'Anacostia Dogleg' },
        { par: 3, tee: [180, 435], cup: [180, 125], walls: [], sand: [[40, 90, 70, 110], [250, 90, 70, 110]], water: [], windmill: { x: 180, y: 280 }, name: 'Old Mill (NoMa)' },
        { par: 4, tee: [60, 435], cup: [300, 130], walls: [[120, 340, 180, 22], [60, 200, 180, 22]], sand: [[250, 250, 80, 60]], water: [[120, 95, 110, 70]], windmill: { x: 180, y: 285 }, name: 'Capital Gauntlet' }
    ];

    let hi, hole, ball, strokes, total, pars, aiming, aim, shotT, sunk, sunkT, wmA, splashT, bestLine, cardT;

    function start() {
        hi = 0; total = 0; pars = 0;
        loadHole();
    }

    function loadHole() {
        hole = HOLES[hi];
        ball = { x: hole.tee[0], y: hole.tee[1], vx: 0, vy: 0, rot: 0, moving: false };
        strokes = 0; aiming = null; aim = null; sunk = false; sunkT = 0; shotT = 0; splashT = 0; cardT = 1.6;
        wmA = 0;
        fx.text(180, 300, `HOLE ${hi + 1} · PAR ${hole.par}`, { color: '#fde047', size: 22, life: 1.4, vy: -16 });
    }

    const inRect = (r, x, y, pad) => x > r[0] - (pad || 0) && x < r[0] + r[2] + (pad || 0) && y > r[1] - (pad || 0) && y < r[1] + r[3] + (pad || 0);
    const inSand = () => hole.sand.some(r => inRect(r, ball.x, ball.y, 0));

    function down(p) {
        if (sunk || ball.moving) return;
        if (Math.hypot(p.x - ball.x, p.y - ball.y) < 70) { aiming = p.id; p.role = 'aim'; aim = { dx: 0, dy: 0 }; }
    }
    function move(p) {
        if (p.role !== 'aim' || aiming !== p.id) return;
        aim = { dx: ball.x - p.x, dy: ball.y - p.y };
    }
    function up(p) {
        if (p.role !== 'aim' || aiming !== p.id) return;
        aiming = null;
        if (p.cancelled || !aim) { aim = null; return; }
        const len = Math.hypot(aim.dx, aim.dy);
        if (len < 18) { aim = null; return; }
        const pow = U.clamp(len / 150, 0, 1);
        const sandMul = inSand() ? .55 : 1;
        ball.vx = aim.dx / len * pow * 560 * sandMul;
        ball.vy = aim.dy / len * pow * 560 * sandMul;
        ball.moving = true; strokes++; shotT = .25;
        sfx('tap'); buzz(14); fx.shake(1.5, .08);
        fx.burst(ball.x, ball.y, { n: 7, colors: inSand() ? ['#eab308', '#d4a017'] : ['#bbf7d0', '#fff'], speed: 90, life: .3, g: 60 });
        aim = null;
    }

    function wmBlades() {
        const wm = hole.windmill, out = [];
        if (!wm) return out;
        for (let i = 0; i < 4; i++) {
            const a = wmA + i * Math.PI / 2;
            out.push({ x0: wm.x, y0: wm.y, x1: wm.x + Math.cos(a) * 56, y1: wm.y + Math.sin(a) * 56 });
        }
        return out;
    }

    function segHit(s, x, y, r) {
        const dx = s.x1 - s.x0, dy = s.y1 - s.y0, L2 = dx * dx + dy * dy;
        const t = U.clamp(((x - s.x0) * dx + (y - s.y0) * dy) / L2, 0, 1);
        const px = s.x0 + dx * t, py = s.y0 + dy * t;
        return Math.hypot(x - px, y - py) < r + 4 ? { px, py } : null;
    }

    function update(dt) {
        wmA += dt * (1.1 + hi * .15);
        shotT = Math.max(0, shotT - dt); splashT = Math.max(0, splashT - dt); cardT = Math.max(0, cardT - dt);
        if (sunk) {
            sunkT -= dt;
            if (sunkT <= 0) {
                hi++;
                if (hi >= HOLES.length) finish(); else loadHole();
            }
            return;
        }
        if (!ball.moving) return;
        const fr = inSand() ? FR * 3.4 : FR;
        const sp0 = Math.hypot(ball.vx, ball.vy);
        const sp = Math.max(0, sp0 - fr * 170 * dt);
        if (sp0 > 0) { ball.vx *= sp / sp0; ball.vy *= sp / sp0; }
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        ball.rot += sp * dt / BR;
        // outer rails
        if (ball.x < 28 + BR) { ball.x = 28 + BR; ball.vx = Math.abs(ball.vx) * .7; sfx('thud'); }
        if (ball.x > 332 - BR) { ball.x = 332 - BR; ball.vx = -Math.abs(ball.vx) * .7; sfx('thud'); }
        if (ball.y < TOP + BR) { ball.y = TOP + BR; ball.vy = Math.abs(ball.vy) * .7; sfx('thud'); }
        if (ball.y > BOT - BR) { ball.y = BOT - BR; ball.vy = -Math.abs(ball.vy) * .7; sfx('thud'); }
        // inner walls
        for (const w of hole.walls) {
            if (inRect(w, ball.x, ball.y, BR)) {
                const l = ball.x - (w[0] - BR), r = w[0] + w[2] + BR - ball.x, t = ball.y - (w[1] - BR), b = w[1] + w[3] + BR - ball.y;
                const m = Math.min(l, r, t, b);
                if (m === l) { ball.x = w[0] - BR; ball.vx = -Math.abs(ball.vx) * .7; }
                else if (m === r) { ball.x = w[0] + w[2] + BR; ball.vx = Math.abs(ball.vx) * .7; }
                else if (m === t) { ball.y = w[1] - BR; ball.vy = -Math.abs(ball.vy) * .7; }
                else { ball.y = w[1] + w[3] + BR; ball.vy = Math.abs(ball.vy) * .7; }
                sfx('thud'); buzz(8);
            }
        }
        // windmill blades
        for (const s of wmBlades()) {
            const h = segHit(s, ball.x, ball.y, BR);
            if (h) {
                const nx = ball.x - h.px, ny = ball.y - h.py, nl = Math.hypot(nx, ny) || 1;
                const dot = (ball.vx * nx + ball.vy * ny) / nl;
                ball.vx += (Math.abs(dot) * 1.6 + 70) * nx / nl - ball.vx * .4;
                ball.vy += (Math.abs(dot) * 1.6 + 70) * ny / nl - ball.vy * .4;
                sfx('thud'); buzz(16); fx.shake(2, .1);
                fx.burst(h.px, h.py, { n: 6, colors: ['#fca5a5', '#fff'], speed: 110, life: .25, g: 80 });
            }
        }
        // water
        for (const r of hole.water) {
            if (inRect(r, ball.x, ball.y, -2)) {
                sfx('sad'); buzz(30); splashT = .5;
                fx.burst(ball.x, ball.y, { n: 14, colors: ['#60a5fa', '#bfdbfe'], speed: 140, life: .5, g: 160 });
                fx.text(ball.x, ball.y - 24, 'SPLASH! +1', { color: '#93c5fd', size: 16 });
                strokes++;
                ball.x = hole.tee[0]; ball.y = hole.tee[1]; ball.vx = 0; ball.vy = 0; ball.moving = false;
                if (strokes >= hole.par + 3) giveUp();
                return;
            }
        }
        // cup
        const cd = Math.hypot(ball.x - hole.cup[0], ball.y - hole.cup[1]);
        if (cd < 11 && sp < 300) {
            sunk = true; sunkT = 1.5; ball.moving = false;
            ball.x = hole.cup[0]; ball.y = hole.cup[1];
            total += strokes; if (strokes <= hole.par) pars++;
            const diff = strokes - hole.par;
            const label = strokes === 1 ? 'HOLE IN ONE!' : diff <= -2 ? 'EAGLE!' : diff === -1 ? 'BIRDIE!' : diff === 0 ? 'PAR' : diff === 1 ? 'BOGEY' : `+${diff}`;
            banner(label, diff <= 0 ? '#86efac' : '#fca5a5', `${strokes} stroke${strokes > 1 ? 's' : ''} on par ${hole.par}`);
            sfx(diff <= 0 ? 'cheer' : 'thud');
            if (diff <= 0) { fx.flash('#4ade80', .2); fx.burst(ball.x, ball.y, { n: 18, colors: ['#4ade80', '#fde047', '#fff'], speed: 170, life: .6, g: 120 }); }
            return;
        } else if (cd < 13 && sp >= 300) {
            // lip out
            const nx = (ball.x - hole.cup[0]) / cd, ny = (ball.y - hole.cup[1]) / cd;
            ball.vx += nx * 60; ball.vy += ny * 60;
        }
        if (sp < 6) { ball.vx = 0; ball.vy = 0; ball.moving = false; if (strokes >= hole.par + 3) giveUp(); }
    }

    function giveUp() {
        strokes = hole.par + 3; total += strokes;
        banner('PICK IT UP', '#fca5a5', `Max ${strokes} strokes`);
        sunk = true; sunkT = 1.3;
    }

    function finish() {
        const parTotal = HOLES.reduce((a, h) => a + h.par, 0);
        const diff = total - parTotal;
        const win = diff <= 0;
        end({
            win, head: win ? 'CLUBHOUSE LEADER!' : 'ROUND COMPLETE',
            lines: [`${total} strokes · ${diff === 0 ? 'EVEN PAR' : diff > 0 ? '+' + diff : diff}`, `${pars}/${HOLES.length} holes at par or better`, win ? 'Smooth stroke!' : 'Shorter pulls = softer putts'],
            stars: U.clamp(1 + pars + (win ? 2 : 0) - Math.max(0, Math.floor(diff / 3)), 1, 10)
        });
    }

    // ---------- drawing ----------
    function drawCourse(c) {
        c.fillStyle = U.vgrad(c, 0, H, [[0, '#14321f'], [1, '#0c2416']]); c.fillRect(0, 0, W, H);
        U.crowd(c, 0, 8, W, 46, { rows: 2, gap: 15, t: env.time(), amp: sunk ? .5 : .05, dim: .3, seed: 9 });
        // green
        U.rr(c, 24, TOP - 4, 312, BOT - TOP + 8, 16);
        c.fillStyle = '#3f9e58'; c.fill();
        c.save(); c.clip();
        for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? 'rgba(255,255,255,.045)' : 'rgba(0,0,0,.03)'; c.fillRect(24, TOP + i * 42 - 4, 312, 21); }
        c.restore();
        c.strokeStyle = '#8a5a2b'; c.lineWidth = 6;
        U.rr(c, 24, TOP - 4, 312, BOT - TOP + 8, 16); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 2; c.stroke();
        for (const r of hole.sand) {
            U.rr(c, r[0], r[1], r[2], r[3], 14); c.fillStyle = '#e7c663'; c.fill();
            c.fillStyle = 'rgba(0,0,0,.08)';
            for (let i = 0; i < 4; i++) c.fillRect(r[0] + 8, r[1] + 8 + i * (r[3] - 16) / 4, r[2] - 16, 2);
        }
        for (const r of hole.water) {
            U.rr(c, r[0], r[1], r[2], r[3], 12); c.fillStyle = '#1d4ed8'; c.fill();
            c.strokeStyle = 'rgba(191,219,254,.5)'; c.lineWidth = 1.5;
            for (let i = 0; i < 3; i++) {
                const wy = r[1] + (i + 1) * r[3] / 4 + Math.sin(env.time() * 2 + i) * 2;
                c.beginPath(); c.moveTo(r[0] + 8, wy); c.quadraticCurveTo(r[0] + r[2] / 2, wy - 4, r[0] + r[2] - 8, wy); c.stroke();
            }
        }
        for (const w of hole.walls) {
            c.fillStyle = 'rgba(0,0,0,.3)'; U.rr(c, w[0] + 2, w[1] + 3, w[2], w[3], 6); c.fill();
            U.rr(c, w[0], w[1], w[2], w[3], 6); c.fillStyle = '#9a6a35'; c.fill();
            c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(w[0] + 2, w[1] + 2, w[2] - 4, 3);
        }
        // tee pad
        U.rr(c, hole.tee[0] - 16, hole.tee[1] - 10, 32, 20, 5); c.fillStyle = 'rgba(0,0,0,.18)'; c.fill();
        // cup
        const [cx, cy] = hole.cup;
        c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(cx, cy + 1, 13, 7, 0, 0, 7); c.fill();
        c.fillStyle = '#0a0f0a'; c.beginPath(); c.ellipse(cx, cy, 11, 6, 0, 0, 7); c.fill();
        c.strokeStyle = '#374151'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy - 46); c.stroke();
        c.fillStyle = '#ef4444'; U.poly ? 0 : 0;
        c.beginPath(); c.moveTo(cx, cy - 46); c.lineTo(cx + 24, cy - 38); c.lineTo(cx, cy - 30); c.closePath(); c.fill();
        U.text(c, `${hi + 1}`, cx + 11, cy - 38, { size: 10, color: '#fff' });
    }

    function drawWindmill(c) {
        const wm = hole.windmill;
        if (!wm) return;
        c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(wm.x, wm.y + 4, 18, 8, 0, 0, 7); c.fill();
        c.fillStyle = '#7c3f12'; c.beginPath(); c.arc(wm.x, wm.y, 12, 0, 7); c.fill();
        c.fillStyle = '#a16207'; c.beginPath(); c.arc(wm.x, wm.y, 7, 0, 7); c.fill();
        for (const s of wmBlades()) {
            c.save();
            c.translate(s.x0, s.y0); c.rotate(Math.atan2(s.y1 - s.y0, s.x1 - s.x0));
            U.rr(c, 8, -5, 50, 10, 5); c.fillStyle = '#dc2626'; c.fill();
            c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(12, -4, 42, 3);
            c.restore();
        }
        c.fillStyle = '#fde047'; c.beginPath(); c.arc(wm.x, wm.y, 3.5, 0, 7); c.fill();
    }

    function drawAim(c) {
        if (!aim || sunk || ball.moving) return;
        const len = Math.hypot(aim.dx, aim.dy);
        if (len < 6) return;
        const pow = U.clamp(len / 150, 0, 1);
        const col = pow > .8 ? '#f87171' : pow > .45 ? '#fde047' : '#4ade80';
        // dotted projection
        c.setLineDash([6, 7]);
        c.strokeStyle = col; c.lineWidth = 3;
        c.beginPath(); c.moveTo(ball.x, ball.y);
        c.lineTo(ball.x + aim.dx / len * (40 + pow * 150), ball.y + aim.dy / len * (40 + pow * 150));
        c.stroke(); c.setLineDash([]);
        // pull-back handle
        c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(ball.x, ball.y); c.lineTo(ball.x - aim.dx, ball.y - aim.dy); c.stroke();
        c.fillStyle = col; c.beginPath(); c.arc(ball.x - aim.dx, ball.y - aim.dy, 7, 0, 7); c.fill();
        // power ring
        c.strokeStyle = col; c.lineWidth = 4;
        c.beginPath(); c.arc(ball.x, ball.y, 16, -Math.PI / 2, -Math.PI / 2 + pow * Math.PI * 2); c.stroke();
        U.text(c, `${Math.round(pow * 100)}%`, ball.x, ball.y - 26, { size: 13, color: col, stroke: 'rgba(0,0,0,.7)', lw: 3 });
    }

    function drawBall(c) {
        if (sunk && sunkT < 1.2) return;
        U.shadow(c, ball.x, ball.y + BR - 2, BR + 1, 3, .35);
        U.ball(c, ball.x, ball.y - 2, BR, ball.rot, 'golf');
        if (shotT > 0) { c.strokeStyle = `rgba(255,255,255,${shotT * 2})`; c.lineWidth = 2; c.beginPath(); c.arc(ball.x, ball.y - 2, BR + 6 + (0.25 - shotT) * 50, 0, 7); c.stroke(); }
    }

    function drawHud(c) {
        U.rr(c, 8, H - 76, 344, 34, 10); c.fillStyle = 'rgba(0,0,0,.65)'; c.fill();
        U.text(c, `HOLE ${hi + 1}/${HOLES.length}`, 56, H - 59, { size: 12, color: '#7dd3fc' });
        U.text(c, `PAR ${hole.par}`, 134, H - 59, { size: 12, color: '#a7f3d0' });
        U.text(c, `STROKES ${strokes}`, 218, H - 59, { size: 12, color: strokes > hole.par ? '#fca5a5' : '#fff' });
        U.text(c, `TOT ${total}`, 310, H - 59, { size: 12, color: '#fde047' });
        if (cardT > 0) U.text(c, hole.name.toUpperCase(), 180, 56, { size: 14, color: '#fde047', alpha: Math.min(1, cardT), stroke: 'rgba(0,0,0,.7)', lw: 3 });
        if (!ball.moving && !sunk && !aim) U.text(c, inSand() ? 'IN SAND · WEAK SHOT' : 'PULL BACK FROM THE BALL & RELEASE', 180, H - 28, { size: 11, color: '#fff', alpha: .55 + .35 * Math.sin(env.time() * 4), stroke: 'rgba(0,0,0,.7)', lw: 3 });
    }

    function draw(c) {
        drawCourse(c);
        drawWindmill(c);
        drawAim(c);
        drawBall(c);
        drawHud(c);
    }

    return {
        title: '⛳ Putt Club DMV',
        intro: { head: 'PUTT CLUB DMV', lines: ['Pull back from the ball, release to putt', 'Dodge sand, water & the windmill', '6 holes · beat par for stars'] },
        init: start, start, update, draw, down, move, up, idle() { },
        _state: () => ({ hi, strokes, total, ball, sunk }),
        _set: o => { if (o.ball) Object.assign(ball, o.ball); }
    };
});
