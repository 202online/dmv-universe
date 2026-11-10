'use strict';

(() => {
    function panel(c, U, x, y, w, h, color = '#0f172a') {
        U.rr(c, x, y, w, h, 12); c.fillStyle = color; c.fill();
        c.strokeStyle = '#64748b'; c.lineWidth = 2; c.stroke();
    }
    function control(c, U, x, y, w, label, active = false) {
        panel(c, U, x, y, w, 52, active ? '#065f46' : '#172554');
        U.text(c, label, x + w / 2, y + 26, { size: 14, color: active ? '#a7f3d0' : '#fff' });
    }
    const inside = (p, x, y, w, h) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;

    Minigames.register('resale', env => {
        const { U, end, fx, sfx } = env, rank = U.challenge(env.level);
        const target = 4 + Math.floor(rank / 2), total = target + 2, duration = 75 - rank * 2;
        const specs = ['Style code', 'Stitch count', 'Box label'];
        let time, round, correct, profit, tab, ticket, cooldown, message, finished, sequence;
        function nextTicket() {
            const serial = Math.floor(U.rand(100, 999));
            const code = `202-${serial}`, stitches = 8 + Math.floor(U.rand(0, 5)), label = U.pick(['CAPITAL', 'DISTRICT', 'UPTOWN']);
            const reference = [code, String(stitches), label], actual = [...reference];
            const genuine = sequence[round], defect = Math.floor(U.rand(0, 3));
            if (!genuine) actual[defect] = defect === 0 ? `202-${serial + (rank >= 3 ? 1 : 10)}` :
                defect === 1 ? String(stitches + 1) : label.replace(/I|A|O/, rank >= 3 ? '1' : 'X');
            ticket = { genuine, defect, reference, actual, price: 35 + Math.floor(U.rand(0, 6)) * 5, value: 95 };
            tab = 0; cooldown = 0; message = '';
        }
        function start() {
            time = duration; round = 0; correct = 0; profit = 0; finished = false;
            sequence = Array.from({ length: total }, (_, i) => i % 2 === 0);
            for (let i = sequence.length - 1; i > 0; i--) {
                const j = Math.floor(U.rand(0, i + 1)); [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
            }
            nextTicket();
        }
        start();
        function finish(win) {
            if (finished) return;
            finished = true;
            end({ win, head: win ? 'SHARP EYE!' : 'KEEP INSPECTING', stars: 0,
                lines: [`${correct}/${total} correct | goal ${target}`, `Practice resale margin: $${profit}`, 'Fictional items - not real authentication'] });
        }
        function decide(buy) {
            if (finished || cooldown > 0) return;
            const ok = buy === ticket.genuine;
            if (ok) correct++;
            if (buy) profit += ticket.genuine ? ticket.value - ticket.price : -ticket.price;
            message = ticket.genuine ? 'All 3 details matched the reference' : `${specs[ticket.defect]} did not match`;
            fx.text(180, 307, ok ? 'GOOD CALL!' : 'CHECK THE DETAILS', { size: 22, color: ok ? '#86efac' : '#fca5a5' });
            sfx(ok ? 'coin' : 'thud'); env.buzz(ok ? 15 : 30);
            if (ok) fx.burst(180, 280, { n: 18, colors: ['#fbbf24', '#a78bfa', '#fff'], speed: 110 });
            round++; cooldown = 1.3;
            if (round >= total) finish(correct >= target);
        }
        function tap(p) {
            if (finished || cooldown > 0) return;
            for (let i = 0; i < specs.length; i++) if (inside(p, 14 + i * 114, 324, 104, 52)) { tab = i; sfx('click'); return; }
            if (inside(p, 18, 477, 151, 56)) decide(true);
            if (inside(p, 191, 477, 151, 56)) decide(false);
        }
        function update(dt) {
            if (finished) return;
            time = Math.max(0, time - dt);
            if (time <= 0) { finish(false); return; }
            if (cooldown > 0) { cooldown -= dt; if (cooldown <= 0) nextTicket(); }
        }
        function draw(c) {
            c.fillStyle = U.vgrad(c, 0, 560, [[0, '#1e1b4b'], [1, '#020617']]); c.fillRect(0, 0, 360, 560);
            for (let y = 90; y < 300; y += 65) {
                c.fillStyle = '#334155'; c.fillRect(0, y, 360, 5);
                for (let x = 20; x < 360; x += 65) {
                    c.fillStyle = ['#7c3aed', '#b45309', '#0e7490'][(x + y) % 3]; c.fillRect(x, y - 25, 45, 23);
                    c.strokeStyle = '#e2e8f0'; c.strokeRect(x + 15, y - 18, 14, 8);
                }
            }
            panel(c, U, 12, 8, 336, 58);
            U.text(c, 'RESELL HUB: SPOT THE FAKE', 180, 28, { size: 17, color: '#c4b5fd' });
            U.text(c, `${Math.ceil(time)}s | Item ${Math.min(total, round + 1)}/${total} | Correct ${correct}/${target}`, 180, 50, { size: 12 });
            U.glow(c, 180, 200, 150, '#6d28d9', .5);
            U.shadow(c, 180, 268, 125, 14);
            c.save(); c.translate(60, 170);
            c.fillStyle = '#f1f5f9'; U.rr(c, 0, 30, 240, 56, 20); c.fill();
            c.fillStyle = '#a78bfa';
            c.beginPath(); c.moveTo(20, 33); c.lineTo(45, -15); c.lineTo(100, 0); c.lineTo(180, 25); c.lineTo(225, 34); c.lineTo(225, 65); c.lineTo(12, 65); c.closePath(); c.fill();
            c.fillStyle = '#4c1d95'; c.fillRect(14, 67, 213, 8);
            for (let i = 0; i < 4; i++) {
                c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath();
                c.moveTo(85 + i * 18, 8 + i * 3); c.lineTo(72 + i * 18, 32 + i * 3); c.stroke();
            }
            c.restore();
            U.text(c, `Ask $${ticket.price} | Reference resale $${ticket.value}`, 180, 294, { size: 14, color: '#fde047' });
            specs.forEach((name, i) => control(c, U, 14 + i * 114, 324, 104, name, tab === i));
            panel(c, U, 18, 389, 324, 74);
            U.text(c, `Reference: ${ticket.reference[tab]}`, 180, 410, { size: 17, color: '#a7f3d0' });
            U.text(c, `This item: ${ticket.actual[tab]}`, 180, 438, { size: 17, color: '#fef3c7' });
            if (cooldown > 0) {
                panel(c, U, 14, 278, 332, 36);
                U.text(c, message, 180, 296, { size: 12, color: '#fde68a' });
            }
            control(c, U, 18, 477, 151, 'MATCH: BUY');
            control(c, U, 191, 477, 151, 'FAKE: PASS');
            U.text(c, 'Fictional brand; three checks do not prove real authenticity', 180, 548, { size: 9, color: '#cbd5e1' });
        }
        return { title: 'Resell Hub', goal: `Make ${target} correct decisions across ${total} items`,
            intro: { head: 'SPOT THE FAKE', lines: ['Tap all 3 detail tabs to inspect', 'Compare this item with the reference', 'All match? BUY. Any mismatch? PASS.', 'Fictional items, not real brand advice'] },
            start, update, draw,
            down(p) { p.inspectTap = true; },
            up(p) { if (p.inspectTap && !p.cancelled && p.len < 24) tap(p); },
            _state: () => ({ time, round, correct, profit, tab, ticket, cooldown, target, total, duration, finished }) };
    });

    Minigames.register('courier', env => {
        const { U, fx, sfx, end } = env, rank = U.challenge(env.level);
        const lanes = [80, 180, 280], target = 4 + Math.floor(rank / 2);
        const speed = 125 + rank * 11, gap = 1.65 - rank * .04;
        let time, lane, x, bag, delivered, lives, rows, spawn, rowIndex, distance, hurt, finished, steer;
        function start() {
            time = 65; lane = 1; x = 180; bag = 0; delivered = 0; lives = 3;
            rows = []; spawn = .4; rowIndex = 0; distance = 0; hurt = 0; finished = false; steer = null;
        }
        start();
        function finish(win) {
            if (finished) return;
            finished = true;
            end({ win, head: win ? 'DELIVERED IN STYLE!' : 'ROUTE ENDED', stars: 0,
                lines: [`${delivered}/${target} parcels delivered`, `${bag} still in the delivery bag`, `${lives}/3 bike condition remaining`] });
        }
        function makeRow() {
            rowIndex++;
            if (rowIndex % 3 === 0) rows.push({ y: 120, delivery: true, done: false });
            else {
                const parcel = Math.floor(U.rand(0, 3)), blocked = (parcel + U.pick([1, 2])) % 3;
                rows.push({ y: 120, parcel, blocked, done: false });
            }
        }
        function down(p) {
            if (steer !== null || finished) return;
            steer = p.id; p.courierSteer = true; p.previousLane = lane;
            if (p.y > 485) {
                if (p.x < 130) lane = Math.max(0, lane - 1);
                else if (p.x > 230) lane = Math.min(2, lane + 1);
            } else lane = U.clamp(Math.floor(p.x / 120), 0, 2);
        }
        function move(p) { if (p.courierSteer && steer === p.id) lane = U.clamp(Math.floor(p.x / 120), 0, 2); }
        function up(p) {
            if (!p.courierSteer || steer !== p.id) return;
            if (p.cancelled) lane = p.previousLane;
            steer = null;
        }
        function update(dt) {
            if (finished) return;
            time = Math.max(0, time - dt);
            if (time <= 0) { finish(false); return; }
            x += (lanes[lane] - x) * Math.min(1, dt * 18);
            distance += speed * dt; hurt = Math.max(0, hurt - dt); spawn -= dt;
            if (spawn <= 0) { makeRow(); spawn += gap; }
            for (const row of rows) {
                row.y += speed * dt;
                if (!row.done && row.y >= 420) {
                    row.done = true;
                    if (row.delivery) {
                        if (bag > 0) {
                            delivered += bag; bag = 0; sfx('coin'); env.buzz(20);
                            fx.text(180, 375, 'DELIVERY COMPLETE', { size: 21, color: '#86efac' });
                            fx.burst(x, 420, { n: 20, colors: ['#4ade80', '#fde047', '#fff'], speed: 150 });
                            if (delivered >= target) { finish(true); return; }
                        } else fx.text(180, 375, 'Pick up parcels first', { size: 18, color: '#fde68a' });
                    } else if (Math.abs(x - lanes[row.blocked]) < 40) {
                        lives--; bag = Math.max(0, bag - 1); hurt = .7;
                        sfx('thud'); env.buzz(30); fx.shake(5, .2);
                        fx.text(x, 380, 'BUMP! -1 PARCEL', { size: 19, color: '#fca5a5' });
                        if (lives <= 0) { finish(false); return; }
                    } else if (Math.abs(x - lanes[row.parcel]) < 40) {
                        bag++; sfx('tap'); fx.text(x, 380, '+1 PARCEL', { size: 20, color: '#fde047' });
                    }
                }
            }
            rows = rows.filter(row => row.y < 500);
        }
        function draw(c) {
            c.fillStyle = U.vgrad(c, 0, 560, [[0, '#082f49'], [.35, '#075985'], [1, '#0f172a']]); c.fillRect(0, 0, 360, 560);
            for (let i = 0; i < 7; i++) {
                const h = 45 + (U.hash(i, 2) % 65);
                c.fillStyle = i % 2 ? '#0f172a' : '#1e293b'; c.fillRect(i * 58 - 18, 146 - h, 47, h);
                c.fillStyle = '#fcd34d'; for (let y = 150 - h; y < 132; y += 16) c.fillRect(i * 58 - 8, y, 8, 6);
            }
            c.fillStyle = '#334155'; c.fillRect(30, 140, 300, 360);
            c.fillStyle = '#94a3b8'; c.fillRect(24, 140, 6, 360); c.fillRect(330, 140, 6, 360);
            c.strokeStyle = '#cbd5e1'; c.lineWidth = 3; c.setLineDash([22, 18]); c.lineDashOffset = -distance % 40;
            for (const lx of [130, 230]) { c.beginPath(); c.moveTo(lx, 140); c.lineTo(lx, 500); c.stroke(); }
            c.setLineDash([]);
            for (const row of rows) {
                if (row.delivery) {
                    c.fillStyle = 'rgba(34,197,94,.35)'; c.fillRect(33, row.y - 20, 294, 40);
                    U.text(c, 'DELIVERY ZONE', 180, row.y, { size: 15, color: '#bbf7d0', stroke: '#14532d' });
                } else {
                    const px = lanes[row.parcel], bx = lanes[row.blocked];
                    panel(c, U, px - 18, row.y - 16, 36, 32, '#b45309');
                    c.fillStyle = '#fde68a'; c.fillRect(px - 3, row.y - 16, 6, 32);
                    c.fillStyle = '#f97316'; c.beginPath(); c.moveTo(bx, row.y - 24); c.lineTo(bx + 23, row.y + 20); c.lineTo(bx - 23, row.y + 20); c.closePath(); c.fill();
                    c.fillStyle = '#fff7ed'; c.fillRect(bx - 12, row.y, 24, 6);
                }
            }
            c.save();
            if (hurt > 0) c.globalAlpha = .5 + .5 * Math.sin(hurt * 40);
            U.shadow(c, x, 449, 26, 8);
            c.strokeStyle = '#020617'; c.lineWidth = 6;
            for (const wx of [x - 17, x + 17]) { c.beginPath(); c.arc(wx, 434, 13, 0, Math.PI * 2); c.stroke(); }
            c.strokeStyle = '#38bdf8'; c.lineWidth = 4; c.beginPath(); c.moveTo(x - 17, 434); c.lineTo(x, 409); c.lineTo(x + 17, 434); c.lineTo(x - 17, 434); c.stroke();
            c.fillStyle = '#8d5524'; c.beginPath(); c.arc(x, 390, 10, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#eab308'; U.rr(c, x - 12, 401, 25, 23, 5); c.fill();
            c.fillStyle = '#92400e'; c.fillRect(x - 20, 404, 15, 20);
            c.restore();
            panel(c, U, 12, 8, 336, 58);
            U.text(c, 'COURIER LANE SPRINT', 180, 28, { size: 19, color: '#7dd3fc' });
            U.text(c, `${Math.ceil(time)}s | Delivered ${delivered}/${target} | Bag ${bag} | Bike ${lives}/3`, 180, 50, { size: 12 });
            control(c, U, 18, 494, 104, '< LEFT');
            control(c, U, 130, 494, 100, 'DRAG LANES');
            control(c, U, 238, 494, 104, 'RIGHT >');
        }
        return { title: 'Courier Lane Sprint', goal: `Deliver ${target} parcels with your bike intact`,
            intro: { head: 'COURIER SPRINT', lines: ['Drag between lanes or tap left/right', 'Pick up boxes; avoid orange cones', 'Green zones deliver your parcel bag', 'Three bumps end the route'] },
            start, update, draw, down, move, up,
            _state: () => ({ time, lane, x, bag, delivered, lives, rows, spawn, speed, gap, target, finished }) };
    });
})();
