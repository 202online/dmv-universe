'use strict';

Minigames.register('basketball', env => {
    const { W, H, U, sfx, buzz, fx, banner, end } = env;
    const START = { x: 180, y: 478 }, HOOP_Y = 196, IDEAL = 150;
    const rank = (env.level || 1) - 1, target = 6 + rank * 2;
    let time, points, baskets, streak, best, shots, ball, aim, hoopT, readyIn, lastLevel, swishes, fire;

    const level = () => 1 + rank + Math.floor(points / 8);
    const rimR = () => Math.max(20, 31 - (level() >= 3 ? 4 : 0) - Math.max(0, level() - 4) * 2);
    const hoopAt = t => {
        const lv = level();
        if (lv < 2) return { x: W / 2, y: HOOP_Y };
        const amp = Math.min(105, 55 + lv * 14), sp = .9 + Math.min(lv, 7) * .25;
        return { x: W / 2 + amp * Math.sin(t * sp), y: HOOP_Y + (lv >= 4 ? 14 * Math.sin(t * 1.7) : 0) };
    };

    function start() {
        time = 45 - rank * 2; points = 0; baskets = 0; streak = 0; best = 0; shots = 0; ball = null; aim = null;
        hoopT = 0; readyIn = 0; lastLevel = level(); swishes = 0; fire = 0;
    }
    start();

    function down(p) { if (!ball && readyIn <= 0) aim = p; }
    function move() { }
    function up(p) {
        if (!aim || aim !== p) return;
        aim = null;
        const power = -p.dy;
        if (power < 35 || p.cancelled) return;
        shoot(p.dx, power);
    }

    function landing(dx, power) { return START.x + dx / Math.max(30, power) * 260; }

    function shoot(dx, power) {
        const T = .85 + clamp01((power - 90) / 160) * .15;
        const arrive = hoopAt(hoopT + T);
        const lx = landing(dx, power);
        const ex = lx - arrive.x, perr = (power - IDEAL) / IDEAL;
        const R = rimR();
        let kind;
        if (perr < -.42) kind = 'short';
        else if (perr > .45) kind = 'long';
        else if (Math.abs(ex) < R * .35 && Math.abs(perr) < .13) kind = 'swish';
        else if (Math.abs(ex) < R * .8 && Math.abs(perr) < .27) kind = 'in';
        else if (Math.abs(ex) < R * 1.5 && Math.abs(perr) < .38) kind = Math.random() < .3 ? 'in' : 'rim';
        else kind = Math.abs(ex) > R * 2.8 ? 'air' : 'rim';
        if (kind === 'long' && Math.abs(ex) < R * 1.2 && Math.random() < .55) kind = 'bank';
        shots++;
        ball = { t: 0, T, x0: START.x, tx: arrive.x + (kind === 'short' || kind === 'air' ? ex : ex * .3), ty: arrive.y, kind, peak: 120 + power * .45, rot: 0, ex, done: false, resolved: false, fall: 0, bx: 0, by: 0, bvx: 0, bvy: 0 };
        sfx('whoosh'); buzz(10);
    }

    function clamp01(v) { return Math.max(0, Math.min(1, v)); }

    function scoreBall(kind) {
        const mult = streak >= 3 ? 2 : 1;
        const base = kind === 'swish' ? 3 : 2;
        const gain = base * mult;
        points += gain; baskets++; streak++; best = Math.max(best, streak);
        time += kind === 'swish' ? 2 : 1;
        const h = hoopAt(hoopT);
        if (kind === 'swish') { swishes++; sfx('swish'); banner('SWISH!', '#fde047', `+${gain}${mult > 1 ? ' · ON FIRE' : ''}`); fx.flash('#fde047', .2); }
        else { sfx('rim'); fx.text(h.x, h.y - 30, `+${gain}`, { color: '#86efac', size: 26 }); }
        fx.burst(h.x, h.y + 10, { n: 24, colors: ['#fde047', '#f97316', '#fff'], speed: 220, g: 260, shape: 'rect' });
        buzz(kind === 'swish' ? [20, 30, 20] : 20);
        if (level() > lastLevel) { lastLevel = level(); fx.text(W / 2, 300, `PACE ${lastLevel}`, { color: '#38bdf8', size: 30, life: 1.4 }); }
    }

    function miss(label) {
        streak = 0; sfx('thud');
        fx.text(START.x, 380, label, { color: '#fca5a5', size: 22 });
    }

    function update(dt) {
        hoopT += dt;
        time -= dt;
        fire = streak >= 3 ? Math.min(1, fire + dt * 3) : Math.max(0, fire - dt * 3);
        if (readyIn > 0) readyIn -= dt;
        if (ball) {
            const b = ball;
            if (!b.done) {
                b.t += dt / b.T; b.rot += dt * 9;
                if (b.t >= 1) {
                    b.t = 1; b.done = true;
                    const h = hoopAt(hoopT);
                    b.bx = b.x0 + (b.tx - b.x0); b.by = h.y;
                    if (b.kind === 'swish' || b.kind === 'in') { b.resolved = 'in'; b.fall = 0; scoreBall(b.kind); }
                    else if (b.kind === 'bank') { b.resolved = 'in'; b.fall = 0; sfx('thud'); scoreBall('in'); fx.text(h.x, h.y - 60, 'BANK', { color: '#7dd3fc' }); }
                    else if (b.kind === 'rim') { b.resolved = 'rim'; b.bvx = U.rand(-90, 90); b.bvy = -140; sfx('rim'); fx.shake(3, .15); miss('RIM OUT'); }
                    else { b.resolved = 'miss'; b.bvx = U.rand(-60, 60); b.bvy = -60; miss(b.kind === 'short' ? 'SHORT' : b.kind === 'long' ? 'LONG' : 'AIRBALL'); }
                }
            } else {
                b.fall += dt;
                if (b.resolved !== 'in') { b.bvy += 520 * dt; b.bx += b.bvx * dt; b.by += b.bvy * dt; }
                if (b.fall > (b.resolved === 'in' ? .55 : .9)) { ball = null; readyIn = .25; }
            }
        }
        if (time <= 0 && !ball) finish();
        else if (time <= 0) time = 0;
    }

    function finish() {
        const stars = Math.min(10, 1 + Math.floor(baskets / 2));
        end({
            win: baskets >= target, head: baskets >= target ? 'BUZZER BEATER!' : 'FINAL BUZZER',
            lines: [`${points} points · ${baskets}/${shots} made`, `Best streak ${best} · ${swishes} swishes`, `Goal: ${target} baskets`], stars
        });
    }

    function ballPos(b) {
        const u = b.t, e = U.ease(Math.min(1, u));
        const h = hoopAt(hoopT);
        const x = U.lerp(b.x0, b.tx, u);
        const gy = U.lerp(START.y, h.y, u);
        const y = gy - 4 * b.peak * u * (1 - u);
        return { x, y, r: U.lerp(26, 13, e) };
    }

    function drawCourt(c) {
        c.fillStyle = U.vgrad(c, 0, 190, [[0, '#0a1024'], [1, '#1b2545']]); c.fillRect(0, 0, W, 190);
        U.crowd(c, 0, 40, W, 130, { rows: 5, gap: 16, t: env.time(), amp: fire * .8 + (streak ? .15 : 0), dim: .35, seed: 3 });
        // scoreboard
        U.rr(c, 100, 8, 160, 40, 8); c.fillStyle = '#05070f'; c.fill(); c.strokeStyle = '#334155'; c.lineWidth = 2; c.stroke();
        U.text(c, String(points).padStart(3, '0'), 150, 29, { size: 24, color: '#f87171', font: 'monospace' });
        U.text(c, String(Math.max(0, Math.ceil(time))).padStart(2, '0'), 222, 29, { size: 24, color: time < 10 ? '#fbbf24' : '#4ade80', font: 'monospace' });
        U.text(c, 'PTS', 150, 12, { size: 8, color: '#94a3b8' }); U.text(c, 'TIME', 222, 12, { size: 8, color: '#94a3b8' });
        // floor
        c.fillStyle = U.vgrad(c, 190, H, [[0, '#a8672b'], [1, '#d69148']]); c.fillRect(0, 190, W, H - 190);
        for (let i = 0; i < 14; i++) {
            const y = 190 + Math.pow(i / 14, 1.6) * (H - 190);
            c.strokeStyle = 'rgba(70,35,8,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
        }
        c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(70, 196); c.lineTo(20, H); c.moveTo(290, 196); c.lineTo(340, H); c.stroke();
        c.beginPath(); c.ellipse(180, 380, 110, 46, 0, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.ellipse(180, 700, 230, 300, 0, Math.PI, 0); c.stroke();
        c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(0, 190, W, 6);
    }

    function drawHoop(c, front) {
        const h = hoopAt(hoopT), R = rimR(), x = h.x, y = h.y;
        if (!front) {
            // pole and backboard
            c.fillStyle = '#475569'; c.fillRect(x - 3, 70, 6, 60);
            U.rr(c, x - 54, y - 112, 108, 78, 6);
            c.fillStyle = 'rgba(226,232,240,.92)'; c.fill();
            c.strokeStyle = '#94a3b8'; c.lineWidth = 3; c.stroke();
            c.strokeStyle = '#ef4444'; c.lineWidth = 2.5; c.strokeRect(x - 20, y - 76, 40, 30);
            // back rim
            c.strokeStyle = '#f97316'; c.lineWidth = 4;
            c.beginPath(); c.ellipse(x, y, R, R * .28, 0, Math.PI, 0); c.stroke();
        } else {
            // net
            c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.2;
            const sway = (ball && ball.resolved === 'in') ? 4 * Math.sin(ball.fall * 22) : 0;
            for (let i = 0; i <= 6; i++) {
                const a = -R + i * R / 3, b = a * .6 + sway;
                c.beginPath(); c.moveTo(x + a, y); c.lineTo(x + b, y + 36); c.stroke();
            }
            for (let j = 1; j <= 3; j++) {
                const f = j / 3.4, w = R * (1 - f * .4);
                c.beginPath(); c.moveTo(x - w, y + j * 10); c.lineTo(x + w + sway * f, y + j * 10); c.stroke();
            }
            c.strokeStyle = '#fb923c'; c.lineWidth = 4.5;
            c.beginPath(); c.ellipse(x, y, R, R * .28, 0, 0, Math.PI); c.stroke();
            c.fillStyle = '#ea580c'; c.fillRect(x - 3, y + R * .27, 6, 3);
        }
    }

    function drawBall(c) {
        if (ball) {
            const b = ball;
            if (!b.done) {
                const p = ballPos(b);
                U.shadow(c, p.x, START.y + 40 - 4 * b.t, 18 * (1 - b.t * .4), 6, .3);
                const behind = b.t > .9 && (b.kind === 'swish' || b.kind === 'in');
                if (!behind) U.ball(c, p.x, p.y, p.r, b.rot, 'basket');
                b.drawn = p;
            } else if (b.resolved === 'in') {
                const y = b.by + b.fall * 190, a = 1 - b.fall / .55 * .3;
                c.globalAlpha = Math.max(.4, a);
                U.ball(c, b.bx, y, 13, b.rot + b.fall * 4, 'basket');
                c.globalAlpha = 1;
            } else {
                const s = Math.max(.6, 13 + b.fall * 4);
                U.ball(c, b.bx, b.by, Math.min(18, s), b.rot + b.fall * 6, 'basket');
            }
        }
        if (!ball && readyIn <= 0 && env.running()) {
            const bob = Math.sin(env.time() * 4) * 2;
            U.shadow(c, START.x, START.y + 32, 22, 7, .35);
            if (fire > 0) U.glow(c, START.x, START.y + bob, 46, 'rgba(255,120,20,.9)', fire * .9);
            U.ball(c, START.x, START.y + bob, 26, env.time() * .5, 'basket');
        }
    }

    function drawAim(c) {
        if (!aim) return;
        const dx = aim.dx, pw = -aim.dy;
        if (pw < 10) return;
        const lx = landing(dx, pw), perr = (pw - IDEAL) / IDEAL;
        const good = Math.abs(perr) < .14;
        const T = .9, steps = 14;
        c.fillStyle = 'rgba(255,255,255,.75)';
        for (let i = 1; i <= steps; i++) {
            const u = i / steps * .9;
            const x = U.lerp(START.x, lx, u), y = U.lerp(START.y, HOOP_Y, u) - 4 * (120 + pw * .45) * u * (1 - u);
            c.globalAlpha = .9 - u * .5; c.beginPath(); c.arc(x, y, 3.2 - u * 1.2, 0, Math.PI * 2); c.fill();
        }
        c.globalAlpha = 1;
        const arrive = hoopAt(hoopT + T);
        c.strokeStyle = 'rgba(56,189,248,.6)'; c.setLineDash([4, 4]); c.lineWidth = 2;
        c.beginPath(); c.ellipse(arrive.x, arrive.y, rimR(), rimR() * .28, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
        // power bar
        const bx = 24, by = 300, bh = 170;
        U.rr(c, bx, by, 16, bh, 8); c.fillStyle = 'rgba(0,0,0,.55)'; c.fill();
        const f = clamp01(pw / (IDEAL * 1.6));
        U.rr(c, bx + 2, by + bh - 2 - (bh - 4) * f, 12, (bh - 4) * f, 6);
        c.fillStyle = good ? '#4ade80' : perr < 0 ? '#38bdf8' : '#fb923c'; c.fill();
        const gy = by + bh - 2 - (bh - 4) * (1 / 1.6);
        c.fillStyle = '#fde047'; c.fillRect(bx - 4, gy - 1.5, 24, 3);
        U.text(c, good ? 'PERFECT' : perr < 0 ? 'MORE' : 'LESS', bx + 8, by - 10, { size: 10, color: good ? '#4ade80' : '#fff' });
        c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(aim.sx, aim.sy); c.lineTo(aim.x, aim.y); c.stroke();
    }

    function drawHud(c) {
        U.rr(c, 8, 56, 92, 26, 13); c.fillStyle = 'rgba(0,0,0,.55)'; c.fill();
        U.text(c, `PACE ${level()}`, 54, 69, { size: 12, color: '#38bdf8' });
        if (streak >= 2) {
            U.rr(c, W - 108, 56, 100, 26, 13); c.fillStyle = streak >= 3 ? 'rgba(234,88,12,.85)' : 'rgba(0,0,0,.55)'; c.fill();
            U.text(c, streak >= 3 ? `🔥 ×2 · ${streak}` : `STREAK ${streak}`, W - 58, 69, { size: 12, color: '#fff' });
        }
        if (env.running() && shots === 0 && !aim) U.text(c, 'Drag UP from the ball and release', W / 2, 520, { size: 13, color: '#fff', alpha: .6 + .4 * Math.sin(env.time() * 4), stroke: 'rgba(0,0,0,.7)', lw: 3 });
    }

    function draw(c) {
        drawCourt(c);
        drawHoop(c, false);
        if (ball && ball.done && ball.resolved !== 'in') drawBall(c);
        else if (ball && !ball.done && !(ball.t > .9 && (ball.kind === 'swish' || ball.kind === 'in'))) drawBall(c);
        else if (!ball) drawBall(c);
        if (ball && ball.resolved === 'in') drawBall(c);
        if (ball && !ball.done && ball.t > .9 && (ball.kind === 'swish' || ball.kind === 'in')) {
            const p = ballPos(ball); U.ball(c, p.x, p.y, p.r, ball.rot, 'basket');
        }
        drawHoop(c, true);
        drawAim(c);
        drawHud(c);
    }

    return {
        title: '🏀 Hoop Shootout',
        goal: `Make ${target} baskets before time runs out`,
        intro: { head: 'HOOP SHOOTOUT', lines: ['Drag UP from the ball & release', 'Drag length = power · angle = aim', 'The hoop speeds up as you score'] },
        start, update, draw, down, move, up, idle() { hoopT += .016; },
        _state: () => ({ points, baskets, shots, streak, time, level: level(), ball, hoopT }),
        _shoot: shoot, _setTime: t => { time = t; }
    };
});
