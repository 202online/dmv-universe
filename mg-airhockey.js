'use strict';

// Neon Slide: lounge air hockey. Drag your mallet anywhere in your half. First to 5 against a CPU that speeds up.
Minigames.register('airhockey', env => {
    const { W, H, U, sfx, buzz, fx, banner, end } = env;
    const L = 36, R = 324, T = 86, B = 514, MID = (T + B) / 2, GW = 110, PR = 13, MR = 26, WIN = 5;
    const rank = U.challenge(env.level);

    let me, cpu, puck, pm, om, holdId, serveT, goalT, rallyV, ptX, ptY;

    function start() {
        me = 0; cpu = 0; holdId = null; ptX = 180; ptY = B - 60;
        pm = { x: 180, y: B - 60, vx: 0, vy: 0, px: 180, py: B - 60 };
        om = { x: 180, y: T + 60, vx: 0, vy: 0 };
        serve('p');
    }

    function serve(who) {
        puck = { x: 180, y: who === 'p' ? MID + 70 : MID - 70, vx: 0, vy: 0 };
        serveT = .5; goalT = 0; rallyV = 0;
    }

    function down(p) {
        if (holdId === null && p.y > MID - 30) { holdId = p.id; p.role = 'mallet'; ptX = p.x; ptY = p.y; }
    }
    function move(p) { if (p.role === 'mallet' && holdId === p.id) { ptX = p.x; ptY = p.y; } }
    function up(p) { if (p.role === 'mallet') holdId = null; }

    const level = () => U.clamp((me + cpu) / 8 + cpu * .04, 0, 1);

    function malletHit(m, isPlayer) {
        const dx = puck.x - m.x, dy = puck.y - m.y, d = Math.hypot(dx, dy);
        if (d > 0 && d < PR + MR) {
            const nx = dx / d, ny = dy / d;
            puck.x = m.x + nx * (PR + MR + .5); puck.y = m.y + ny * (PR + MR + .5);
            const rel = (puck.vx - m.vx) * nx + (puck.vy - m.vy) * ny;
            if (rel < 0) { puck.vx -= 1.85 * rel * nx; puck.vy -= 1.85 * rel * ny; }
            puck.vx += m.vx * .45; puck.vy += m.vy * .45;
            const sp = Math.hypot(puck.vx, puck.vy);
            if (sp > 980) { puck.vx *= 980 / sp; puck.vy *= 980 / sp; }
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

    function update(dt) {
        if (goalT > 0) {
            goalT -= dt;
            if (goalT <= 0) {
                if (me >= WIN || cpu >= WIN) { finish(); return; }
                serve((me + cpu) % 2 ? 'o' : 'p');
            }
            return;
        }
        serveT = Math.max(0, serveT - dt);
        // player mallet follows the active pointer
        if (holdId !== null) {
            const tx = U.clamp(ptX, L + MR, R - MR), ty = U.clamp(ptY, MID + MR * .4, B - MR);
            pm.vx = (tx - pm.x) / Math.max(dt, .001); pm.vy = (ty - pm.y) / Math.max(dt, .001);
            const vcap = 1600, vs = Math.hypot(pm.vx, pm.vy);
            if (vs > vcap) { pm.vx *= vcap / vs; pm.vy *= vcap / vs; }
            pm.x = tx; pm.y = ty;
        } else { pm.vx *= .7; pm.vy *= .7; }
        // CPU mallet
        const spd = (240 + level() * 260 + rank * 70) * dt;
        let gx = 180, gy = T + 54;
        if (puck.y < MID + 40 && puck.vy < 200) {
            gx = puck.x; gy = Math.min(puck.y - 6, MID - 34);
            if (puck.y < T + 150 && Math.abs(puck.x - om.x) < 50) gy = puck.y + 4; // attack push
        } else { gx = U.lerp(180, puck.x, Math.min(.95, .35 + rank * .1)); }
        const odx = gx - om.x, ody = gy - om.y, od = Math.hypot(odx, ody) || 1;
        const step = Math.min(od, spd);
        om.vx = odx / od * step / Math.max(dt, .001); om.vy = ody / od * step / Math.max(dt, .001);
        om.x += odx / od * step; om.y += ody / od * step;
        om.x = U.clamp(om.x, L + MR, R - MR); om.y = U.clamp(om.y, T + MR, MID - MR * .4);
        // puck
        if (serveT <= 0) {
            puck.x += puck.vx * dt; puck.y += puck.vy * dt;
            const fr = Math.pow(.32, dt);
            puck.vx *= fr; puck.vy *= fr;
        }
        const inGoalX = Math.abs(puck.x - 180) < GW / 2;
        if (puck.x < L + PR) { puck.x = L + PR; puck.vx = Math.abs(puck.vx) * .92; sfx('thud'); }
        if (puck.x > R - PR) { puck.x = R - PR; puck.vx = -Math.abs(puck.vx) * .92; sfx('thud'); }
        if (puck.y < T + PR) { if (inGoalX) { goal('p'); return; } puck.y = T + PR; puck.vy = Math.abs(puck.vy) * .92; sfx('thud'); }
        if (puck.y > B - PR) { if (inGoalX) { goal('o'); return; } puck.y = B - PR; puck.vy = -Math.abs(puck.vy) * .92; sfx('thud'); }
        malletHit(pm, true);
        malletHit(om, false);
        rallyV = Math.hypot(puck.vx, puck.vy);
    }

    function finish() {
        const win = me > cpu;
        end({
            win, head: win ? 'TABLE CHAMP!' : 'CPU TAKES IT',
            lines: [`Final score ${me} – ${cpu}`, win ? 'Ice cold under the neon.' : 'Flick through the puck for power shots', 'Defend your goal mouth!'],
            stars: Math.max(1, me + (win ? 2 : 0))
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
        for (const [gy, col] of [[T - 4, '#f0abfc'], [B + 4, '#7dd3fc']]) {
            U.glow(c, 180, gy, 60, col === '#7dd3fc' ? 'rgba(125,211,252,.25)' : 'rgba(240,171,252,.25)');
            c.strokeStyle = col; c.lineWidth = 5; c.lineCap = 'round';
            c.beginPath(); c.moveTo(180 - GW / 2, gy); c.lineTo(180 + GW / 2, gy); c.stroke();
        }
        c.lineCap = 'butt';
    }

    function mallet(c, m, col, glow) {
        U.glow(c, m.x, m.y, MR * 1.7, glow);
        U.shadow(c, m.x, m.y + MR - 4, MR, 6, .35);
        const g = c.createRadialGradient(m.x - 6, m.y - 8, 4, m.x, m.y, MR);
        g.addColorStop(0, '#fff'); g.addColorStop(.3, col); g.addColorStop(1, 'rgba(0,0,0,.5)');
        c.fillStyle = g; c.beginPath(); c.arc(m.x, m.y, MR, 0, 7); c.fill();
        c.fillStyle = col; c.beginPath(); c.arc(m.x, m.y, MR * .45, 0, 7); c.fill();
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
        if (me + cpu === 0 && holdId === null) U.text(c, 'DRAG IN YOUR HALF TO MOVE THE MALLET', 180, H - 18, { size: 11, color: '#fff', alpha: .55 + .35 * Math.sin(env.time() * 4), stroke: 'rgba(0,0,0,.7)', lw: 3 });
    }

    function draw(c) {
        drawTable(c);
        mallet(c, om, '#e879f9', 'rgba(232,121,249,.3)');
        drawPuck(c);
        mallet(c, pm, '#38bdf8', 'rgba(56,189,248,.3)');
        drawHud(c);
    }

    return {
        title: '🏒 Neon Slide',
        goal: 'Beat the CPU to 5 goals',
        intro: { head: 'NEON SLIDE', lines: ['Drag in your half to move the mallet', 'Flick through the puck for power shots', `First to ${WIN} wins the table`] },
        init: start, start, update, draw, down, move, up, idle() { },
        _state: () => ({ me, cpu, puck, pm, om }),
        _set: o => { if (o.puck) Object.assign(puck, o.puck); }
    };
});
