'use strict';

// Gridiron Rush: drag to steer, tap to spin. Four downs to move the chains; two drives.
Minigames.register('football', env => {
    const { W, H, U, sfx, buzz, fx, banner, end } = env;
    const PXY = 24, PY = 420, L = 24, R = 336;
    const rank = U.challenge(env.level), target = rank >= 4 ? 2 : 1;
    const pressure = U.pressure(env.level), pursuit = 1 + pressure * .95;
    const spinDuration = .42 - pressure * .14, spinCooldown = 1.5 + pressure * 1.3;
    const DEF = {
        line: { w: 38, lat: 50, vy: 1.2, color: '#1e40af', name: 'LINEMAN' },
        lb: { w: 30, lat: 92, vy: 2.0, color: '#0f766e', name: 'LB' },
        safety: { w: 26, lat: 132, vy: 2.6, color: '#7e22ce', name: 'SAFETY' }
    };
    let drive, downN, spot, firstLine, py, px, tx, steer, phase, phaseT, defs, pads, spinT, spinCd, boostT;
    let tds, total, gainThisPlay, tackler, speedNow, lastGain;

    const sy = Y => PY - (Y - py) * PXY;
    const ordinal = n => ['1st', '2nd', '3rd', '4th'][n - 1];

    function start() {
        drive = 1; tds = 0; total = 0;
        newDrive();
    }
    function newDrive() {
        downN = 1; spot = 20; firstLine = 30;
        startPlay();
    }
    function startPlay() {
        py = spot; px = 180; tx = 180; steer = null; phase = 'pre'; phaseT = 1.1; spinT = 0; spinCd = 0; boostT = 0;
        gainThisPlay = 0; tackler = null; speedNow = 6;
        defs = []; pads = [];
        const n = Math.floor(Math.min(9 + rank, 4 + rank + Math.floor(spot / 20) + (drive - 1)));
        let y = spot + 6;
        for (let i = 0; i < n && y < 99; i++) {
            const r = Math.random();
            const k = r < .42 ? 'line' : r < .8 ? 'lb' : 'safety';
            defs.push({ k, w: DEF[k].w, x: U.rand(L + 24, R - 24), y, juked: false, flash: 0, face: 0 });
            y += U.rand(3.4, 5.6) * (1 - pressure * .25);
        }
        if (spot < 80) defs.push({ k: 'safety', w: 26, x: U.rand(80, 280), y: Math.min(99, spot + 24), juked: false, flash: 0, face: 0 });
        for (let i = 0; i < 2; i++) pads.push({ x: U.rand(L + 30, R - 30), y: spot + 8 + i * 12 + U.rand(0, 5), used: false });
        fx.text(180, 300, `${ordinal(downN)} & ${Math.max(1, Math.round(firstLine - spot))}`, { color: '#fde047', size: 26, life: 1.2, vy: -20 });
    }

    function down(p) {
        if (steer === null) { steer = p.id; p.off = px - p.x; tx = p.x + p.off; p.role = 'steer'; }
    }
    function move(p) { if (p.role === 'steer') tx = p.x + p.off; }
    function up(p) {
        if (p.role === 'steer') steer = null;
        if (!p.cancelled && p.len < 16 && p.dur < .28) spin();
    }
    function spin() {
        if (spinCd > 0 || phase !== 'run') return;
        spinT = spinDuration; spinCd = spinCooldown; sfx('whoosh'); buzz(12);
        fx.burst(px, PY, { n: 10, colors: ['#fde047', '#fff'], speed: 120, life: .4 });
    }

    function speedOf() {
        return Math.min(8.6, 6 + gainThisPlay * .035) * (boostT > 0 ? 1.45 : 1);
    }

    function update(dt) {
        phaseT -= dt; spinCd = Math.max(0, spinCd - dt); spinT = Math.max(0, spinT - dt); boostT = Math.max(0, boostT - dt);
        px += U.clamp(tx - px, -460 * dt, 460 * dt);
        px = U.clamp(px, L + 12, R - 12);
        defs.forEach(d => { if (d.flash > 0) d.flash -= dt; });
        if (phase === 'pre') { if (phaseT <= 0) phase = 'run'; return; }
        if (phase === 'run') {
            speedNow = speedOf();
            py += speedNow * dt;
            gainThisPlay = py - spot;
            for (const d of defs) {
                const spec = DEF[d.k];
                if (d.y > py - 2) {
                    d.y -= spec.vy * dt * (d.y - py > 14 ? 1.6 : 1) * (1 + pressure * .35);
                    const lead = U.clamp(px + (tx - px) * (.25 + pressure * .35), L + 12, R - 12);
                    d.x += U.clamp(lead - d.x, -spec.lat * dt * pursuit, spec.lat * dt * pursuit) * (1 + drive * .06);
                    d.face = Math.atan2(lead - d.x, 1);
                }
                const dy = (d.y - py) * PXY;
                if (!d.juked && Math.abs(dy) < 17 && Math.abs(d.x - px) < d.w / 2 + 10) {
                    if (spinT > 0) { d.juked = true; d.flash = .3; fx.text(d.x, sy(d.y) - 20, 'JUKE!', { color: '#fde047', size: 20 }); sfx('coin'); buzz(15); }
                    else { tackle(d); return; }
                }
            }
            for (const p of pads) {
                if (!p.used && Math.abs(p.y - py) < .7 && Math.abs(p.x - px) < 24) {
                    p.used = true; boostT = 1.3; sfx('swish'); fx.text(px, PY - 30, 'BOOST!', { color: '#4ade80', size: 22 });
                }
            }
            if (py >= 100) touchdown();
        } else if (phase === 'tackled') {
            if (phaseT <= 0) afterPlay();
        } else if (phase === 'td') {
            if (phaseT <= 0) afterScore();
        }
    }

    function tackle(d) {
        phase = 'tackled'; phaseT = 1.35; tackler = d;
        lastGain = Math.max(0, Math.round(py - spot));
        total += lastGain;
        sfx('hit'); fx.shake(9, .35); buzz([40, 30, 40]);
        fx.burst(px, PY, { n: 20, colors: ['#a3e635', '#65a30d', '#fff'], speed: 190, life: .7 });
        banner('TACKLED', '#fca5a5', lastGain ? `+${lastGain} yds` : 'No gain');
    }

    function afterPlay() {
        spot = Math.min(99, spot + lastGain);
        if (spot >= firstLine) {
            downN = 1; firstLine = Math.min(100, spot + 10);
            banner('FIRST DOWN!', '#fde047'); sfx('cheer');
        } else {
            downN++;
            if (downN > 4) { turnover(); return; }
        }
        startPlay();
    }

    function touchdown() {
        phase = 'td'; phaseT = 2.4; tds++;
        total += Math.max(0, Math.round(100 - spot));
        banner('TOUCHDOWN!', '#fde047', '+7');
        fx.flash('#fde047', .5); sfx('cheer'); buzz([60, 40, 60, 40, 90]); fx.shake(6, .4);
        for (let i = 0; i < 4; i++) fx.burst(U.rand(60, 300), U.rand(150, 380), { n: 18, colors: ['#fde047', '#f87171', '#60a5fa', '#fff'], speed: 220, g: 200, shape: 'rect', life: 1.1 });
    }
    function afterScore() {
        if (drive >= 2) { finish(); return; }
        drive++; newDrive();
    }
    function turnover() {
        banner('TURNOVER ON DOWNS', '#fca5a5'); sfx('sad');
        phase = 'td'; phaseT = 1.8;
    }

    function finish() {
        const stars = Math.min(10, 1 + Math.floor(total / 40) + 3 * tds);
        end({
            win: tds >= target, head: tds >= target ? 'WINNING DRIVE!' : 'FINAL WHISTLE',
            lines: [`${tds} touchdown${tds === 1 ? '' : 's'} in 2 drives`, `${total} total rushing yards`, tds ? 'Great vision and cuts' : 'Spin through the defenders to break free']
        , stars });
    }

    // ---------- drawing ----------
    function drawField(c) {
        c.fillStyle = '#10151f'; c.fillRect(0, 0, W, H);
        const y0 = py - (H - PY) / PXY - 1, y1 = py + PY / PXY + 1;
        c.fillStyle = '#121a2a'; c.fillRect(0, 0, L - 4, H); c.fillRect(R + 4, 0, W - R - 4, H);
        for (let i = Math.floor(y0 / 2); i < Math.ceil(y1 / 2); i++) {
            const y = sy(i * 2);
            for (const x of [6, 14]) {
                const h = U.hash(i, x);
                c.fillStyle = ['#7c3aed', '#be123c', '#0e7490', '#b45309', '#475569'][h % 5];
                c.beginPath(); c.arc(x, y - 5, 4, 0, 7); c.fill();
                c.beginPath(); c.arc(W - x, y - 5, 4, 0, 7); c.fill();
            }
        }
        // stripes
        for (let Y = Math.floor(y0 / 5) * 5; Y < y1; Y += 5) {
            const top = sy(Y + 5), h = PXY * 5;
            const inEnd = Y < 0 || Y >= 100;
            c.fillStyle = inEnd ? (Y >= 100 ? '#7f1d1d' : '#1e3a8a') : (Math.floor(Y / 5) % 2 ? '#2d7a3a' : '#276e34');
            c.fillRect(L, top, R - L, h + 1);
        }
        // yard lines
        c.lineWidth = 2;
        for (let Y = Math.ceil(y0); Y <= y1; Y++) {
            if (Y < 0 || Y > 100) continue;
            const y = sy(Y);
            if (Y % 5 === 0) { c.strokeStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.moveTo(L, y); c.lineTo(R, y); c.stroke(); }
            else { c.strokeStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(L + 44, y); c.lineTo(L + 52, y); c.moveTo(R - 52, y); c.lineTo(R - 44, y); c.stroke(); }
            if (Y % 10 === 0 && Y > 0 && Y < 100) {
                const n = Y <= 50 ? Y : 100 - Y;
                U.text(c, String(n), L + 20, y - 14, { size: 14, color: 'rgba(255,255,255,.55)' });
                U.text(c, String(n), R - 20, y - 14, { size: 14, color: 'rgba(255,255,255,.55)' });
            }
        }
        if (y1 > 100) U.text(c, 'TOUCHDOWN', W / 2, sy(105), { size: 30, color: '#fde68a', alpha: .6 });
        c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(L, -5, R - L, H + 10);
        // scrimmage + first down
        const ls = sy(spot);
        c.fillStyle = 'rgba(56,189,248,.8)'; c.fillRect(L, ls - 2, R - L, 4);
        if (firstLine <= 100) { c.fillStyle = 'rgba(250,204,21,.95)'; c.fillRect(L, sy(firstLine) - 3, R - L, 6); }
        // goalposts hint
        pads.forEach(p => {
            if (p.used) return;
            const y = sy(p.y);
            c.fillStyle = 'rgba(74,222,128,.35)'; U.rr(c, p.x - 20, y - 14, 40, 28, 8); c.fill();
            c.strokeStyle = '#4ade80'; c.lineWidth = 3;
            for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(p.x - 9, y + 6 - i * 9 + 4); c.lineTo(p.x, y - 3 - i * 9 + 4); c.lineTo(p.x + 9, y + 6 - i * 9 + 4); c.stroke(); }
        });
    }

    function drawDef(c, d) {
        const y = sy(d.y), spec = DEF[d.k];
        if (y < -40 || y > H + 40) return;
        c.save(); c.translate(d.x, y);
        U.shadow(c, 2, 4, d.w * .5, 10, .3);
        const lean = d.juked ? .7 : 0;
        c.rotate(d.face * .6 + lean);
        const wob = Math.sin(env.time() * 12 + d.x) * 1.5;
        c.fillStyle = '#e5e7eb'; c.fillRect(-d.w * .36, 5 + wob, 6, 9); c.fillRect(d.w * .36 - 6, 5 - wob, 6, 9);
        U.rr(c, -d.w / 2, -9, d.w, 20, 9);
        c.fillStyle = d.flash > 0 ? '#fff' : spec.color; c.fill();
        c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 1.5; c.stroke();
        c.fillStyle = '#e2e8f0'; c.beginPath(); c.arc(0, 1, d.w * .22, 0, 7); c.fill();
        c.fillStyle = spec.color; c.fillRect(-1.5, -d.w * .2, 3, d.w * .4);
        c.restore();
    }

    function drawRunner(c) {
        const bob = Math.sin(env.time() * 15) * 1.6;
        c.save(); c.translate(px, PY);
        if (boostT > 0) { U.glow(c, 0, 20, 50, 'rgba(74,222,128,.8)', .8); }
        if (spinT > 0) {
            c.strokeStyle = 'rgba(253,224,71,.7)'; c.lineWidth = 4;
            c.beginPath(); c.arc(0, 0, 26, 0, Math.PI * 2 * (spinT / .42)); c.stroke();
            c.rotate((1 - spinT / .42) * Math.PI * 2);
        }
        if (phase === 'tackled') c.rotate(.5);
        U.shadow(c, 3, 6, 17, 10, .35);
        c.fillStyle = '#e5e7eb'; c.fillRect(-9, 6 + bob, 6, 11); c.fillRect(3, 6 - bob, 6, 11);
        U.rr(c, -15, -9, 30, 21, 10); c.fillStyle = '#9f1239'; c.fill();
        c.strokeStyle = '#fbbf24'; c.lineWidth = 2.5; c.stroke();
        c.fillStyle = '#fbbf24'; c.beginPath(); c.arc(0, 1, 8.5, 0, 7); c.fill();
        c.fillStyle = '#7f1d1d'; c.fillRect(-1.5, -7, 3, 16);
        c.save(); c.translate(11, -2); c.rotate(.5); c.fillStyle = '#92400e'; c.beginPath(); c.ellipse(0, 0, 6.5, 4, 0, 0, 7); c.fill();
        c.strokeStyle = '#fff'; c.lineWidth = 1; c.beginPath(); c.moveTo(-3, 0); c.lineTo(3, 0); c.stroke(); c.restore();
        c.restore();
    }

    function drawHud(c) {
        U.rr(c, 8, 8, 344, 42, 12); c.fillStyle = 'rgba(0,0,0,.65)'; c.fill();
        U.text(c, `DRIVE ${drive}/2`, 62, 22, { size: 12, color: '#93c5fd' });
        U.text(c, `${ordinal(Math.min(4, downN))} & ${Math.max(1, Math.round(firstLine - Math.min(py, spot + 99)))}`, 180, 22, { size: 16, color: '#fde047' });
        U.text(c, `🏈 ${tds} TD`, 300, 22, { size: 13, color: '#fff' });
        const prog = U.clamp(py / 100, 0, 1);
        U.rr(c, 20, 36, 320, 7, 3); c.fillStyle = 'rgba(255,255,255,.15)'; c.fill();
        U.rr(c, 20, 36, Math.max(6, 320 * prog), 7, 3); c.fillStyle = '#4ade80'; c.fill();
        const fl = U.clamp(firstLine / 100, 0, 1); c.fillStyle = '#facc15'; c.fillRect(20 + 320 * fl - 1.5, 33, 3, 13);
        U.text(c, `${Math.max(0, Math.round(py - spot))} yds this play`, 180, 62, { size: 11, color: '#fff', alpha: .8, stroke: 'rgba(0,0,0,.6)', lw: 3 });
        // spin button indicator
        const r = 24, bx = W - 40, by = H - 40, ready = spinCd <= 0;
        c.beginPath(); c.arc(bx, by, r, 0, 7); c.fillStyle = ready ? 'rgba(250,204,21,.85)' : 'rgba(0,0,0,.6)'; c.fill();
        c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
        if (!ready) { c.beginPath(); c.moveTo(bx, by); c.arc(bx, by, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - spinCd / 1.5)); c.fillStyle = 'rgba(255,255,255,.3)'; c.fill(); }
        U.text(c, '🌀', bx, by - 2, { size: 20 }); U.text(c, 'TAP', bx, by + 17, { size: 8, color: ready ? '#1f2937' : '#fff' });
        if (phase === 'pre' && phaseT > 0) U.text(c, 'DRAG TO STEER · TAP TO SPIN', W / 2, 500, { size: 12, color: '#fff', alpha: .8, stroke: 'rgba(0,0,0,.7)', lw: 3 });
    }

    function draw(c) {
        drawField(c);
        const list = defs.slice().sort((a, b) => b.y - a.y);
        list.forEach(d => drawDef(c, d));
        if (phase !== 'tackled' || phaseT > 0) drawRunner(c);
        drawHud(c);
    }

    return {
        title: '🏈 Gridiron Rush',
        goal: `Score ${target} touchdown${target === 1 ? '' : 's'} in 2 drives`,
        intro: { head: 'GRIDIRON RUSH', lines: ['Drag to steer · tap to SPIN', 'Weave through the defense', 'Move the chains · score TDs'] },
        init: start, start, update, draw, down, move, up, idle() { },
        _state: () => ({ drive, downN, spot, py, px, phase, tds, total, defs, firstLine, pursuit, spinDuration, spinCooldown }),
        _set: o => { if (o.py !== undefined) py = o.py; if (o.defs) defs = o.defs; if (o.spot !== undefined) spot = o.spot; }
    };
});
