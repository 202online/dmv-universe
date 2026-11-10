'use strict';

// Free Kick Masters: swipe from the ball. Direction aims, length lifts, a curved swipe bends it.
Minigames.register('soccer', env => {
    const { W, H, U, sfx, buzz, fx, banner, end } = env;
    const KICKS = 6, GOAL_HW = 100, BAR_PX = 62, GY = 222, BY = 478, CX = 180;
    const rank = U.challenge(env.level), target = Math.min(5, 3 + Math.floor(rank / 2));
    const pressure = U.pressure(env.level);
    const difficulty = {
        shotLimit: U.lerp(12, 2.8, pressure),
        keeperSpeed: U.lerp(.38, 2.6, pressure),
        diveSpeed: U.lerp(.65, 1.65, pressure),
        reactionTime: U.lerp(.38, .16, pressure)
    };
    const persp = t => U.lerp(2.35, 1, t);
    const gy = t => U.lerp(BY, GY, t);
    const sx = (X, t) => CX + X * GOAL_HW * persp(t);

    let kick, goals, points, x0, wall, keeper, ball, aim, resultT, streak, best, flavor, log, shotTime, finished;

    function start() {
        kick = 0; goals = 0; points = 0; streak = 0; best = 0; ball = null; aim = null; log = []; finished = false;
        setup();
    }

    function setup() {
        kick++;
        x0 = U.pick([-.45, -.22, 0, .25, .45]) + U.rand(-.05, .05);
        const n = Math.min(4, 1 + Math.floor((kick - 1) / 2) + Math.floor(rank / 2));
        wall = { n, x: x0 * .6, jump: Math.random() < .35 + kick * .06, jumpAt: U.rand(.22, .36), up: 0 };
        keeper = { x: U.rand(-.3, .3), direction: U.pick([-1, 1]), target: 0, dive: false, diveAt: 0, state: 'wait', ext: 0, read: Math.min(.95, .3 + kick * .08 + rank * .05) };
        ball = null; aim = null; resultT = 0; flavor = null;
        shotTime = difficulty.shotLimit;
    }

    function down(p) { if (!finished && !ball && !resultT && p.y > 300) aim = p; }
    function move() { }
    function up(p) {
        if (aim !== p) return;
        aim = null;
        if (p.cancelled || p.len < 40 || p.dy > -30) return;
        shoot(plan(p));
    }

    // Convert a swipe into target, height, flight time and curl.
    function plan(p) {
        const tgt = U.clamp(p.dx / 85, -1.7, 1.7);
        const len = Math.hypot(p.dx, p.dy);
        const height = U.clamp((len - 55) / 150, .04, 1.5);
        const speed = Math.hypot(p.vx, p.vy);
        const T = U.lerp(1.15, .62, U.clamp(speed / 1900, 0, 1));
        let dev = 0;
        const a = { x: p.sx, y: p.sy }, b = { x: p.x, y: p.y };
        const cl = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        p.path.forEach(q => {
            const d = ((b.x - a.x) * (a.y - q.y) - (a.x - q.x) * (b.y - a.y)) / cl;
            if (Math.abs(d) > Math.abs(dev)) dev = d;
        });
        const curl = U.clamp(dev / 32, -1, 1);
        return { tgt, height, T, curl };
    }

    const heightAt = (pl, u) => pl.height * u + (.28 + pl.height * .22) * 4 * u * (1 - u);
    const xAt = (pl, u) => U.lerp(x0, pl.tgt, u) + pl.curl * .8 * 4 * u * (1 - u);

    function shoot(pl) {
        if (finished || ball || resultT || shotTime <= 0) return;
        // Keeper reads the shot better as the kicks go on, and dives late if the strike is fast.
        const correct = Math.random() < keeper.read;
        const side = pl.tgt >= 0 ? 1 : -1;
        keeper.dive = Math.random() < .85;
        keeper.target = keeper.dive ? (correct ? pl.tgt + U.rand(-.18, .18) : -side * U.rand(.3, .9)) : 0;
        keeper.diveAt = difficulty.reactionTime / pl.T;
        const endX = xAt(pl, 1);
        ball = { pl, u: 0, outcome: null, rot: 0, endX, wallHit: false, over: false };
        sfx('thud'); buzz(14);
        fx.burst(sx(x0, 0), BY + 10, { n: 8, colors: ['#4ade80', '#16a34a'], speed: 90, life: .4 });
    }

    function wallBounds() {
        const half = wall.n * .1;
        return [wall.x - half, wall.x + half];
    }

    function update(dt) {
        if (finished) return;
        if (!ball && !resultT) {
            if (keeper.state === 'wait') {
                keeper.x += keeper.direction * difficulty.keeperSpeed * dt;
                if (Math.abs(keeper.x) >= .72) {
                    keeper.x = Math.sign(keeper.x) * (1.44 - Math.abs(keeper.x));
                    keeper.direction *= -1;
                }
            }
            shotTime = Math.max(0, shotTime - dt);
            if (shotTime <= 0) {
                aim = null;
                ball = { pl: { tgt: x0, height: 0, curl: 0, T: 1 }, u: 0, rot: 0 };
                finishKick('timeout');
                return;
            }
        }
        if (wall) wall.up = U.lerp(wall.up, ball && wall.jump && ball.u > wall.jumpAt ? .26 : 0, Math.min(1, dt * 14));
        if (keeper.state === 'wait' && ball && ball.u > keeper.diveAt) keeper.state = 'dive';
        if (keeper.state === 'dive') {
            keeper.x += U.clamp(keeper.target - keeper.x, -difficulty.diveSpeed * dt, difficulty.diveSpeed * dt);
            keeper.ext = U.lerp(keeper.ext, keeper.dive ? 1 : 0, Math.min(1, dt * 8));
        }
        if (ball && !ball.outcome) {
            const b = ball, pl = b.pl;
            b.u = Math.min(1, b.u + dt / pl.T);
            b.rot += dt * 12;
            const bx = xAt(pl, b.u), bh = heightAt(pl, b.u);
            // wall check
            if (!b.wallHit && !b.over && b.u >= .4) {
                const [a, c2] = wallBounds();
                const wh = .64 + wall.up, wx = xAt(pl, .4);
                b.over = true;
                if (wx > a - .04 && wx < c2 + .04) {
                    if (heightAt(pl, .4) < wh) { b.wallHit = true; return finishKick('wall'); }
                }
            }
            if (b.u >= 1) resolve(bx, bh);
        } else if (ball && ball.outcome) {
            ball.t = (ball.t || 0) + dt;
            ball.vx = (ball.vx || 0); ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.vy += 600 * dt;
        }
        if (resultT > 0) {
            resultT -= dt;
            if (resultT <= 0) { if (kick >= KICKS) finish(); else setup(); }
        }
    }

    function resolve(bx, bh) {
        const pl = ball.pl;
        const absx = Math.abs(bx);
        const kx = keeper.x, reach = .28 + pressure * .08 + keeper.ext * .13, kh = .66 + keeper.ext * .22;
        if (bh > 1.1) return finishKick('over');
        if (bh > .96) return finishKick('bar');
        if (absx > 1.09) return finishKick('wide');
        if (absx > .93 && absx <= 1.09) return finishKick('post');
        if (Math.abs(bx - kx) < reach && bh < kh) return finishKick('save');
        return finishKick('goal');
    }

    function finishKick(kind) {
        const b = ball, pl = b.pl;
        b.outcome = kind;
        b.t = 0;
        const bx = xAt(pl, b.u), bh = heightAt(pl, b.u);
        b.x = sx(bx, b.u); b.y = gy(b.u) - bh * BAR_PX * persp(b.u);
        b.vx = 0; b.vy = -40;
        resultT = 1.75;
        if (kind === 'goal') {
            const top = bh > .78 && Math.abs(bx) > .6, curler = Math.abs(pl.curl) > .5;
            let pts = 1; const tags = [];
            if (top) { pts++; tags.push('TOP BINS'); }
            if (curler) { pts++; tags.push('CURLER'); }
            points += pts; goals++; streak++; best = Math.max(best, streak);
            banner(tags.length ? tags.join(' + ') : 'GOAL!', '#fde047', `+${pts} · ${tags.length ? 'GOAL!' : ''}`);
            fx.flash('#fde047', .3); sfx('cheer'); buzz([30, 30, 60]);
            fx.burst(sx(bx, 1), GY - 20, { n: 26, colors: ['#fde047', '#fff', '#4ade80'], speed: 240, shape: 'rect', g: 260 });
            b.vx = 0; b.vy = 0; b.net = true;
        } else {
            streak = 0;
            const msg = { timeout: 'TIME UP - KICK LOST', wall: 'BLOCKED BY THE WALL', over: 'OVER THE BAR', bar: 'OFF THE BAR!', wide: 'WIDE!', post: 'OFF THE POST!', save: 'SAVED!' }[kind];
            banner(msg, kind === 'post' || kind === 'bar' ? '#fbbf24' : '#fca5a5');
            sfx(kind === 'post' || kind === 'bar' ? 'rim' : 'sad'); fx.shake(kind === 'save' ? 4 : 3, .2);
            if (kind === 'post' || kind === 'bar') { sfx('bell'); buzz(25); }
            b.vx = U.rand(-120, 120); b.vy = -140;
        }
        log.push(kind);
    }

    function finish() {
        if (finished) return;
        finished = true;
        const stars = Math.min(9, 1 + points);
        end({
            win: goals >= target, head: goals >= target ? 'MATCH WINNER!' : 'FULL TIME',
            lines: [`${goals} goals from ${KICKS} free kicks`, `${points} points · best streak ${best}`, goals >= 3 ? 'Clinical finishing!' : 'Lift it over the wall, then bend it']
        , stars });
    }

    // ---------- drawing ----------
    function drawPitch(c) {
        c.fillStyle = U.vgrad(c, 0, 150, [[0, '#0a1020'], [1, '#1a2448']]); c.fillRect(0, 0, W, 160);
        U.crowd(c, 0, 18, W, 100, { rows: 4, gap: 15, t: env.time(), amp: resultT > 0 && ball && ball.outcome === 'goal' ? 1 : .1, dim: .3, seed: 9 });
        c.fillStyle = '#0f172a'; c.fillRect(0, 120, W, 28);
        const ads = ['DMV UNIVERSE', 'CAPITAL FIT', 'METRO PASS', '202 SPORTS'];
        for (let i = 0; i < 4; i++) { c.fillStyle = ['#be123c', '#0e7490', '#7c3aed', '#b45309'][i]; c.fillRect(i * 90 + 2, 124, 86, 20); U.text(c, ads[i], i * 90 + 45, 134, { size: 9, color: '#fff' }); }
        // grass with perspective stripes
        const bands = 10;
        for (let i = 0; i < bands; i++) {
            const t0 = i / bands * 1.35 - .15, t1 = (i + 1) / bands * 1.35 - .15;
            const ya = Math.max(148, gy(t1)), yb = Math.min(H, gy(t0));
            if (yb <= ya) continue;
            c.fillStyle = i % 2 ? '#2f8a3d' : '#287a35'; c.fillRect(0, ya, W, yb - ya + 1);
        }
        c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, 148, W, 8);
        // goal line and box
        c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(0, GY); c.lineTo(W, GY); c.stroke();
        c.lineWidth = 2;
        c.beginPath(); c.moveTo(CX - GOAL_HW * 1.9, GY); c.lineTo(CX - GOAL_HW * 1.9 * persp(.5) / 1, gy(.5)); c.lineTo(CX + GOAL_HW * 1.9 * persp(.5), gy(.5)); c.lineTo(CX + GOAL_HW * 1.9, GY); c.stroke();
        // penalty arc suggestion
        c.beginPath(); c.ellipse(CX, gy(.58), GOAL_HW * 1.0 * persp(.58), 26, 0, 0, Math.PI); c.stroke();
    }

    function drawGoal(c) {
        // net
        c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(CX - GOAL_HW, GY - BAR_PX, GOAL_HW * 2, BAR_PX);
        c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 1;
        for (let i = -10; i <= 10; i++) { c.beginPath(); c.moveTo(CX + i * GOAL_HW / 10, GY - BAR_PX); c.lineTo(CX + i * GOAL_HW / 10, GY); c.stroke(); }
        for (let j = 1; j < 6; j++) { c.beginPath(); c.moveTo(CX - GOAL_HW, GY - j * BAR_PX / 6); c.lineTo(CX + GOAL_HW, GY - j * BAR_PX / 6); c.stroke(); }
    }
    function drawFrame(c) {
        c.strokeStyle = '#f8fafc'; c.lineWidth = 6; c.lineCap = 'round';
        c.beginPath(); c.moveTo(CX - GOAL_HW, GY); c.lineTo(CX - GOAL_HW, GY - BAR_PX); c.lineTo(CX + GOAL_HW, GY - BAR_PX); c.lineTo(CX + GOAL_HW, GY); c.stroke();
        c.lineCap = 'butt';
    }

    function person(c, x, y, h, color, o = {}) {
        const w = h * .42;
        c.save(); c.translate(x, y);
        U.shadow(c, 0, 1, w * .7, h * .06, .3);
        c.fillStyle = '#1f2937'; c.fillRect(-w * .3, -h * .38, w * .22, h * .38); c.fillRect(w * .08, -h * .38, w * .22, h * .38);
        U.rr(c, -w / 2, -h * .78, w, h * .42, w * .25); c.fillStyle = color; c.fill();
        c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(-w / 2 + 2, -h * .76, w * .28, h * .38);
        c.fillStyle = o.skin || '#e0ac69'; c.beginPath(); c.arc(0, -h * .88, h * .11, 0, 7); c.fill();
        c.fillStyle = '#1b1b22'; c.beginPath(); c.arc(0, -h * .91, h * .11, Math.PI, 0); c.fill();
        c.fillStyle = o.skin || '#e0ac69';
        const armUp = o.arms || 0;
        c.save(); c.translate(-w / 2, -h * .72); c.rotate(-.3 - armUp); c.fillRect(-3, 0, 5, h * .3); c.restore();
        c.save(); c.translate(w / 2, -h * .72); c.rotate(.3 + armUp); c.fillRect(-2, 0, 5, h * .3); c.restore();
        c.restore();
    }

    function drawWall(c) {
        const t = .4, p = persp(t), y = gy(t) + 2;
        const h = BAR_PX * (.74 + wall.up * .6) * p * .92, sp = .2 * GOAL_HW * p;
        const start = wall.x - (wall.n - 1) * .1;
        for (let i = 0; i < wall.n; i++) {
            const X = start + i * .2;
            person(c, sx(X, t), y - wall.up * BAR_PX * p * .9, h, ['#2563eb', '#1d4ed8'][i % 2], { arms: .9, skin: ['#f2c9a0', '#8d5524', '#c68642'][i % 3] });
        }
    }

    function drawKeeper(c) {
        const t = 1, y = GY + 2, kx = sx(keeper.x, t);
        c.save();
        c.translate(kx, y);
        c.rotate(U.clamp(keeper.x, -1, 1) * .8 * keeper.ext);
        const lift = keeper.ext * 10;
        c.translate(0, -lift);
        person(c, 0, 0, 52, '#f59e0b', { arms: .5 + keeper.ext * 1.1, skin: '#c68642' });
        c.restore();
    }

    function drawBall(c) {
        if (!ball) {
            const bx = sx(x0, 0), bob = Math.sin(env.time() * 4) * 1.5;
            U.shadow(c, bx, BY + 22, 26, 8, .35);
            // kicker silhouette behind the ball
            U.ball(c, bx, BY + bob, 26, env.time() * .3, 'soccer');
            return;
        }
        const b = ball;
        if (b.outcome) {
            if (b.net) { U.ball(c, b.x, Math.min(b.y, GY - 6) + b.t * 6, 11, b.rot, 'soccer'); return; }
            const r = Math.max(7, 11 - b.t * 2);
            U.ball(c, b.x, b.y, r, b.rot + b.t * 6, 'soccer'); return;
        }
        const pl = b.pl, u = b.u, X = xAt(pl, u), h = heightAt(pl, u), p = persp(u);
        const r = 11 * p * .92 + 2;
        U.shadow(c, sx(X, u), gy(u) + 2, r * .9, r * .3, .35);
        if (Math.abs(pl.curl) > .3) {
            c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.beginPath();
            for (let k = 0; k <= 8; k++) { const uu = Math.max(0, u - k * .02); const xx = sx(xAt(pl, uu), uu), yy = gy(uu) - heightAt(pl, uu) * BAR_PX * persp(uu); k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); }
            c.stroke();
        }
        U.ball(c, sx(X, u), gy(u) - h * BAR_PX * p, r, b.rot, 'soccer');
    }

    function drawAim(c) {
        if (!aim) return;
        const pl = plan(aim);
        if (Math.hypot(aim.dx, aim.dy) < 25) return;
        c.fillStyle = 'rgba(255,255,255,.85)';
        for (let i = 1; i <= 16; i++) {
            const u = i / 16;
            const X = xAt(pl, u), h = heightAt(pl, u), p = persp(u);
            c.globalAlpha = .9 - u * .5;
            c.beginPath(); c.arc(sx(X, u), gy(u) - h * BAR_PX * p, 3.4 * (1.2 - u * .5), 0, 7); c.fill();
        }
        c.globalAlpha = 1;
        const end = { x: sx(xAt(pl, 1), 1), y: GY - heightAt(pl, 1) * BAR_PX };
        c.strokeStyle = '#fde047'; c.lineWidth = 2; c.beginPath(); c.arc(end.x, end.y, 8, 0, 7); c.stroke();
        c.beginPath(); c.moveTo(end.x - 12, end.y); c.lineTo(end.x + 12, end.y); c.moveTo(end.x, end.y - 12); c.lineTo(end.x, end.y + 12); c.stroke();
    }

    function drawHud(c) {
        U.rr(c, 8, 8, 344, 34, 12); c.fillStyle = 'rgba(0,0,0,.65)'; c.fill();
        U.text(c, `KICK ${Math.min(kick, KICKS)}/${KICKS}`, 56, 25, { size: 12, color: '#93c5fd' });
        U.text(c, `⚽ ${goals}`, 180, 25, { size: 16, color: '#fde047' });
        for (let i = 0; i < KICKS; i++) {
            const r = log[i];
            c.beginPath(); c.arc(240 + i * 18, 25, 6, 0, 7);
            c.fillStyle = r === undefined ? 'rgba(255,255,255,.2)' : r === 'goal' ? '#4ade80' : '#ef4444'; c.fill();
        }
        if (!ball && !resultT) {
            U.text(c, `SHOOT IN ${shotTime.toFixed(1)}s`, 180, 60, { size: 18, color: shotTime < 3 ? '#fca5a5' : '#fde047', stroke: '#0f172a', lw: 3 });
            c.fillStyle = '#0f172a'; c.fillRect(70, 77, 220, 7);
            c.fillStyle = shotTime < 3 ? '#ef4444' : '#38bdf8'; c.fillRect(70, 77, 220 * shotTime / difficulty.shotLimit, 7);
        } else if (streak >= 2) U.text(c, `STREAK ${streak}`, 180, 56, { size: 11, color: '#fb923c', stroke: 'rgba(0,0,0,.6)', lw: 3 });
        if (!ball && !resultT && env.running() && kick === 1) U.text(c, 'SWIPE UP FROM THE BALL', 180, 535, { size: 12, color: '#fff', alpha: .6 + .4 * Math.sin(env.time() * 4), stroke: 'rgba(0,0,0,.7)', lw: 3 });
        if (!ball && !resultT && env.running() && kick === 2) U.text(c, 'Curve your swipe to bend it', 180, 535, { size: 12, color: '#fff', alpha: .8, stroke: 'rgba(0,0,0,.7)', lw: 3 });
    }

    function draw(c) {
        drawPitch(c);
        drawGoal(c);
        const scored = ball && ball.outcome === 'goal';
        const behindWall = ball && !ball.outcome && ball.u < .4;
        if (scored) drawBall(c);
        drawKeeper(c);
        drawFrame(c);
        if (behindWall) drawBall(c);
        drawWall(c);
        if (!scored && !behindWall) drawBall(c);
        drawAim(c);
        drawHud(c);
    }

    return {
        title: '⚽ Free Kick Masters',
        goal: `Score ${target} goals from 6 free kicks`,
        intro: { head: 'FREE KICK MASTERS', lines: ['Aim away from the moving goalkeeper', `Release your shot within ${difficulty.shotLimit.toFixed(1)} seconds`, 'Longer swipe = higher - side = aim', 'Late shots lose a kick; curve to bend it'] },
        init: start, start, update, draw, down, move, up, idle() { },
        _state: () => ({ kick, goals, points, ball, keeper, wall, x0, shotTime, difficulty, finished, log }),
        _shoot: shoot
    };
});
