'use strict';

// Neon Slide: assisted touch controls with bounded puck speed and a fallible CPU.
Minigames.register('airhockey', env => {
    const { W, H, U, sfx, buzz, fx, banner, end } = env;
    const L = 36, R = 324, T = 86, B = 514, MID = (T + B) / 2, PR = 13, MR = 30, WIN = 5;
    const rank = U.challenge(env.level);
    const opponentRadius = 23, goalWidth = 154 - rank * 2, playerGoalWidth = 78;
    const maxSpeed = 460 + rank * 12, cpuSpeed = 100 + rank * 12;

    let me, cpu, puck, pm, om, holdId, serveT, goalT, rallyV, ptX, ptY, reaction, cpuTarget, slowT, finished;

    function start() {
        me = 0; cpu = 0; holdId = null; ptX = 180; ptY = B - 60; finished = false;
        reaction = 0; cpuTarget = { x: 180, y: T + 54 };
        pm = { x: 180, y: B - 60, vx: 0, vy: 0, px: 180, py: B - 60 };
        om = { x: 180, y: T + 60, vx: 0, vy: 0 };
        serve('p');
    }

    function serve(who) {
        puck = { x: 180, y: who === 'p' ? MID + 70 : MID - 70, vx: 0, vy: 0 };
        serveT = .65; goalT = 0; rallyV = 0; slowT = 0;
    }

    function down(p) {
        if (holdId === null && p.y > MID - 30) { holdId = p.id; p.role = 'mallet'; ptX = p.x; ptY = p.y; }
    }
    function move(p) { if (p.role === 'mallet' && holdId === p.id) { ptX = p.x; ptY = p.y; } }
    function up(p) { if (p.role === 'mallet' && holdId === p.id) holdId = null; }

    const level = () => U.clamp((me + cpu) / 8 + cpu * .04, 0, 1);

    function malletHit(m, isPlayer) {
        const dx = puck.x - m.x, dy = puck.y - m.y, d = Math.hypot(dx, dy);
        const radius = isPlayer ? MR : opponentRadius;
        if (d < PR + radius) {
            const nx = d > .001 ? dx / d : 0, ny = d > .001 ? dy / d : isPlayer ? -1 : 1;
            puck.x = m.x + nx * (PR + radius + .5); puck.y = m.y + ny * (PR + radius + .5);
            const rel = (puck.vx - m.vx) * nx + (puck.vy - m.vy) * ny;
            if (isPlayer && dy <= radius * .7) {
                // A gentle contact is enough to return the puck; flicking is optional.
                puck.vx = U.clamp(dx * 5 + m.vx * .16, -220, 220);
                puck.vy = -Math.max(300, Math.abs(puck.vy) * .85 + Math.max(0, -m.vy) * .2);
            } else {
                if (rel < 0) { puck.vx -= 1.6 * rel * nx; puck.vy -= 1.6 * rel * ny; }
                puck.vx += m.vx * .18; puck.vy += m.vy * .18;
            }
            const sp = Math.hypot(puck.vx, puck.vy);
            if (sp > maxSpeed) { puck.vx *= maxSpeed / sp; puck.vy *= maxSpeed / sp; }
            sfx('tap'); if (isPlayer) buzz(10);
            fx.burst(puck.x, puck.y, { n: 6, colors: isPlayer ? ['#7dd3fc', '#fff'] : ['#f0abfc', '#fff'], speed: 110, life: .25, g: 0 });
        }
    }

    function goal(who) {
        if (goalT > 0) return;
        goalT = 1.2;
        if (who === 'p') { me++; sfx('cheer'); fx.flash('#4ade80', .2); banner('GOAL!', '#86efac', `${me} – ${cpu}`); }
        else { cpu++; sfx('sad'); buzz(40); banner('CPU SCORES', '#fca5a5', `${me} – ${cpu}`); }
        fx.burst(puck.x, puck.y, { n: 18, colors: ['#fde047', '#fff', who === 'p' ? '#4ade80' : '#f87171'], speed: 220, life: .5, g: 60 });
        fx.shake(4, .25);
    }

    function tick(dt) {
        if (finished) return;
        if (goalT > 0) {
            goalT -= dt;
            if (goalT <= 0) {
                if (me >= WIN || cpu >= WIN) { finish(); return; }
                serve((me + cpu) % 2 ? 'o' : 'p');
            }
            return;
        }
        serveT = Math.max(0, serveT - dt);
        const tx = U.clamp(holdId !== null ? ptX : puck.x, L + MR, R - MR);
        const ty = U.clamp(holdId !== null ? ptY : B - 55, MID + MR * .4, B - MR);
        const pd = Math.hypot(tx - pm.x, ty - pm.y) || 1;
        const movement = Math.min(pd, (holdId !== null ? 900 : 210) * dt);
        pm.vx = (tx - pm.x) / pd * movement / Math.max(dt, .001);
        pm.vy = (ty - pm.y) / pd * movement / Math.max(dt, .001);
        pm.x += pm.vx * dt; pm.y += pm.vy * dt;
        // CPU mallet
        const spd = (cpuSpeed + level() * 25) * dt;
        reaction -= dt;
        if (reaction <= 0) {
            reaction = .30 - rank * .012;
            const error = Math.sin(env.time() * 2.3) * (34 - rank * 2);
            cpuTarget.x = puck.y < MID ? puck.x + error : U.lerp(180, puck.x, .25);
            cpuTarget.y = puck.y < MID && puck.vy < 100 ? Math.min(puck.y + 12, MID - 36) : T + 54;
        }
        const gx = cpuTarget.x, gy = cpuTarget.y;
        const odx = gx - om.x, ody = gy - om.y, od = Math.hypot(odx, ody) || 1;
        const step = Math.min(od, spd);
        om.vx = odx / od * step / Math.max(dt, .001); om.vy = ody / od * step / Math.max(dt, .001);
        om.x += odx / od * step; om.y += ody / od * step;
        om.x = U.clamp(om.x, L + opponentRadius, R - opponentRadius);
        om.y = U.clamp(om.y, T + opponentRadius, MID - opponentRadius);
        // puck
        if (serveT <= 0) {
            puck.x += puck.vx * dt; puck.y += puck.vy * dt;
            const fr = Math.pow(.88, dt);
            puck.vx *= fr; puck.vy *= fr;
            slowT = Math.hypot(puck.vx, puck.vy) < 45 ? slowT + dt : 0;
            if (slowT > 2.5) { puck.vx = (180 - puck.x) * .35; puck.vy = 120; slowT = 0; }
        }
        if (puck.x < L + PR) { puck.x = L + PR; puck.vx = Math.abs(puck.vx) * .92; sfx('thud'); }
        if (puck.x > R - PR) { puck.x = R - PR; puck.vx = -Math.abs(puck.vx) * .92; sfx('thud'); }
        if (puck.y < T + PR) { if (Math.abs(puck.x - 180) < goalWidth / 2) { goal('p'); return; } puck.y = T + PR; puck.vy = Math.abs(puck.vy) * .92; sfx('thud'); }
        if (puck.y > B - PR) { if (Math.abs(puck.x - 180) < playerGoalWidth / 2) { goal('o'); return; } puck.y = B - PR; puck.vy = -Math.abs(puck.vy) * .92; sfx('thud'); }
        malletHit(pm, true);
        malletHit(om, false);
        rallyV = Math.hypot(puck.vx, puck.vy);
    }

    function update(dt) {
        const steps = Math.max(1, Math.ceil(dt / .008));
        for (let i = 0; i < steps && !finished; i++) tick(dt / steps);
    }

    function finish() {
        if (finished) return;
        finished = true;
        const win = me > cpu;
        end({
            win, head: win ? 'TABLE CHAMP!' : 'CPU TAKES IT',
            lines: [`Final score ${me} – ${cpu}`, 'Tap or drag to meet the puck; gentle hits return it', 'Release to let auto-guard help defend'],
            stars: 0
        });
    }

    // ---------- drawing ----------
    function drawTable(c) {
        c.fillStyle = U.vgrad(c, 0, H, [[0, '#120b22'], [1, '#1d1238']]); c.fillRect(0, 0, W, H);
        // table surface
        U.rr(c, L - 14, T - 14, R - L + 28, B - T + 28, 18); c.fillStyle = '#0b1b33'; c.fill();
        U.rr(c, L - 4, T - 4, R - L + 8, B - T + 8, 12); c.fillStyle = '#0e2747'; c.fill();
        // air holes
        c.fillStyle = 'rgba(255,255,255,.07)';
        for (let y = T + 18; y < B; y += 34) for (let x = L + 18; x < R; x += 34) { c.beginPath(); c.arc(x, y, 1.4, 0, 7); c.fill(); }
        // center line + circle
        c.strokeStyle = 'rgba(125,211,252,.5)'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(L, MID); c.lineTo(R, MID); c.stroke();
        c.beginPath(); c.arc(180, MID, 44, 0, 7); c.stroke();
        c.strokeStyle = 'rgba(232,121,249,.35)';
        c.beginPath(); c.arc(180, MID, 30, 0, 7); c.stroke();
        // goals
        for (const [gy, col, width] of [[T - 4, '#f0abfc', goalWidth], [B + 4, '#7dd3fc', playerGoalWidth]]) {
            U.glow(c, 180, gy, 60, col === '#7dd3fc' ? 'rgba(125,211,252,.25)' : 'rgba(240,171,252,.25)');
            c.strokeStyle = col; c.lineWidth = 5; c.lineCap = 'round';
            c.beginPath(); c.moveTo(180 - width / 2, gy); c.lineTo(180 + width / 2, gy); c.stroke();
        }
        c.lineCap = 'butt';
    }

    function mallet(c, m, col, glow, radius = MR) {
        U.glow(c, m.x, m.y, radius * 1.7, glow);
        U.shadow(c, m.x, m.y + radius - 4, radius, 6, .35);
        const g = c.createRadialGradient(m.x - 6, m.y - 8, 4, m.x, m.y, radius);
        g.addColorStop(0, '#fff'); g.addColorStop(.3, col); g.addColorStop(1, 'rgba(0,0,0,.5)');
        c.fillStyle = g; c.beginPath(); c.arc(m.x, m.y, radius, 0, 7); c.fill();
        c.fillStyle = col; c.beginPath(); c.arc(m.x, m.y, radius * .45, 0, 7); c.fill();
        c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(m.x - 4, m.y - 5, 4, 0, 7); c.fill();
    }

    function drawPuck(c) {
        const trail = Math.min(1, rallyV / 700);
        if (trail > .2) { U.glow(c, puck.x - puck.vx * .02, puck.y - puck.vy * .02, PR * 2.4, `rgba(253,224,71,${trail * .3})`); }
        U.glow(c, puck.x, puck.y, PR * 2, 'rgba(253,224,71,.3)');
        c.fillStyle = '#1f2937'; c.beginPath(); c.arc(puck.x, puck.y + 2, PR, 0, 7); c.fill();
        const g = c.createRadialGradient(puck.x - 3, puck.y - 4, 2, puck.x, puck.y, PR);
        g.addColorStop(0, '#fde047'); g.addColorStop(1, '#b45309');
        c.fillStyle = g; c.beginPath(); c.arc(puck.x, puck.y, PR, 0, 7); c.fill();
        c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 2; c.beginPath(); c.arc(puck.x, puck.y, PR * .6, 0, 7); c.stroke();
    }

    function drawHud(c) {
        U.rr(c, 8, 8, 344, 36, 10); c.fillStyle = 'rgba(0,0,0,.65)'; c.fill();
        U.text(c, 'YOU', 50, 26, { size: 12, color: '#7dd3fc' });
        U.text(c, `${me}`, 92, 26, { size: 20, color: '#fff' });
        U.text(c, '–', 180, 26, { size: 16, color: '#94a3b8' });
        U.text(c, `${cpu}`, 268, 26, { size: 20, color: '#fff' });
        U.text(c, 'CPU', 310, 26, { size: 12, color: '#f0abfc' });
        U.text(c, `FIRST TO ${WIN}`, 180, 62, { size: 10, color: 'rgba(255,255,255,.5)' });
        U.text(c, holdId === null ? 'AUTO-GUARD ON - TAP OR DRAG TO ATTACK' : 'GENTLE CONTACT RETURNS THE PUCK', 180, H - 18, { size: 10, color: '#fff' });
    }

    function draw(c) {
        drawTable(c);
        mallet(c, om, '#e879f9', 'rgba(232,121,249,.3)', opponentRadius);
        drawPuck(c);
        mallet(c, pm, '#38bdf8', 'rgba(56,189,248,.3)');
        drawHud(c);
    }

    return {
        title: '🏒 Neon Slide',
        goal: 'Beat the CPU to 5 goals',
        intro: { head: 'NEON SLIDE', lines: ['Tap or drag anywhere in your half', 'A gentle hit sends the puck forward', 'Release for automatic goal guarding', `Larger target goal - first to ${WIN}`] },
        init: start, start, update, draw, down, move, up, idle() { },
        _state: () => ({ me, cpu, puck, pm, om, cpuSpeed, maxSpeed, goalWidth, playerGoalWidth, holdId, finished }),
        _set: o => { if (o.puck) Object.assign(puck, o.puck); }
    };
});
