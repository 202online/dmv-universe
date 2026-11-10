'use strict';

Minigames.register('baseball', env => {
    const { U, sfx, buzz, fx, end } = env;
    const rank = U.challenge(env.level), pitches = 10;
    const target = 4 + Math.floor(rank / 3), flight = 1.65 - rank * .05;
    const window = .20 - rank * .01;
    let pitch, hits, homers, clock, phase, pause, message, hitQuality, swingTime, finished;

    function nextPitch() {
        pitch++; clock = -.8; phase = 'pitch'; message = 'Watch the ball approach home plate';
        hitQuality = 0; swingTime = 0;
    }
    function start() {
        pitch = 0; hits = 0; homers = 0; finished = false; pause = 0;
        nextPitch();
    }
    start();
    function finish() {
        if (finished) return;
        finished = true;
        const win = hits >= target;
        end({ win, head: win ? 'DIAMOND HITTER!' : 'BATTING PRACTICE COMPLETE', stars: 0,
            lines: [`${hits}/${pitches} hits | Goal: ${target}`, `${homers} home runs`,
                win ? 'Great timing at the plate!' : 'Wait until the ball reaches the green ring, then swing.'] });
    }
    function resolve(text) {
        message = text; phase = 'result'; pause = 1.2;
        fx.text(180, 190, text, { size: 23, color: hitQuality ? '#fde047' : '#fecaca' });
        sfx(hitQuality ? 'hit' : 'thud'); buzz(hitQuality ? 15 : 8);
    }
    function swing() {
        if (finished || phase !== 'pitch') return;
        swingTime = .3;
        const error = Math.abs(clock - flight);
        if (clock >= 0 && error <= window) {
            hits++;
            hitQuality = error <= window * .35 ? 2 : 1;
            if (hitQuality === 2) homers++;
            fx.burst(180, 400, { n: 16, colors: ['#fff', '#fde047', '#86efac'], speed: 150 });
            resolve(hitQuality === 2 ? 'HOME RUN!' : 'BASE HIT!');
        } else resolve(clock < flight ? 'TOO EARLY' : 'TOO LATE');
    }
    function down(p) {
        if (p.y >= 480 && p.y <= 544 && p.x >= 18 && p.x <= 342) p.baseballSwing = true;
    }
    function up(p) {
        if (p.baseballSwing && !p.cancelled && p.len < 24 &&
            p.y >= 480 && p.y <= 544 && p.x >= 18 && p.x <= 342) swing();
    }
    function update(dt) {
        if (finished) return;
        swingTime = Math.max(0, swingTime - dt);
        if (phase === 'result') {
            pause -= dt;
            if (pause <= 0) {
                if (pitch >= pitches) finish();
                else nextPitch();
            }
        } else {
            clock += dt;
            if (clock > flight + window + .25) resolve('MISSED PITCH');
        }
    }
    function polygon(c, points, fill, stroke) {
        c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
        if (fill) { c.fillStyle = fill; c.fill(); }
        if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); }
    }
    function ball(c, x, y, radius) {
        U.shadow(c, x, y + radius + 3, radius, radius * .4, .25);
        c.fillStyle = '#fff9e8'; c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#b12438'; c.lineWidth = 1.2;
        for (const side of [-1, 1]) {
            c.beginPath(); c.ellipse(x + side * radius * .6, y, radius * .3, radius * .7, 0, -Math.PI / 2, Math.PI / 2); c.stroke();
        }
    }
    function draw(c) {
        c.fillStyle = U.vgrad(c, 0, 560, [[0, '#162d42'], [.3, '#254c42'], [1, '#17452a']]);
        c.fillRect(0, 0, 360, 560);
        U.crowd(c, 12, 72, 336, 46, { rows: 2, gap: 16, t: env.time(), dim: .2 });
        U.rr(c, 12, 8, 336, 57, 10); c.fillStyle = '#0a1727'; c.fill();
        U.text(c, 'SW DIAMOND BATTING', 180, 26, { size: 19, color: '#fde68a' });
        U.text(c, `Pitch ${pitch}/${pitches} | Hits ${hits}/${target} | HR ${homers}`, 180, 49, { size: 13 });
        c.save();
        c.beginPath(); c.moveTo(180, 423); c.lineTo(22, 225);
        c.quadraticCurveTo(180, 80, 338, 225); c.closePath(); c.clip();
        c.fillStyle = '#32824c'; c.fillRect(0, 120, 360, 320);
        for (let i = 0; i < 10; i++) {
            c.fillStyle = i % 2 ? '#3d9254' : '#32824c'; c.fillRect(i * 40, 100, 40, 330);
        }
        c.restore();
        c.beginPath(); c.moveTo(23, 225); c.quadraticCurveTo(180, 80, 337, 225);
        c.strokeStyle = '#d7c48e'; c.lineWidth = 5; c.stroke();
        for (const x of [22, 338]) {
            c.strokeStyle = '#fde047'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, 225); c.lineTo(x, 175); c.stroke();
        }
        const bases = [[180, 412], [274, 320], [180, 228], [86, 320]];
        polygon(c, bases, '#bd8255', '#fff0d3');
        polygon(c, [[180, 388], [250, 320], [180, 252], [110, 320]], '#3d9254');
        polygon(c, [[22, 225], [180, 412], [338, 225]], null, '#fff0d3');
        bases.forEach(([x, y]) => polygon(c, [[x, y - 5], [x + 5, y], [x, y + 5], [x - 5, y]], '#fff'));
        c.fillStyle = '#bf9467'; c.beginPath(); c.ellipse(180, 320, 17, 12, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#fff'; c.fillRect(173, 317, 14, 3);
        // Pitcher and batter stay clear of the incoming ball.
        c.fillStyle = '#f1ead8'; U.rr(c, 174, 280, 12, 25, 4); c.fill();
        c.fillStyle = '#a97951'; c.beginPath(); c.arc(180, 275, 6, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ab2438'; c.fillRect(173, 268, 14, 5);
        c.fillStyle = '#ab2438'; U.rr(c, 139, 385, 15, 23, 4); c.fill();
        c.fillStyle = '#a97951'; c.beginPath(); c.arc(146, 379, 7, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#163653'; c.fillRect(138, 371, 16, 5);
        c.strokeStyle = '#e5c28a'; c.lineWidth = 5; c.lineCap = 'round';
        c.beginPath(); c.moveTo(151, 392); c.lineTo(swingTime > 0 ? 202 : 131, swingTime > 0 ? 404 : 361); c.stroke();
        const ready = phase === 'pitch' && Math.abs(clock - flight) <= window;
        c.beginPath(); c.ellipse(180, 405, 20, 12, 0, 0, Math.PI * 2);
        c.strokeStyle = ready ? '#86efac' : '#d1d5db'; c.lineWidth = ready ? 4 : 2; c.stroke();
        if (phase === 'pitch' && clock >= 0) {
            const t = U.clamp(clock / flight, 0, 1.25);
            ball(c, 180, 296 + t * 109, 3 + t * 4);
        } else if (phase === 'result' && hitQuality) {
            const t = U.clamp((1.2 - pause) / 1.2, 0, 1);
            ball(c, 180 + Math.sin(t * 3) * 70, 405 - t * (hitQuality === 2 ? 300 : 180), 7 - t * 4);
        }
        U.text(c, message, 180, 444, { size: 13, color: '#fff3ce' });
        c.fillStyle = '#0b172a'; U.rr(c, 28, 459, 304, 10, 4); c.fill();
        c.fillStyle = '#4ade80'; c.fillRect(28 + (flight - window) / (flight + .4) * 304, 459, window * 2 / (flight + .4) * 304, 10);
        c.fillStyle = '#fff'; c.fillRect(28 + U.clamp(clock / (flight + .4), 0, 1) * 304 - 2, 456, 4, 16);
        U.rr(c, 18, 486, 324, 54, 12); c.fillStyle = ready ? '#047857' : '#173758'; c.fill();
        c.strokeStyle = '#9ddbd4'; c.lineWidth = 2; c.stroke();
        U.text(c, ready ? 'SWING NOW!' : phase === 'result' ? 'NEXT PITCH...' : 'SWING', 180, 512, { size: 22 });
        U.text(c, 'Tap SWING when the ball reaches the green ring', 180, 551, { size: 10, color: '#d1fae5' });
    }
    return { title: 'Baseball Diamond Batting', goal: `Hit ${target} of ${pitches} pitches`,
        intro: { head: 'SW COMMUNITY DIAMOND', lines: ['Watch the pitch travel toward home plate', 'Tap SWING as the ball reaches the green ring', 'The timing bar also turns green at contact', `Hit ${target} of ${pitches}; perfect timing = home run`] },
        start, update, draw, down, up,
        _state: () => ({ pitch, hits, homers, clock, phase, pause, flight, window, target, pitches, finished }) };
});
