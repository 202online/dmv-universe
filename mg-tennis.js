'use strict';

// Baseline Rally: drag to run along the baseline, swipe up to hit. Swipe angle aims, length adds depth, speed adds pace.
Minigames.register('tennis', env => {
    const { W, H, U, sfx, buzz, fx, banner, end } = env;
    const WIN = 5, G = 4.2, NET_H = .12;
    const ys = v => U.lerp(505, 208, v);
    const hw = v => U.lerp(150, 88, v);
    const sc = v => U.lerp(1, .6, v);
    const X = (u, v) => 180 + u * hw(v);
    const HPX = 175;

    let me, cpu, pu, ou, ball, phase, phaseT, server, rally, bestRally, swingT, oswing, hitCd, tx, steer, tossT, msgT, reaction, aces;

    function start() {
        me = 0; cpu = 0; server = 'p'; bestRally = 0; aces = 0; steer = null; tx = 0;
        pu = 0; ou = 0; hitCd = 0;
        newPoint();
    }

    function newPoint() {
        rally = 0; ball = null; swingT = 0; oswing = 0;
        phase = 'serve'; phaseT = 0; tossT = 0; reaction = 0;
        if (server === 'o') { phaseT = 1.1; }
        pu = U.clamp(pu, -.5, .5); ou = 0;
        fx.text(180, 340, server === 'p' ? 'YOUR SERVE' : 'CPU SERVE', { color: '#fde047', size: 22, life: 1.1, vy: -20 });
    }

    const pts = () => me + cpu;
    const level = () => U.clamp(pts() / 8 + me * .05, 0, 1);

    function launch(b, tu, tv, T) {
        b.vu = (tu - b.u) / T; b.vv = (tv - b.v) / T; b.vh = (G / 2 * T * T - b.h) / T;
    }

    function down(p) {
        if (steer === null) { steer = p.id; p.off = pu - (p.x - 180) / 150; p.role = 'steer'; tx = pu; }
    }
    function move(p) {
        if (p.role !== 'steer') return;
        if (p.dy > -30) tx = U.clamp((p.x - 180) / 150 + p.off, -1.15, 1.15);
    }
    function up(p) {
        if (p.role === 'steer') steer = null;
        if (p.cancelled) return;
        const speed = Math.hypot(p.vx, p.vy);
        if (p.dy < -45 && p.vy < -300 && speed > 350) swing(p);
    }

    function swing(p) {
        if (hitCd > 0) return;
        const tu = U.clamp(p.dx / 95, -1.2, 1.2);
        const len = Math.hypot(p.dx, p.dy), speed = Math.hypot(p.vx, p.vy);
        let tv = U.lerp(.56, 1.08, U.clamp((len - 50) / 190, 0, 1));
        let T = U.lerp(1.25, .62, U.clamp(speed / 2200, 0, 1));
        if (phase === 'serve' && server === 'p') {
            const q = 1 - U.clamp(Math.abs(tossH() - .5) / .5, 0, 1);
            const jit = (1 - q) * .55;
            ball = { u: pu, v: .05, h: tossH() + .25, vu: 0, vv: 0, vh: 0, last: 'p', bounces: 0, dead: null, rot: 0 };
            tv = U.clamp(tv, .56, .82);
            launch(ball, U.clamp(tu * .8 + U.rand(-jit, jit), -.95, .95), tv + U.rand(-jit, jit) * .3, T + (1 - q) * .25);
            phase = 'rally'; swingT = .3; hitCd = .45; sfx('whoosh');
            fx.text(X(pu, .05), 400, q > .8 ? 'PERFECT SERVE' : q > .5 ? 'GOOD' : 'MISTIMED', { color: q > .8 ? '#4ade80' : '#fde047', size: 17 });
            return;
        }
        if (phase !== 'rally' || !ball || ball.dead) return;
        swingT = .3; hitCd = .35;
        const inWindow = ball.last === 'o' && ball.bounces === 1 && ball.vv < 0 && ball.v < .36 && ball.h < .65 && Math.abs(ball.u - pu) < .32;
        if (!inWindow) {
            sfx('whoosh');
            fx.text(X(pu, .05), 410, ball.bounces === 0 && ball.last === 'o' ? 'WAIT FOR THE BOUNCE' : 'MISSED', { color: '#fca5a5', size: 14 });
            return;
        }
        ball.u = pu; ball.v = Math.max(.05, ball.v); ball.last = 'p'; ball.bounces = 0;
        launch(ball, tu, tv, T);
        rally++; bestRally = Math.max(bestRally, rally);
        sfx('tap'); buzz(12); fx.shake(2, .1);
        fx.burst(X(ball.u, ball.v), ys(ball.v) - ball.h * HPX * sc(ball.v), { n: 8, colors: ['#fef08a', '#fff'], speed: 120, life: .3, g: 100 });
        if (speed > 1600) fx.text(180, 330, 'SMASH!', { color: '#fb923c', size: 20 });
    }

    const tossH = () => .62 * Math.abs(Math.sin(tossT * 2.6));

    function scorePoint(who, why) {
        if (phase === 'point') return;
        phase = 'point'; phaseT = 1.6;
        if (who === 'p') { me++; sfx('cheer'); fx.flash('#4ade80', .2); }
        else { cpu++; sfx('sad'); }
        banner(who === 'p' ? 'POINT!' : 'CPU POINT', who === 'p' ? '#86efac' : '#fca5a5', why);
        if (who === 'p' && rally === 0) aces++;
        server = server === 'p' ? 'o' : 'p';
    }

    function bounce(b) {
        b.bounces++;
        sfx('bounce'); fx.burst(X(b.u, b.v), ys(b.v), { n: 5, colors: ['#e5e7eb', '#cbd5e1'], speed: 60, life: .3, g: 80 });
        const inside = Math.abs(b.u) <= 1.03;
        if (b.bounces === 1) {
            const good = b.last === 'p' ? (b.v >= .5 && b.v <= 1.02) : (b.v >= -.02 && b.v <= .5);
            if (!good || !inside) {
                b.dead = b.last; b.deadWhy = !inside ? 'OUT WIDE' : (b.last === 'p' && b.v > 1 ? 'LONG' : b.last === 'p' ? 'NET' : 'SHORT');
                const who = b.last === 'p' ? 'o' : 'p';
                scorePoint(who, !inside ? 'Out wide' : b.v > 1 || b.v < 0 ? 'Long' : 'Landed short');
                b.vu *= .3; b.vv *= .3;
            }
        } else if (b.bounces === 2 && !b.dead) {
            b.dead = b.last;
            scorePoint(b.last, b.last === 'p' ? 'Winner!' : 'Got past you');
        }
        b.vh = -b.vh * .72; b.vv *= .84; b.vu *= .86;
        b.h = 0;
    }

    function update(dt) {
        hitCd = Math.max(0, hitCd - dt); swingT = Math.max(0, swingT - dt); oswing = Math.max(0, oswing - dt);
        pu += U.clamp(tx - pu, -2.6 * dt, 2.6 * dt);
        pu = U.clamp(pu, -1.2, 1.2);
        if (phase === 'point') { phaseT -= dt; stepBall(dt); if (phaseT <= 0) { if (me >= WIN || cpu >= WIN) finish(); else newPoint(); } return; }
        if (phase === 'serve') {
            if (server === 'p') tossT += dt;
            else {
                phaseT -= dt;
                if (phaseT <= 0) {
                    ball = { u: ou, v: .96, h: .5, vu: 0, vv: 0, vh: 0, last: 'o', bounces: 0, dead: null, rot: 0 };
                    launch(ball, U.rand(-.75, .75), U.rand(.12, .38), 1.25 - level() * .25);
                    phase = 'rally'; oswing = .3; reaction = .35; sfx('tap');
                }
            }
            return;
        }
        if (phase === 'rally') { stepBall(dt); opp(dt); }
    }

    function stepBall(dt) {
        if (!ball) return;
        const b = ball, pv = b.v;
        b.u += b.vu * dt; b.v += b.vv * dt; b.h += b.vh * dt; b.vh -= G * dt; b.rot += dt * 6;
        if (b.h <= 0 && b.vh < 0) {
            b.h = 0;
            if (Math.abs(b.vh) > .25) bounce(b); else { b.vh = 0; }
        }
        if (!b.dead && ((pv < .5 && b.v >= .5) || (pv > .5 && b.v <= .5)) && b.h < NET_H) {
            b.dead = b.last; b.vv = 0; b.vu = 0; b.vh = Math.min(b.vh, 0);
            sfx('thud'); fx.text(180, ys(.5) - 40, 'NET!', { color: '#fca5a5', size: 22 });
            scorePoint(b.last === 'p' ? 'o' : 'p', 'Into the net');
        }
        if (!b.dead && b.last === 'o' && b.v < -.1) { b.dead = 'o'; scorePoint('o', 'Got past you'); }
        if (!b.dead && b.last === 'p' && b.bounces >= 1 && b.v > 1.12) { b.dead = 'p'; scorePoint('p', 'Winner!'); }
    }

    function opp(dt) {
        const b = ball;
        if (!b || b.dead) return;
        const spd = .8 + level() * .75;
        if (reaction > 0) reaction -= dt;
        else if (b.last === 'p') {
            const aim = b.u + b.vu * .15;
            ou += U.clamp(aim - ou, -spd * dt, spd * dt);
        } else ou += U.clamp(0 - ou, -spd * dt * .6, spd * dt * .6);
        ou = U.clamp(ou, -1.25, 1.25);
        const reach = .27 + level() * .09;
        if (b.last === 'p' && b.bounces >= 1 && b.vv > 0 && b.v > .8 && b.h < .6 && Math.abs(b.u - ou) < reach) {
            const sloppy = Math.random() < Math.max(.04, .3 - level() * .28);
            b.u = ou; b.last = 'o'; b.bounces = 0; oswing = .3;
            const tu = sloppy ? U.pick([-1, 1]) * U.rand(1.15, 1.4) : U.clamp(-pu * .9 + U.rand(-.45, .45), -.95, .95);
            launch(b, tu, U.rand(.06, .42), U.lerp(1.3, .85, U.clamp(level() + Math.random() * .3, 0, 1)));
            sfx('tap'); fx.burst(X(b.u, b.v), ys(b.v) - 30, { n: 6, colors: ['#fef08a'], speed: 90, life: .25, g: 60 });
            rally++;
        }
    }

    function finish() {
        const win = me > cpu;
        end({
            win, head: win ? 'GAME, SET, MATCH!' : 'MATCH LOST',
            lines: [`Final score ${me} – ${cpu}`, `Longest rally ${bestRally} hits`, win ? 'Great placement!' : 'Swipe harder & aim for the corners']
        , stars: Math.max(1, me + (win ? 2 : 0)) });
    }

    // ---------- drawing ----------
    function drawCourt(c) {
        c.fillStyle = U.vgrad(c, 0, 160, [[0, '#0a1020'], [1, '#1b2548']]); c.fillRect(0, 0, W, 170);
        U.crowd(c, 0, 24, W, 110, { rows: 4, gap: 15, t: env.time(), amp: phase === 'point' && phaseT > 0 ? .5 : .05, dim: .35, seed: 5 });
        for (let i = 0; i < 4; i++) { c.fillStyle = ['#0e7490', '#7c3aed', '#be123c', '#047857'][i]; c.fillRect(i * 90 + 2, 140, 86, 24); U.text(c, ['METRO OPEN', 'DMV CUP', 'CAPITAL', '202 TENNIS'][i], i * 90 + 45, 152, { size: 9, color: '#fff' }); }
        c.fillStyle = U.vgrad(c, 164, H, [[0, '#256b45'], [1, '#2f855a']]); c.fillRect(0, 164, W, H - 164);
        // court surface
        c.beginPath();
        c.moveTo(X(-1, 0) - 24, ys(0)); c.lineTo(X(-1, 1) - 16, ys(1)); c.lineTo(X(1, 1) + 16, ys(1)); c.lineTo(X(1, 0) + 24, ys(0)); c.closePath();
        c.fillStyle = '#245a9a'; c.fill();
        c.beginPath();
        c.moveTo(X(-1, 0), ys(0)); c.lineTo(X(-1, 1), ys(1)); c.lineTo(X(1, 1), ys(1)); c.lineTo(X(1, 0), ys(0)); c.closePath();
        c.fillStyle = '#2f6fb7'; c.fill();
        c.save(); c.clip();
        for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.04)'; c.fillRect(0, ys((i + 1) / 12), W, ys(i / 12) - ys((i + 1) / 12) + 1); }
        c.restore();
        c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2.5;
        const ln = (u0, v0, u1, v1) => { c.beginPath(); c.moveTo(X(u0, v0), ys(v0)); c.lineTo(X(u1, v1), ys(v1)); c.stroke(); };
        ln(-1, 0, 1, 0); ln(-1, 1, 1, 1); ln(-1, 0, -1, 1); ln(1, 0, 1, 1);
        ln(-1, .23, 1, .23); ln(-1, .77, 1, .77); ln(0, .23, 0, .77);
    }

    function drawNet(c) {
        const v = .5, y = ys(v), h = NET_H * 1.25 * HPX * sc(v), x0 = X(-1.12, v), x1 = X(1.12, v);
        c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(x0, y, x1 - x0, 4);
        c.fillStyle = 'rgba(15,23,42,.5)'; c.fillRect(x0, y - h, x1 - x0, h);
        c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1;
        for (let i = 0; i <= 28; i++) { const x = x0 + (x1 - x0) * i / 28; c.beginPath(); c.moveTo(x, y - h); c.lineTo(x, y); c.stroke(); }
        for (let j = 1; j < 4; j++) { c.beginPath(); c.moveTo(x0, y - h * j / 4); c.lineTo(x1, y - h * j / 4); c.stroke(); }
        c.fillStyle = '#f8fafc'; c.fillRect(x0, y - h - 2, x1 - x0, 4);
        c.fillStyle = '#94a3b8'; c.fillRect(x0 - 3, y - h - 4, 4, h + 6); c.fillRect(x1 - 1, y - h - 4, 4, h + 6);
    }

    function figure(c, x, y, s, shirt, back, swing, skin) {
        c.save(); c.translate(x, y); c.scale(s, s);
        U.shadow(c, 0, 2, 20, 6, .35);
        c.fillStyle = '#e5e7eb'; c.fillRect(-9, -26, 7, 26); c.fillRect(2, -26, 7, 26);
        c.fillStyle = '#0f172a'; c.fillRect(-10, -4, 9, 4); c.fillRect(1, -4, 9, 4);
        U.rr(c, -14, -62, 28, 40, 9); c.fillStyle = shirt; c.fill();
        c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(-12, -60, 7, 36);
        c.fillStyle = skin; c.beginPath(); c.arc(0, -72, 9, 0, 7); c.fill();
        c.fillStyle = back ? '#2b1b0f' : '#1f1f28'; c.beginPath(); c.arc(0, back ? -74 : -75, 9.2, Math.PI, 0); c.fill();
        c.fillStyle = '#fff'; c.fillRect(-9, -79, 18, 3);
        // arm + racket
        const a = swing > 0 ? -2.2 + (1 - swing / .3) * 3.0 : -.5;
        c.save(); c.translate(back ? 14 : -14, -52); c.rotate(back ? a : -a);
        c.fillStyle = skin; c.fillRect(-2.5, 0, 5, 18);
        c.strokeStyle = '#111827'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 18); c.lineTo(0, 30); c.stroke();
        c.beginPath(); c.ellipse(0, 40, 9, 12, 0, 0, 7); c.strokeStyle = '#e11d48'; c.lineWidth = 3; c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1;
        for (let i = -6; i <= 6; i += 3) { c.beginPath(); c.moveTo(i, 30); c.lineTo(i, 50); c.stroke(); }
        c.restore();
        c.restore();
    }

    function drawBall(c) {
        if (!ball) {
            if (phase === 'serve' && server === 'p') {
                const h = tossH() + .25, x = X(pu, .05), y = ys(.05) - 80 - h * 120;
                U.shadow(c, x, ys(.05) + 4, 8, 3, .3);
                U.ball(c, x, y, 8, env.time() * 4, 'tennis');
                const good = 1 - U.clamp(Math.abs(tossH() - .5) / .5, 0, 1);
                c.strokeStyle = good > .8 ? '#4ade80' : 'rgba(255,255,255,.5)'; c.lineWidth = 2;
                c.beginPath(); c.arc(x, y, 14 + (1 - good) * 8, 0, 7); c.stroke();
            }
            return;
        }
        const b = ball, p = sc(Math.max(0, Math.min(1.1, b.v)));
        const x = X(b.u, b.v), g = ys(b.v), y = g - b.h * HPX * p;
        U.shadow(c, x, g + 1, 8 * p + 2, 3 * p + 1, .35);
        const r = 7.5 * p + 2.5;
        U.ball(c, x, y, r, b.rot, 'tennis');
    }

    function drawHud(c) {
        U.rr(c, 8, 8, 344, 38, 12); c.fillStyle = 'rgba(0,0,0,.65)'; c.fill();
        U.text(c, 'YOU', 54, 27, { size: 12, color: '#7dd3fc' });
        U.text(c, `${me}`, 100, 27, { size: 22, color: '#fff' });
        U.text(c, '–', 180, 26, { size: 18, color: '#94a3b8' });
        U.text(c, `${cpu}`, 260, 27, { size: 22, color: '#fff' });
        U.text(c, 'CPU', 306, 27, { size: 12, color: '#fca5a5' });
        c.fillStyle = server === 'p' ? '#fde047' : 'rgba(0,0,0,0)'; c.beginPath(); c.arc(30, 27, 4, 0, 7); c.fill();
        if (server === 'o') { c.fillStyle = '#fde047'; c.beginPath(); c.arc(330, 27, 4, 0, 7); c.fill(); }
        if (rally >= 2 && phase === 'rally') U.text(c, `RALLY ${rally}`, 180, 62, { size: 12, color: '#fde047', stroke: 'rgba(0,0,0,.7)', lw: 3 });
        if (phase === 'serve' && server === 'p') U.text(c, 'SWIPE UP WHEN THE BALL PEAKS', 180, 540, { size: 12, color: '#fff', alpha: .6 + .4 * Math.sin(env.time() * 4), stroke: 'rgba(0,0,0,.7)', lw: 3 });
        else if (phase === 'rally' && rally === 0 && ball && ball.last === 'o') U.text(c, 'DRAG TO MOVE · SWIPE UP AFTER THE BOUNCE', 180, 540, { size: 11, color: '#fff', alpha: .8, stroke: 'rgba(0,0,0,.7)', lw: 3 });
    }

    function drawReach(c) {
        const ready = ball && !ball.dead && ball.last === 'o' && ball.bounces === 1 && ball.vv < 0 && ball.v < .36 && ball.h < .65 && Math.abs(ball.u - pu) < .32;
        const x = X(pu, .05), y = ys(.05) + 4, rx = .32 * hw(.05);
        c.strokeStyle = ready ? '#4ade80' : 'rgba(255,255,255,.35)'; c.lineWidth = ready ? 3 : 2;
        c.beginPath(); c.ellipse(x, y, rx, rx * .26, 0, 0, 7); c.stroke();
        if (ready) { c.fillStyle = 'rgba(74,222,128,.18)'; c.fill(); U.text(c, 'SWIPE!', x, y - 100, { size: 16, color: '#4ade80', stroke: 'rgba(0,0,0,.7)', lw: 4 }); }
    }

    function draw(c) {
        drawCourt(c);
        const farFirst = !ball || ball.v >= .5;
        figure(c, X(ou, .97), ys(.97), .6, '#f97316', false, oswing, '#c68642');
        if (farFirst) drawBall(c);
        drawNet(c);
        if (!farFirst) drawBall(c);
        drawReach(c);
        figure(c, X(pu, .05), ys(.05) + 4, 1, '#e11d48', true, swingT, '#e0ac69');
        if (ball && phase === 'rally' && !ball.dead && ball.last === 'p' && ball.v < .12) drawBall(c);
        drawHud(c);
    }

    return {
        title: '🎾 Baseline Rally',
        intro: { head: 'BASELINE RALLY', lines: ['Drag to run along the baseline', 'Swipe UP after the bounce to hit', 'Swipe angle aims · length = depth'] },
        init: start, start, update, draw, down, move, up, idle() { },
        _state: () => ({ me, cpu, phase, ball, pu, ou, rally, server }),
        _set: o => { if (o.pu !== undefined) { pu = o.pu; tx = o.pu; } }
    };
});
