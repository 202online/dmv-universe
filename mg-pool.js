'use strict';

// Rack 'Em DMV: pull back from the cue ball and release to shoot. Pot all 9 balls before your shots run out.
Minigames.register('pool', env => {
    const { W, H, U, sfx, buzz, fx, banner, end } = env;
    const rank = U.challenge(env.level);
    const pressure = U.pressure(env.level), pocketRadius = 15 - pressure * 1.8;
    const guideLength = 170 - pressure * 100;
    const L = 52, R = 308, T = 104, B = 466, BR = 9, SHOTS = Math.max(8, 14 - Math.floor(rank));
    const POCKETS = [[L, T], [R, T], [L, (T + B) / 2], [R, (T + B) / 2], [L, B], [R, B]];
    const COLORS = ['#fbbf24', '#3b82f6', '#ef4444', '#8b5cf6', '#f97316', '#10b981', '#991b1b', '#111827', '#e879f9'];

    let balls, cue, shots, potted, aiming, aim, moving, scratchT, lastPot, streak;

    function start() {
        shots = SHOTS; potted = 0; aiming = null; aim = null; scratchT = 0; lastPot = ''; streak = 0;
        balls = [];
        cue = { x: 180, y: 410, vx: 0, vy: 0, cue: true, col: '#f8fafc', n: 0, dead: false };
        balls.push(cue);
        let n = 1;
        for (let row = 0; row < 4 && n <= 9; row++) {
            for (let i = 0; i <= row && n <= 9; i++) {
                balls.push({ x: 180 + (i - row / 2) * (BR * 2 + 1), y: 200 - row * (BR * 2 - 1), vx: 0, vy: 0, col: COLORS[n - 1], n, dead: false });
                n++;
            }
        }
    }

    const anyMoving = () => balls.some(b => !b.dead && Math.hypot(b.vx, b.vy) > 4);

    function down(p) {
        if (anyMoving() || cue.dead) return;
        if (Math.hypot(p.x - cue.x, p.y - cue.y) < 80) { aiming = p.id; p.role = 'aim'; aim = { dx: 0, dy: 0 }; }
    }
    function move(p) { if (p.role === 'aim' && aiming === p.id) aim = { dx: cue.x - p.x, dy: cue.y - p.y }; }
    function up(p) {
        if (p.role !== 'aim' || aiming !== p.id) return;
        aiming = null;
        if (p.cancelled || !aim) { aim = null; return; }
        const len = Math.hypot(aim.dx, aim.dy);
        if (len < 16) { aim = null; return; }
        const pow = U.clamp(len / 160, 0, 1);
        cue.vx = aim.dx / len * pow * 760; cue.vy = aim.dy / len * pow * 760;
        shots--; streak = 0;
        sfx('tap'); buzz(12); fx.shake(1.5, .08);
        aim = null;
    }

    function pot(b) {
        b.dead = true; b.vx = 0; b.vy = 0;
        if (b.cue) {
            scratchT = .9; shots = Math.max(0, shots - 1);
            sfx('sad'); buzz(30); fx.flash('#ef4444', .15);
            fx.text(180, 300, 'SCRATCH! -1 SHOT', { color: '#f87171', size: 18 });
        } else {
            potted++; streak++;
            sfx('cheer'); buzz(20);
            fx.text(b.x, b.y - 18, `${b.n} IN!${streak > 1 ? ' x' + streak : ''}`, { color: '#4ade80', size: 16 });
            fx.burst(b.x, b.y, { n: 10, colors: [b.col, '#fff'], speed: 140, life: .4, g: 90 });
            if (streak > 1) shots++;
        }
    }

    function update(dt) {
        if (scratchT > 0) {
            scratchT -= dt;
            if (scratchT <= 0) { cue.dead = false; cue.x = 180; cue.y = 410; cue.vx = 0; cue.vy = 0; }
        }
        for (const b of balls) {
            if (b.dead) continue;
            const sp0 = Math.hypot(b.vx, b.vy);
            const sp = Math.max(0, sp0 - 150 * dt - sp0 * .5 * dt);
            if (sp0 > 0) { b.vx *= sp / sp0; b.vy *= sp / sp0; }
            b.x += b.vx * dt; b.y += b.vy * dt;
            for (const [px, py] of POCKETS) {
                if (Math.hypot(b.x - px, b.y - py) < pocketRadius) { pot(b); break; }
            }
            if (b.dead) continue;
            if (b.x < L + BR) { b.x = L + BR; b.vx = Math.abs(b.vx) * .82; if (sp > 60) sfx('thud'); }
            if (b.x > R - BR) { b.x = R - BR; b.vx = -Math.abs(b.vx) * .82; if (sp > 60) sfx('thud'); }
            if (b.y < T + BR) { b.y = T + BR; b.vy = Math.abs(b.vy) * .82; if (sp > 60) sfx('thud'); }
            if (b.y > B - BR) { b.y = B - BR; b.vy = -Math.abs(b.vy) * .82; if (sp > 60) sfx('thud'); }
        }
        // ball-ball collisions
        for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
            const a = balls[i], b = balls[j];
            if (a.dead || b.dead) continue;
            const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
            if (d > 0 && d < BR * 2) {
                const nx = dx / d, ny = dy / d, ov = (BR * 2 - d) / 2;
                a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
                const dvn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
                if (dvn > 0) {
                    a.vx -= dvn * nx; a.vy -= dvn * ny;
                    b.vx += dvn * nx; b.vy += dvn * ny;
                    if (dvn > 120) { sfx('tap'); fx.burst((a.x + b.x) / 2, (a.y + b.y) / 2, { n: 4, colors: ['#fff'], speed: 60, life: .2, g: 40 }); }
                }
            }
        }
        if (!anyMoving() && scratchT <= 0) {
            if (potted >= 9) finish(true);
            else if (shots <= 0) finish(false);
        }
    }

    function finish(win) {
        end({
            win, head: win ? 'TABLE CLEARED!' : 'OUT OF SHOTS',
            lines: [`${potted}/9 balls potted`, win ? `${shots} shot${shots === 1 ? '' : 's'} to spare` : 'Combos earn bonus shots', win ? 'Rack champion of the lounge!' : 'Softer touch near the pockets'],
            stars: Math.max(1, Math.floor(potted / 2) + (win ? 3 : 0) + (win ? Math.min(3, shots) : 0))
        });
    }

    // ---------- drawing ----------
    function drawTable(c) {
        c.fillStyle = U.vgrad(c, 0, H, [[0, '#17101f'], [1, '#241433']]); c.fillRect(0, 0, W, H);
        // lounge ambience
        for (let i = 0; i < 5; i++) { U.glow(c, 40 + i * 70, 40, 24, 'rgba(125,211,252,.12)'); c.fillStyle = '#7dd3fc'; c.beginPath(); c.arc(40 + i * 70, 36, 3, 0, 7); c.fill(); }
        // wood rail
        U.rr(c, L - 26, T - 26, R - L + 52, B - T + 52, 20); c.fillStyle = '#5b3418'; c.fill();
        c.fillStyle = 'rgba(255,255,255,.08)'; U.rr(c, L - 26, T - 26, R - L + 52, 8, 6); c.fill();
        // cloth
        U.rr(c, L - 10, T - 10, R - L + 20, B - T + 20, 10); c.fillStyle = '#176b43'; c.fill();
        c.fillStyle = 'rgba(0,0,0,.12)';
        U.rr(c, L - 10, T - 10, R - L + 20, B - T + 20, 10); c.save(); c.clip();
        for (let i = 0; i < 9; i++) c.fillRect(L - 10, T - 10 + i * 44, R - L + 20, 22);
        c.restore();
        // baulk line + spot
        c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(L, 410); c.lineTo(R, 410); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(180, 200, 3, 0, 7); c.fill();
        // pockets
        for (const [px, py] of POCKETS) {
            c.fillStyle = '#2b1708'; c.beginPath(); c.arc(px, py, 17, 0, 7); c.fill();
            c.fillStyle = '#05080a'; c.beginPath(); c.arc(px, py, pocketRadius, 0, 7); c.fill();
            c.strokeStyle = 'rgba(255,215,130,.35)'; c.lineWidth = 2; c.beginPath(); c.arc(px, py, 15, 0, 7); c.stroke();
        }
    }

    function drawBalls(c) {
        for (const b of balls) {
            if (b.dead) continue;
            U.shadow(c, b.x, b.y + BR - 2, BR, 3.5, .4);
            const g = c.createRadialGradient(b.x - 3, b.y - 4, 2, b.x, b.y, BR + 1);
            g.addColorStop(0, '#fff'); g.addColorStop(.25, b.col); g.addColorStop(1, 'rgba(0,0,0,.55)');
            c.fillStyle = g; c.beginPath(); c.arc(b.x, b.y, BR, 0, 7); c.fill();
            if (!b.cue) {
                c.fillStyle = '#fff'; c.beginPath(); c.arc(b.x, b.y, 4.5, 0, 7); c.fill();
                U.text(c, `${b.n}`, b.x, b.y + .5, { size: 7, color: '#111' });
            }
        }
    }

    function drawAim(c) {
        if (!aim || anyMoving() || cue.dead) return;
        const len = Math.hypot(aim.dx, aim.dy);
        if (len < 6) return;
        const pow = U.clamp(len / 160, 0, 1);
        const col = pow > .8 ? '#f87171' : pow > .45 ? '#fde047' : '#4ade80';
        const ux = aim.dx / len, uy = aim.dy / len;
        c.setLineDash([5, 6]); c.strokeStyle = col; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(cue.x, cue.y); c.lineTo(cue.x + ux * guideLength, cue.y + uy * guideLength); c.stroke();
        c.setLineDash([]);
        // cue stick
        c.save(); c.translate(cue.x, cue.y); c.rotate(Math.atan2(-uy, -ux));
        const pull = 14 + pow * 36;
        c.fillStyle = '#c08437'; U.rr(c, pull, -3, 130, 6, 3); c.fill();
        c.fillStyle = '#e5d3b5'; U.rr(c, pull, -3, 22, 6, 3); c.fill();
        c.restore();
        U.text(c, `${Math.round(pow * 100)}%`, cue.x, cue.y - 26, { size: 13, color: col, stroke: 'rgba(0,0,0,.7)', lw: 3 });
    }

    function drawHud(c) {
        U.rr(c, 8, 8, 344, 36, 10); c.fillStyle = 'rgba(0,0,0,.65)'; c.fill();
        U.text(c, `BALLS ${potted}/9`, 70, 26, { size: 13, color: '#4ade80' });
        U.text(c, '🎱 RACK \u2019EM DMV', 180, 26, { size: 12, color: '#e879f9' });
        U.text(c, `SHOTS ${shots}`, 296, 26, { size: 13, color: shots <= 3 ? '#f87171' : '#fde047' });
        if (!anyMoving() && !aim && scratchT <= 0) U.text(c, 'PULL BACK FROM THE CUE BALL & RELEASE', 180, H - 36, { size: 11, color: '#fff', alpha: .55 + .35 * Math.sin(env.time() * 4), stroke: 'rgba(0,0,0,.7)', lw: 3 });
        if (scratchT > 0) U.text(c, 'RESPOTTING CUE BALL…', 180, H - 36, { size: 12, color: '#fca5a5', stroke: 'rgba(0,0,0,.7)', lw: 3 });
    }

    function draw(c) {
        drawTable(c);
        drawAim(c);
        drawBalls(c);
        drawHud(c);
    }

    return {
        title: '🎱 Rack \u2019Em DMV',
        goal: `Pot all 9 balls with ${SHOTS} starting shots`,
        intro: { head: 'RACK \u2019EM DMV', lines: ['Pull back from the cue ball, release to shoot', 'Pot all 9 balls before shots run out', 'Back-to-back pots earn bonus shots'] },
        init: start, start, update, draw, down, move, up, idle() { },
        _state: () => ({ shots, potted, balls, cue, pocketRadius, guideLength }),
        _set: o => { if (o.cue) Object.assign(cue, o.cue); }
    };
});
