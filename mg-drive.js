'use strict';

// Convoy Rush: a Left/Right-style gate runner where the "troops" are cars.
Minigames.register('drive', env => {
    const { W, H, U, sfx, buzz, fx, banner, end } = env;
    const RL = 40, RR = 320, CY = 415, STAGES = 3, ROW_GAP = 190;
    const rank = U.challenge(env.level);
    const WEAPONS = ['Exhaust Pops', 'Twin Cannons', 'Rocket Launchers', 'Plasma Lasers'];
    const BOSSES = [
        { name: 'CHIEF CRUISER', hp: 85, color: '#1e293b', kind: 'cop' },
        { name: 'TOW TRUCK TITAN', hp: 210, color: '#eab308', kind: 'tow' },
        { name: 'MONSTER MAYOR', hp: 400, color: '#7c3aed', kind: 'monster' }
    ];
    const SKY = ['rgba(0,0,0,0)', 'rgba(120,40,10,.22)', 'rgba(5,10,40,.45)'];

    let stage, mode, count, shown, tier, meter, scroll, dist, rows, rowIdx, ents, bullets, shots, boss, bossT;
    let cx, tx, steer, nitroHeld, brakeHeld, nitroOn, fireT, hurtT, cleared, kills, gatesHit, peak, modeT, nextId, flameT;

    function start() {
        stage = 1; count = 5; shown = 5; tier = 0; meter = .3; cleared = 0; kills = 0; gatesHit = 0; peak = 5;
        cx = W / 2; tx = cx; steer = null; nitroHeld = null; brakeHeld = null; nitroOn = false;
        fireT = 0; hurtT = 0; nextId = 1; flameT = 0; bullets = []; shots = [];
        prepStage();
    }

    function prepStage() {
        mode = 'run'; modeT = 0; dist = 0; rowIdx = 0; ents = []; boss = null; bullets.length = 0; shots.length = 0;
        rows = genRows(stage);
        banner(`STAGE ${stage}`, '#38bdf8', stage === 1 ? 'Grow your convoy' : `Pit stop +${bonusCars()} cars`);
    }
    const bonusCars = () => stage === 1 ? 0 : Math.max(3, Math.ceil(count * .2));

    function genRows(s) {
        const list = [], n = 12 + s * 2;
        for (let i = 0; i < n; i++) {
            const at = 260 + i * ROW_GAP, r = Math.random();
            let items;
            if (i === 3 || (i === 8 && s < 3) || (i === 6 && s === 3)) items = crateRow();
            else if (r < .38) items = gateRow(s);
            else if (r < .55) items = hazardRow(s);
            else if (r < .72) items = copRow(s);
            else if (r < .82) items = lightRow();
            else if (r < .92) items = pickupRow();
            else items = barrelRow();
            list.push({ at, items });
        }
        return list;
    }
    const ent = (type, x, y, o) => Object.assign({ id: nextId++, type, x, y, w: 30, h: 30, vx: 0, sp: 0, hp: 1, hit: false }, o);
    const lane = () => U.pick([75, 145, 215, 285]);

    function gateRow(s) {
        const k = Math.random(), pair = nextId;
        let a, b;
        const small = () => ({ op: '+', v: U.pick([3, 4, 5, 6, 8, 10]) + s * 2, icon: '⛽', name: 'GAS' });
        const mult = () => ({ op: '×', v: Math.random() < .2 ? 3 : 2, icon: '⚡', name: 'TURBO' });
        const bad = () => ({ op: '-', v: U.pick([3, 4, 5, 6]) + s * 2, icon: '🚧', name: 'TOLL' });
        if (k < .45) { a = small(); b = bad(); }
        else if (k < .75) { a = small(); b = mult(); }
        else if (k < .9) { a = mult(); b = bad(); }
        else { a = bad(); b = bad(); b.v = Math.max(2, b.v - 3); }
        if (Math.random() < .5) [a, b] = [b, a];
        return [
            ent('gate', RL, -50, { w: 140, h: 44, side: 0, pair, g: a }),
            ent('gate', 180, -50, { w: 140, h: 44, side: 1, pair, g: b })
        ];
    }
    function crateRow() { return [ent('crate', U.pick([95, 265]), -40, { w: 38, h: 38 })]; }
    function hazardRow(s) {
        const xs = [75, 145, 215, 285].sort(() => Math.random() - .5).slice(0, 2 + (s > 1 ? 1 : 0));
        return xs.map((x, i) => i === 0 && Math.random() < .5
            ? ent('stop', x, -40, { w: 44, h: 44, hp: 2 })
            : ent('pothole', x + U.rand(-12, 12), -40 - i * 36, { w: 36, h: 28 }));
    }
    function copRow(s) {
        const n = 1 + (s > 1 && Math.random() < .5 ? 1 : 0) + (s > 2 ? 1 : 0);
        return Array.from({ length: n }, (_, i) => ent('cop', 70 + i * 90 + U.rand(0, 60), -50 - i * 46,
            { w: 30, h: 50, hp: 3 + s, sp: 55 + s * 10 }));
    }
    function lightRow() { return [ent('light', W / 2, -30, { w: RR - RL, h: 18, phase: Math.random() * 3 })]; }
    function pickupRow() {
        const x = lane(), items = [];
        for (let i = 0; i < 3; i++) items.push(ent(Math.random() < .5 ? 'gas' : 'nitro', x + (i % 2 ? 16 : -16), -30 - i * 38, { w: 26, h: 28 }));
        return items;
    }
    function barrelRow() {
        const x = U.pick([100, 180, 250]);
        return [-26, 0, 26].map((o, i) => ent('barrel', x + o, -30 - Math.abs(i - 1) * 8, { w: 24, h: 26, hp: 1 }));
    }

    const bodyW = () => {
        const s = carScale(), cols = Math.max(1, Math.min(6, Math.ceil(Math.sqrt(count / 1.4))));
        return Math.max(18, Math.min(112, cols * 22 * s)) / 2 + 4;
    };
    const carScale = () => count > 40 ? .6 : count > 20 ? .75 : count > 8 ? .9 : 1;

    function down(p) {
        if (p.y > 492 && p.x < 112) { nitroHeld = p.id; p.role = 'nitro'; if (mode === 'boss') blast(); sfx('click'); return; }
        if (p.y > 492 && p.x > 248) { brakeHeld = p.id; p.role = 'brake'; sfx('click'); return; }
        if (steer === null) { steer = p.id; p.role = 'steer'; p.off = cx - p.x; tx = p.x + p.off; }
    }
    function move(p) { if (p.role === 'steer') tx = p.x + p.off; }
    function up(p) {
        if (p.role === 'steer') steer = null;
        if (p.role === 'nitro') nitroHeld = null;
        if (p.role === 'brake') brakeHeld = null;
    }

    function blast() {
        if (meter < .5 || !boss || boss.y < 60) return;
        meter -= .5;
        damageBoss(boss.max * .15);
        fx.flash('#38bdf8', .3); fx.shake(6, .3); sfx('bell'); buzz(30);
        banner('NITRO BLAST!', '#38bdf8');
    }

    function gain(n, label, color) {
        count = Math.min(999, count + n); peak = Math.max(peak, count);
        fx.text(cx, CY - 30, label, { color: color || '#86efac', size: 26 });
    }
    function hurt(n, label) {
        n = Math.min(count, Math.max(1, Math.round(n)));
        count -= n; hurtT = .5;
        fx.text(cx, CY - 30, label || `-${n}`, { color: '#fca5a5', size: 26 });
        fx.burst(cx, CY, { n: 14, colors: ['#f97316', '#fbbf24', '#94a3b8'], speed: 200, life: .6 });
        fx.shake(6, .25); fx.flash('#ef4444', .2); sfx('hit'); buzz(40);
        if (count <= 0) lose();
    }

    function useGate(g) {
        const op = g.g;
        gatesHit++;
        if (op.op === '+') { gain(op.v, `+${op.v} ${op.icon}`); sfx('coin'); }
        else if (op.op === '×') { gain(count * (op.v - 1), `×${op.v} ${op.icon}`, '#7dd3fc'); sfx('cheer'); fx.flash('#38bdf8', .2); }
        else hurt(op.v, `-${op.v} ${op.icon}`);
        fx.burst(cx, CY - 20, { n: 16, colors: op.op === '-' ? ['#ef4444', '#fca5a5'] : ['#4ade80', '#fde047', '#7dd3fc'], speed: 220, shape: 'rect' });
    }

    function overlaps(e, pad = 0) {
        const bw = bodyW();
        return Math.abs(e.x - cx) < bw + e.w / 2 - pad && e.y + e.h / 2 > CY - 18 && e.y - e.h / 2 < CY + 6;
    }

    function killEnt(e, byShot) {
        e.dead = true; kills++;
        fx.burst(e.x, e.y, { n: 16, colors: ['#f97316', '#fbbf24', '#475569'], speed: 230, life: .6 });
        sfx('hit');
        if (e.type === 'cop' && byShot && Math.random() < .5) { ents.push(ent(Math.random() < .5 ? 'gas' : 'nitro', e.x, e.y, { w: 26, h: 28 })); }
    }

    function damageAt(x, y, dmg, radius) {
        let any = false;
        ents.forEach(e => {
            if (e.dead || !['cop', 'barrel', 'stop'].includes(e.type)) return;
            if (Math.abs(e.x - x) < e.w / 2 + radius && Math.abs(e.y - y) < e.h / 2 + radius) {
                e.hp -= dmg; any = true; e.flash = .1;
                if (e.hp <= 0) killEnt(e, true);
            }
        });
        return any;
    }
    function damageBoss(d) {
        if (!boss || boss.hp <= 0) return;
        boss.hp = Math.max(0, boss.hp - d); boss.flash = .08;
        if (boss.hp <= 0) beatBoss();
    }

    function fire(dt) {
        fireT += dt;
        const rate = U.clamp(2 + count * .5, 2, 16), iv = 1 / rate;
        while (fireT >= iv) {
            fireT -= iv;
            const bw = bodyW(), x = cx + U.rand(-bw + 6, bw - 6);
            if (tier === 0) bullets.push({ x, y: CY - 16, vy: -560, dmg: 1, r: 3, c: '#fde047' });
            else if (tier === 1) [-6, 6].forEach(o => bullets.push({ x: x + o, y: CY - 16, vy: -600, dmg: 1.2, r: 3.5, c: '#fb923c' }));
            else if (tier === 2) bullets.push({ x, y: CY - 16, vy: -430, dmg: 3, r: 6, c: '#f87171', splash: 34, rocket: true });
            else [-7, 7].forEach(o => bullets.push({ x: x + o, y: CY - 16, vy: -760, dmg: 2.5, r: 4, c: '#67e8f9', pierce: true, laser: true }));
        }
    }

    function updateBullets(dt) {
        bullets.forEach(b => {
            b.y += b.vy * dt;
            if (b.y < -20) { b.dead = true; return; }
            if (boss && boss.hp > 0 && Math.abs(b.x - boss.x) < boss.w / 2 && Math.abs(b.y - boss.y) < boss.h / 2) {
                damageBoss(b.dmg);
                if (b.splash) fx.burst(b.x, b.y, { n: 8, colors: ['#f97316', '#fde047'], speed: 140, life: .4 });
                if (!b.pierce) b.dead = true;
                return;
            }
            const hit = ents.find(e => !e.dead && ['cop', 'barrel', 'stop'].includes(e.type) && !(b.pierce && b.seen && b.seen.has(e.id)) &&
                Math.abs(b.x - e.x) < e.w / 2 + b.r && Math.abs(b.y - e.y) < e.h / 2 + b.r);
            if (hit) {
                if (b.splash) { damageAt(b.x, b.y, b.dmg, b.splash); fx.burst(b.x, b.y, { n: 12, colors: ['#f97316', '#fde047', '#fff'], speed: 180, life: .45 }); b.dead = true; return; }
                hit.hp -= b.dmg; hit.flash = .1;
                if (hit.hp <= 0) killEnt(hit, true);
                if (b.pierce) { (b.seen = b.seen || new Set()).add(hit.id); } else b.dead = true;
            }
        });
        bullets = bullets.filter(b => !b.dead);
    }

    function update(dt) {
        modeT += dt; hurtT = Math.max(0, hurtT - dt); flameT += dt;
        shown += (count - shown) * Math.min(1, dt * 9);
        nitroOn = !!nitroHeld && meter > 0 && mode === 'run';
        let v = (mode === 'run' ? 135 + stage * 12 : 150) * (1 + rank * .08);
        if (nitroOn) { meter = Math.max(0, meter - .2 * dt); v *= 1.85; } else if (brakeHeld && mode === 'run') v *= .35;
        scroll = (scroll || 0) + v * dt;
        const bw = bodyW();
        cx += U.clamp(tx - cx, -560 * dt, 560 * dt);
        cx = U.clamp(cx, RL + bw, RR - bw);

        if (mode === 'run') {
            dist += v * dt;
            while (rowIdx < rows.length && dist >= rows[rowIdx].at) { ents.push(...rows[rowIdx].items); rowIdx++; }
            if (rowIdx >= rows.length && dist >= rows[rows.length - 1].at + 650) startBoss();
        }
        if (mode !== 'bossDead') fire(dt);
        updateBullets(dt);

        ents.forEach(e => {
            e.y += (v + e.sp) * dt; e.x += e.vx * dt;
            if (e.flash) e.flash -= dt;
            if (e.type === 'cop') e.x += U.clamp(cx - e.x, -1, 1) * 26 * dt;
            if (e.dead || e.hit) return;
            if (e.type === 'gate') {
                if (e.y + e.h / 2 >= CY && !e.used) {
                    const pairs = ents.filter(o => o.pair === e.pair);
                    pairs.forEach(o => { o.used = true; });
                    const chosen = pairs.find(o => o.side === (cx < W / 2 ? 0 : 1));
                    if (chosen) { chosen.taken = true; useGate(chosen); }
                }
                return;
            }
            if (!overlaps(e, e.type === 'light' ? -999 : 3) && e.type !== 'light') return;
            if (e.type === 'light') {
                if (e.y >= CY - 4) {
                    e.hit = true;
                    const t = (e.phase + modeT) % 3;
                    if (t < 1.6 && !nitroOn) { hurt(Math.ceil(count * .25), 'RED LIGHT!'); fx.burst(cx, CY - 40, { n: 6, colors: ['#fff'], speed: 100, life: .2 }); }
                    else { fx.text(cx, CY - 30, nitroOn ? 'BLAZING!' : 'GREEN', { color: '#86efac', size: 18 }); }
                }
                return;
            }
            e.hit = true;
            switch (e.type) {
                case 'pothole': if (nitroOn) fx.text(e.x, e.y, 'JUMP', { color: '#fde047', size: 16 }); else { hurt(1, 'POTHOLE -1'); sfx('thud'); } break;
                case 'stop': if (nitroOn) killEnt(e); else { hurt(Math.max(2, Math.ceil(count * .12)), 'STOP SIGN'); e.dead = true; } break;
                case 'barrel': if (nitroOn) killEnt(e); else { hurt(1, 'CRASH -1'); e.dead = true; } break;
                case 'cop': if (nitroOn) killEnt(e); else { hurt(3 + stage, 'BUSTED!'); e.dead = true; fx.burst(e.x, e.y, { n: 14, colors: ['#ef4444', '#3b82f6'], speed: 200 }); } break;
                case 'gas': gain(3, '+3 ⛽'); sfx('coin'); e.dead = true; break;
                case 'nitro': meter = Math.min(1, meter + .25); fx.text(cx, CY - 30, 'NITRO +', { color: '#7dd3fc', size: 20 }); sfx('coin'); e.dead = true; break;
                case 'crate':
                    e.dead = true;
                    if (tier < 3) { tier++; banner('UPGRADE!', '#fb923c', WEAPONS[tier]); sfx('cheer'); fx.flash('#fb923c', .25); }
                    else { gain(8, '+8 🔧'); }
                    break;
                case 'proj': if (!nitroOn) hurt(2, 'HIT!'); e.dead = true; break;
            }
        });
        ents = ents.filter(e => !e.dead && e.y < H + 80);

        if (mode === 'boss') updateBoss(dt);
        if (mode === 'bossDead') {
            modeT += 0;
            if (modeT > 2.3) nextStage();
        }
    }

    function startBoss() {
        mode = 'boss'; modeT = 0;
        const def = BOSSES[stage - 1];
        const big = stage === 3;
        const hp = Math.round(def.hp * (1 + rank * .2));
        boss = { def, x: W / 2, y: -140, w: big ? 150 : 120, h: big ? 150 : 140, hp, max: hp, t: 0, atk: 1.6, flash: 0, charge: 0 };
        ents.filter(e => e.type !== 'gas' && e.type !== 'nitro').forEach(e => { e.dead = true; });
        banner('BOSS!', '#ef4444', def.name); sfx('bell'); fx.shake(5, .4);
    }

    function updateBoss(dt) {
        const b = boss;
        if (!b || b.hp <= 0) return;
        b.t += dt; if (b.flash) b.flash -= dt;
        if (b.y < 110) { b.y += 90 * dt; return; }
        b.x = W / 2 + Math.sin(b.t * (.8 + stage * .15)) * (85 + stage * 10);
        b.atk -= dt;
        b.charge = b.atk < .45 ? 1 - b.atk / .45 : 0;
        if (b.atk <= 0) {
            b.atk = Math.max(.75, 1.7 - stage * .28) * U.rand(.8, 1.15) / (1 + rank * .12);
            const r = Math.random();
            if (r < .45) [-34, 0, 34].forEach(o => ents.push(ent('proj', b.x + o, b.y + 70, { w: 22, h: 22, sp: 200, vx: o * 1.1 })));
            else if (r < .75 || stage === 1) [-1, 0, 1].forEach(o => ents.push(ent('proj', b.x + o * 24, b.y + 70, { w: 20, h: 20, sp: 150 + stage * 20, vx: (cx - b.x) * .25 + o * 18 })));
            else ents.push(ent('cop', b.x, b.y + 80, { w: 30, h: 50, hp: 2 + stage, sp: 190 }));
            sfx('whoosh');
        }
    }

    function beatBoss() {
        mode = 'bossDead'; modeT = 0; cleared++;
        for (let i = 0; i < 4; i++) fx.burst(boss.x + U.rand(-50, 50), boss.y + U.rand(-50, 50), { n: 22, colors: ['#f97316', '#fde047', '#fff', '#ef4444'], speed: 300, life: .9 });
        fx.shake(10, .6); fx.flash('#fde047', .4); sfx('cheer'); buzz([60, 40, 60]);
        banner(stage === STAGES ? 'VICTORY!' : 'BOSS DOWN!', '#fde047', stage === STAGES ? 'You cleaned up the DMV' : 'On to the next district');
        ents.forEach(e => { if (e.type === 'proj' || e.type === 'cop') e.dead = true; });
    }

    function nextStage() {
        if (stage >= STAGES) return finish(true);
        stage++;
        const b = bonusCars(); count += b; peak = Math.max(peak, count);
        boss = null; prepStage();
    }

    function lose() { finish(false); }

    function finish(win) {
        const stars = Math.min(8, 1 + cleared * 2 + (win ? 1 : 0));
        end({
            win, head: win ? 'CONVOY VICTORY!' : 'CONVOY WRECKED',
            lines: [win ? 'All 3 bosses defeated' : `Reached stage ${stage}/${STAGES}`, `${cleared} boss${cleared === 1 ? '' : 'es'} beaten · ${kills} wrecks`, `Peak convoy ${peak} cars · ${WEAPONS[tier]}`],
            stars
        });
    }

    // ---------- drawing ----------
    function carTop(c, x, y, w, h, color, o = {}) {
        c.save(); c.translate(x, y);
        if (o.down) c.rotate(Math.PI);
        const hw = w / 2, hh = h / 2;
        if (o.shadow !== false) U.shadow(c, 2, 4, hw * .95, hh * .95, .3);
        c.fillStyle = '#0b0f1a';
        [[-hw - 1, -hh * .55], [hw - 2, -hh * .55], [-hw - 1, hh * .35], [hw - 2, hh * .35]].forEach(([wx, wy]) => c.fillRect(wx, wy, 3.5, hh * .38));
        U.rr(c, -hw, -hh, w, h, Math.min(8, w * .3));
        c.fillStyle = color; c.fill();
        c.lineWidth = 1; c.strokeStyle = 'rgba(0,0,0,.4)'; c.stroke();
        c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(-hw + 2, -hh + 2, w * .35, h - 4);
        c.fillStyle = o.glass || '#7dd3fc';
        U.rr(c, -hw * .72, -hh * .35, w * .72, h * .22, 3); c.fill();
        U.rr(c, -hw * .66, hh * .28, w * .66, h * .16, 3); c.fill();
        c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(-hw * .7, -hh * .1, w * .7, h * .36);
        if (o.stripe) { c.fillStyle = o.stripe; c.fillRect(-hw, -hh * .02, w, h * .1); }
        if (!o.noLights) {
            c.fillStyle = '#fef9c3'; c.fillRect(-hw + 1, -hh, w * .24, 3); c.fillRect(hw - w * .24 - 1, -hh, w * .24, 3);
            c.fillStyle = '#ef4444'; c.fillRect(-hw + 1, hh - 3, w * .22, 3); c.fillRect(hw - w * .22 - 1, hh - 3, w * .22, 3);
        }
        if (o.siren) {
            const on = Math.floor(env.time() * 8) % 2;
            c.fillStyle = on ? '#ef4444' : '#3b82f6'; c.fillRect(-hw * .7, -hh * .05, w * .35, 4);
            c.fillStyle = on ? '#3b82f6' : '#ef4444'; c.fillRect(0, -hh * .05, w * .35, 4);
            U.glow(c, on ? -hw * .4 : hw * .4, 0, 22, on ? 'rgba(239,68,68,.8)' : 'rgba(59,130,246,.8)', .7);
        }
        c.restore();
    }

    function drawRoad(c) {
        c.fillStyle = '#1a2a22'; c.fillRect(0, 0, W, H);
        const s = scroll || 0;
        for (let side = 0; side < 2; side++) {
            const x0 = side ? RR + 10 : 0, w0 = side ? W - RR - 10 : RL - 10;
            c.fillStyle = '#3b4252'; c.fillRect(side ? RR : 0, 0, side ? W - RR : RL, H);
            for (let wi = Math.floor((s - H) / 110) - 1; wi <= Math.floor(s / 110) + 1; wi++) {
                const y = s - wi * 110 - 80, hs = U.hash(wi, side + stage * 3);
                c.fillStyle = ['#7c2d12', '#334155', '#4c1d95', '#14532d', '#78350f'][hs % 5];
                c.fillRect(x0 + 2, y, w0 - 4, 78);
                c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(x0 + 2, y, w0 - 4, 6);
                c.fillStyle = (hs >> 4) % 2 ? '#fde68a' : '#1e293b';
                for (let k = 0; k < 3; k++) c.fillRect(x0 + 6 + (k % 2) * 14, y + 14 + k * 20, 8, 8);
            }
        }
        c.fillStyle = '#4b5563'; c.fillRect(RL - 8, 0, 8, H); c.fillRect(RR, 0, 8, H);
        c.fillStyle = U.vgrad(c, 0, H, [[0, '#262b36'], [1, '#30353f']]); c.fillRect(RL, 0, RR - RL, H);
        c.fillStyle = 'rgba(255,255,255,.55)';
        for (const x of [110, 180, 250]) {
            for (let wi = Math.floor((s - H) / 70) - 1; wi <= Math.floor(s / 70) + 1; wi++) c.fillRect(x - 1.5, s - wi * 70 - 50, 3, 34);
        }
        c.fillStyle = 'rgba(255,200,40,.8)'; c.fillRect(RL + 1, 0, 2, H); c.fillRect(RR - 3, 0, 2, H);
        if (nitroOn) {
            c.strokeStyle = 'rgba(125,211,252,.35)'; c.lineWidth = 2;
            for (let i = 0; i < 14; i++) {
                const x = RL + U.hash(i, 5) % (RR - RL), y = ((U.hash(i, 9) % H) + flameT * 700) % H;
                c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 40); c.stroke();
            }
        }
    }

    function drawGate(c, e) {
        const op = e.g, good = op.op !== '-';
        const col = op.op === '-' ? '220,38,38' : op.op === '×' ? '37,99,235' : '22,163,74';
        c.save();
        c.globalAlpha = e.used && !e.taken ? .35 : .88;
        U.rr(c, e.x + 3, e.y - e.h / 2, e.w - 6, e.h, 8);
        c.fillStyle = `rgba(${col},.78)`; c.fill();
        c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.stroke();
        c.restore();
        U.text(c, `${op.op}${op.v}`, e.x + e.w / 2 + 12, e.y - 3, { size: 24, color: '#fff', stroke: 'rgba(0,0,0,.6)', lw: 4 });
        U.text(c, op.icon, e.x + 26, e.y - 3, { size: 20 });
        U.text(c, op.name, e.x + e.w / 2 + 12, e.y + 14, { size: 9, color: '#fff', alpha: .8 });
        if (good) U.glow(c, e.x + e.w / 2, e.y, 50, `rgba(${col},.5)`, .35);
    }

    function drawEnt(c, e) {
        const t = env.time();
        switch (e.type) {
            case 'gate': drawGate(c, e); break;
            case 'pothole':
                c.fillStyle = '#0b0b0f'; c.beginPath(); c.ellipse(e.x, e.y, 19, 12, 0, 0, Math.PI * 2); c.fill();
                c.strokeStyle = '#4b5563'; c.lineWidth = 3; c.stroke();
                c.fillStyle = '#1f2937'; c.beginPath(); c.ellipse(e.x - 2, e.y - 2, 12, 6, 0, 0, Math.PI * 2); c.fill(); break;
            case 'stop':
                c.fillStyle = '#9ca3af'; c.fillRect(e.x - 3, e.y, 6, 22);
                c.save(); c.translate(e.x, e.y - 6); U.poly(c, 8, 22, Math.PI / 8); c.fillStyle = e.flash > 0 ? '#fff' : '#dc2626'; c.fill();
                c.lineWidth = 2.5; c.strokeStyle = '#fff'; c.stroke(); c.restore();
                U.text(c, 'STOP', e.x, e.y - 6, { size: 11, color: '#fff' }); break;
            case 'barrel':
                U.shadow(c, e.x + 2, e.y + 8, 12, 5, .3);
                c.fillStyle = e.flash > 0 ? '#fff' : '#f97316'; U.rr(c, e.x - 11, e.y - 13, 22, 26, 5); c.fill();
                c.fillStyle = '#fff'; c.fillRect(e.x - 11, e.y - 5, 22, 5); c.fillRect(e.x - 11, e.y + 5, 22, 3); break;
            case 'cop': carTop(c, e.x, e.y, 30, 52, e.flash > 0 ? '#fff' : '#111827', { down: true, siren: true, stripe: '#f8fafc' }); break;
            case 'gas':
                U.glow(c, e.x, e.y, 22, 'rgba(250,204,21,.6)', .6 + .3 * Math.sin(t * 6));
                c.fillStyle = '#dc2626'; U.rr(c, e.x - 10, e.y - 12, 20, 25, 4); c.fill();
                c.fillStyle = '#fde047'; c.fillRect(e.x - 4, e.y - 16, 8, 5);
                U.text(c, '⛽', e.x, e.y, { size: 13 }); break;
            case 'nitro':
                U.glow(c, e.x, e.y, 24, 'rgba(56,189,248,.7)', .7);
                c.fillStyle = '#2563eb'; U.rr(c, e.x - 8, e.y - 14, 16, 28, 7); c.fill();
                c.fillStyle = '#bae6fd'; c.fillRect(e.x - 8, e.y - 3, 16, 5);
                U.text(c, '⚡', e.x, e.y, { size: 12 }); break;
            case 'crate':
                U.glow(c, e.x, e.y, 36, 'rgba(251,146,60,.8)', .8);
                c.save(); c.translate(e.x, e.y); c.rotate(Math.sin(t * 3) * .1);
                c.fillStyle = '#7c2d12'; U.rr(c, -18, -18, 36, 36, 5); c.fill();
                c.strokeStyle = '#fb923c'; c.lineWidth = 3; c.stroke();
                c.restore(); U.text(c, '🔫', e.x, e.y, { size: 20 });
                U.text(c, 'WEAPON', e.x, e.y + 28, { size: 9, color: '#fb923c', stroke: 'rgba(0,0,0,.7)', lw: 3 }); break;
            case 'proj':
                U.glow(c, e.x, e.y, 20, 'rgba(239,68,68,.6)', .8);
                c.fillStyle = '#92400e'; c.beginPath(); c.arc(e.x, e.y, 10, 0, Math.PI * 2); c.fill();
                c.fillStyle = '#fbbf24'; c.fillRect(e.x - 10, e.y - 3, 20, 4); break;
            case 'light': {
                const ph = (e.phase + env.time()) % 3, red = ph < 1.6;
                c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(RL, e.y - 4, RR - RL, 8);
                c.fillStyle = red ? 'rgba(239,68,68,.55)' : 'rgba(74,222,128,.4)'; c.fillRect(RL, e.y - 3, RR - RL, 6);
                c.fillStyle = '#374151'; c.fillRect(RL - 8, e.y - 40, 10, 44); c.fillRect(RR - 2, e.y - 40, 10, 44);
                [RL - 3, RR + 3].forEach(x => {
                    U.rr(c, x - 8, e.y - 58, 16, 22, 4); c.fillStyle = '#111827'; c.fill();
                    c.fillStyle = red ? '#ef4444' : '#7f1d1d'; c.beginPath(); c.arc(x, e.y - 52, 4, 0, 7); c.fill();
                    c.fillStyle = red ? '#14532d' : '#4ade80'; c.beginPath(); c.arc(x, e.y - 41, 4, 0, 7); c.fill();
                });
                U.text(c, red ? 'RED' : 'GO', W / 2, e.y - 14, { size: 11, color: red ? '#fca5a5' : '#86efac', stroke: 'rgba(0,0,0,.7)', lw: 3 });
                break;
            }
        }
    }

    function drawConvoy(c) {
        const s = carScale(), n = Math.min(36, Math.max(1, Math.round(shown)));
        const cols = Math.max(1, Math.min(6, Math.ceil(Math.sqrt(n / 1.4)))), cw = 22 * s, ch = 36 * s;
        if (nitroOn) U.glow(c, cx, CY + 20, 90, 'rgba(56,189,248,.6)', .7);
        for (let i = n - 1; i >= 0; i--) {
            const r = Math.floor(i / cols), k = i % cols, inRow = Math.min(cols, n - r * cols);
            const x = cx + (k - (inRow - 1) / 2) * cw + Math.sin(env.time() * 3 + i) * 1;
            const y = CY + r * ch;
            if (nitroOn) {
                c.fillStyle = `rgba(56,189,248,${.7})`; c.beginPath(); c.moveTo(x - 4 * s, y + 14 * s); c.lineTo(x, y + (28 + Math.random() * 14) * s); c.lineTo(x + 4 * s, y + 14 * s); c.fill();
            }
            const lead = i < cols;
            carTop(c, x, y, 18 * s, 30 * s, hurtT > 0 && Math.floor(env.time() * 20) % 2 ? '#fff' : ['#ef4444', '#2563eb', '#16a34a', '#eab308', '#a855f7'][i % 5],
                { stripe: lead ? '#fff' : null, shadow: lead });
        }
        const lab = String(Math.round(shown));
        U.rr(c, cx - 22, CY - 54, 44, 24, 12); c.fillStyle = 'rgba(0,0,0,.65)'; c.fill();
        c.strokeStyle = hurtT > 0 ? '#ef4444' : '#7dd3fc'; c.lineWidth = 2; c.stroke();
        U.text(c, lab, cx, CY - 42, { size: lab.length > 3 ? 12 : 16, color: '#fff' });
    }

    function drawBullets(c) {
        bullets.forEach(b => {
            if (b.laser) { c.fillStyle = 'rgba(103,232,249,.35)'; c.fillRect(b.x - 3, b.y - 6, 6, 26); c.fillStyle = '#ecfeff'; c.fillRect(b.x - 1.5, b.y - 6, 3, 22); }
            else if (b.rocket) {
                U.glow(c, b.x, b.y + 8, 16, 'rgba(251,146,60,.8)', .8);
                c.fillStyle = '#e5e7eb'; U.rr(c, b.x - 3, b.y - 8, 6, 16, 3); c.fill();
                c.fillStyle = '#ef4444'; c.fillRect(b.x - 3, b.y - 8, 6, 4);
            } else { U.glow(c, b.x, b.y, 8, b.c, .8); c.fillStyle = b.c; c.beginPath(); c.arc(b.x, b.y, b.r, 0, Math.PI * 2); c.fill(); }
        });
    }

    function drawBoss(c) {
        if (!boss) return;
        const b = boss, d = b.def, hw = b.w / 2, hh = b.h / 2;
        if (b.hp <= 0) return;
        c.save(); c.translate(b.x, b.y);
        if (b.charge) c.translate(U.rand(-1.5, 1.5) * b.charge, 0);
        U.shadow(c, 4, 8, hw, hh, .35);
        if (d.kind === 'tow') {
            c.fillStyle = '#374151'; c.fillRect(-hw * .8, -hh * .1, b.w * .8, hh * 1.15);
            c.fillStyle = '#6b7280'; for (let i = 0; i < 5; i++) c.fillRect(-hw * .8, hh * .02 + i * 14, b.w * .8, 3);
            c.strokeStyle = '#dc2626'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, hh); c.lineTo(0, hh + 24); c.stroke();
            c.beginPath(); c.arc(0, hh + 30, 8, 0, Math.PI * 1.5); c.stroke();
        }
        if (d.kind === 'monster') {
            c.fillStyle = '#0b0f1a';
            [[-hw - 8, -hh * .75], [hw - 8, -hh * .75], [-hw - 8, hh * .4], [hw - 8, hh * .4]].forEach(([x, y]) => { U.rr(c, x, y, 16, hh * .6, 6); c.fill(); });
            c.fillStyle = '#d1d5db'; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 16 - 6, hh); c.lineTo(i * 16, hh + 16); c.lineTo(i * 16 + 6, hh); c.fill(); }
        }
        c.restore();
        const body = b.flash > 0 ? '#fff' : d.color;
        carTop(c, b.x, b.y, b.w * (d.kind === 'tow' ? .75 : .95), b.h * (d.kind === 'tow' ? .55 : 1), body,
            { down: true, siren: d.kind === 'cop', stripe: d.kind === 'cop' ? '#fff' : '#fde047', shadow: false, glass: '#fecaca' });
        c.save(); c.translate(b.x, b.y + hh + 18);
        c.restore();
        if (b.charge) U.glow(c, b.x, b.y + hh, 50 * b.charge, 'rgba(239,68,68,.9)', b.charge);
    }

    function drawHud(c) {
        const total = rows.length ? rows[rows.length - 1].at + 650 : 1;
        const prog = mode === 'run' ? Math.min(1, dist / total) : 1;
        U.rr(c, 10, 8, 120, 24, 12); c.fillStyle = 'rgba(0,0,0,.6)'; c.fill();
        U.text(c, `STAGE ${stage}/${STAGES}`, 70, 20, { size: 12, color: '#7dd3fc' });
        U.rr(c, 138, 15, 212, 10, 5); c.fillStyle = 'rgba(0,0,0,.6)'; c.fill();
        U.rr(c, 140, 17, Math.max(6, 208 * prog), 6, 3); c.fillStyle = '#4ade80'; c.fill();
        U.text(c, '🏁', 346, 20, { size: 12 });
        // weapon chip
        U.rr(c, 10, 38, 150, 22, 11); c.fillStyle = 'rgba(0,0,0,.6)'; c.fill();
        for (let i = 0; i < 4; i++) { c.fillStyle = i <= tier ? '#fb923c' : 'rgba(255,255,255,.2)'; c.fillRect(18 + i * 8, 44, 6, 10); }
        U.text(c, WEAPONS[tier], 108, 49, { size: 10, color: '#fff' });
        if (boss && mode !== 'bossDead' || (boss && boss.hp > 0)) {
            U.rr(c, 40, 66, 280, 14, 7); c.fillStyle = 'rgba(0,0,0,.7)'; c.fill();
            U.rr(c, 42, 68, Math.max(4, 276 * boss.hp / boss.max), 10, 5); c.fillStyle = '#ef4444'; c.fill();
            U.text(c, boss.def.name, W / 2, 73, { size: 9, color: '#fff' });
        }
        // buttons
        const btn = (x, label, sub, active, col) => {
            U.rr(c, x, 498, 98, 46, 14); c.fillStyle = active ? col : 'rgba(0,0,0,.6)'; c.fill();
            c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; c.stroke();
            U.text(c, label, x + 49, 513, { size: 14 }); U.text(c, sub, x + 49, 531, { size: 9, color: '#e2e8f0', weight: 600 });
        };
        btn(8, '⚡ NITRO', mode === 'boss' ? 'tap: blast (50%)' : 'hold', nitroOn, '#2563eb');
        btn(254, '🛑 BRAKE', 'hold', !!brakeHeld && mode === 'run', '#b91c1c');
        U.rr(c, 112, 520, 136, 14, 7); c.fillStyle = 'rgba(0,0,0,.6)'; c.fill();
        U.rr(c, 114, 522, 132 * meter, 10, 5); c.fillStyle = '#38bdf8'; c.fill();
        U.text(c, 'NITRO', 180, 513, { size: 9, color: '#7dd3fc' });
    }

    function draw(c) {
        drawRoad(c);
        ents.filter(e => e.type !== 'light').forEach(e => drawEnt(c, e));
        ents.filter(e => e.type === 'light').forEach(e => drawEnt(c, e));
        drawBoss(c);
        drawConvoy(c);
        drawBullets(c);
        c.fillStyle = SKY[stage - 1] || SKY[0]; c.fillRect(0, 0, W, H);
        if (stage === 3) { U.glow(c, cx, CY - 60, 120, 'rgba(255,245,200,.35)', .6); }
        drawHud(c);
    }

    start();
    scroll = 0;

    return {
        title: '🚗 Convoy Rush',
        goal: 'Survive the convoy run and defeat all 3 bosses',
        intro: { head: 'CONVOY RUSH', lines: ['Drag to steer · pick the best gate', 'Shoot cops, dodge potholes & red lights', 'Grab 🔫 crates · defeat 3 bosses'] },
        start() { start(); scroll = 0; }, update, draw, down, move, up,
        _state: () => ({ stage, mode, count, tier, meter, dist, boss, ents, rowIdx, rows, cleared, cx }),
        _set: o => { if (o.count !== undefined) { count = o.count; shown = o.count; } if (o.tier !== undefined) tier = o.tier; if (o.meter !== undefined) meter = o.meter; if (o.dist !== undefined) dist = o.dist; if (o.cx !== undefined) { cx = o.cx; tx = o.cx; } }
    };
});
