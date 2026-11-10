'use strict';

// Ring Kings: first-person boxing. Swipe left/right to dodge telegraphed punches, tap to jab, swipe up for a big uppercut when the foe is dazed.
Minigames.register('boxing', env => {
    const { W, H, U, sfx, buzz, fx, banner, end } = env;
    const FOES = [
        { name: 'SOUTHPAW SAM', hp: 60, tel: .9, rest: 1.5, dmg: 10, skin: '#e0ac69', trunks: '#2563eb', combo: 1 },
        { name: 'BENNING RD BRUISER', hp: 85, tel: .68, rest: 1.1, dmg: 14, skin: '#8d5524', trunks: '#16a34a', combo: 2 },
        { name: 'KO KING OF SE', hp: 115, tel: .5, rest: .85, dmg: 18, skin: '#c68642', trunks: '#dc2626', combo: 3 }
    ];
    const MAXHP = 100, DAZE = 2.6;
    const rank = U.challenge(env.level);
    const pressure = U.pressure(env.level), dazeWindow = DAZE - pressure * 1.05;

    let fi, foe, hp, fhp, state, stT, side, dodge, dodgeT, punchT, punchSide, daze, round, kos, hits, taken, stun, roundBanner, comboLeft, swayT;

    function start() { fi = 0; kos = 0; hits = 0; taken = 0; hp = MAXHP; newFoe(); }

    function newFoe() {
        const base = FOES[fi];
        foe = { ...base, hp: Math.round(base.hp * (1 + rank * .12)),
            tel: base.tel * (1 - pressure * .5), rest: base.rest * (1 - pressure * .6), dmg: Math.round(base.dmg + rank * 2) };
        fhp = foe.hp; daze = 0; stun = 0;
        state = 'idle'; stT = U.rand(.8, 1.4); side = 0; comboLeft = 0;
        dodge = 0; dodgeT = 0; punchT = 0; swayT = 0;
        hp = Math.min(MAXHP, hp + 35 - rank * 4);
        banner(`ROUND ${fi + 1}`, '#fde047', foe.name);
        sfx('whistle');
    }

    // ---------- input ----------
    function down(p) { p.role = 'box'; }
    function up(p) {
        if (p.cancelled || stun > 0 || state === 'ko') return;
        const len = Math.hypot(p.dx, p.dy);
        if (len < 20 && p.dur < .3) { jab(p.sx < 180 ? -1 : 1); return; }
        if (p.dy < -50 && Math.abs(p.dy) > Math.abs(p.dx)) { uppercut(); return; }
        if (Math.abs(p.dx) > 40) startDodge(p.dx > 0 ? 1 : -1);
    }

    function startDodge(dir) {
        if (dodgeT > 0) return;
        dodge = dir; dodgeT = .42; sfx('whoosh'); buzz(8);
    }

    function jab(s) {
        if (punchT > 0) return;
        punchT = .28; punchSide = s;
        const canHit = state !== 'block' && !(state === 'windup' && daze <= 0 && Math.random() < .35);
        if (daze > 0 || canHit) {
            const dmg = daze > 0 ? 7 : 4;
            fhp -= dmg; hits++;
            sfx('tap'); buzz(18); fx.shake(2.5, .1);
            fx.burst(180 + s * 30, 235, { n: 8, colors: ['#fde047', '#fff'], speed: 150, life: .3, g: 100 });
            fx.text(180 + s * 50, 200, daze > 0 ? `-${dmg}!` : `-${dmg}`, { color: daze > 0 ? '#fb923c' : '#fde047', size: daze > 0 ? 20 : 15 });
            if (daze <= 0 && state === 'idle' && Math.random() < .3) { state = 'block'; stT = .5; }
            checkKO();
        } else {
            sfx('thud'); fx.text(180, 210, 'BLOCKED', { color: '#94a3b8', size: 14 });
        }
    }

    function uppercut() {
        if (punchT > 0) return;
        punchT = .45; punchSide = 0;
        if (daze > 0) {
            const dmg = 16 + fi * 2;
            fhp -= dmg; hits++; daze = Math.max(.4, daze - 1.2);
            sfx('punch'); buzz(40); fx.shake(6, .25); fx.flash('#fde047', .15);
            fx.burst(180, 215, { n: 16, colors: ['#fb923c', '#fde047', '#fff'], speed: 220, life: .5, g: 140 });
            fx.text(180, 180, `UPPERCUT -${dmg}!`, { color: '#fb923c', size: 22 });
            checkKO();
        } else {
            sfx('whoosh'); fx.text(180, 220, 'WHIFF!', { color: '#94a3b8', size: 15 });
            if (state === 'idle') { state = 'windup'; stT = foe.tel * .6; side = U.pick([-1, 1]); comboLeft = 0; }
        }
    }

    function checkKO() {
        if (fhp > 0) return;
        fhp = 0; kos++; state = 'ko'; stT = 1.8; daze = 0;
        banner('KNOCKOUT!', '#86efac', foe.name + ' is down!');
        sfx('cheer'); fx.flash('#4ade80', .25); fx.shake(5, .3);
    }

    // ---------- foe AI ----------
    function update(dt) {
        dodgeT = Math.max(0, dodgeT - dt); if (dodgeT <= 0) dodge = 0;
        punchT = Math.max(0, punchT - dt);
        stun = Math.max(0, stun - dt);
        swayT += dt;
        if (daze > 0) {
            daze -= dt;
            if (daze <= 0 && state !== 'ko') { state = 'idle'; stT = foe.rest; fx.text(180, 230, 'HE RECOVERED', { color: '#cbd5e1', size: 13 }); }
            return;
        }
        stT -= dt;
        if (state === 'ko') {
            if (stT <= 0) {
                fi++;
                if (fi >= FOES.length) finish(true); else newFoe();
            }
            return;
        }
        if (stT > 0) return;
        if (state === 'idle') {
            state = 'windup'; stT = foe.tel; side = U.pick([-1, 1]);
            comboLeft = Math.random() < .4 ? foe.combo - 1 : 0;
            sfx('whoosh');
        } else if (state === 'block') {
            state = 'idle'; stT = U.rand(.4, .9);
        } else if (state === 'windup') {
            state = 'swing'; stT = .3;
            const dodged = dodge !== 0 && dodge !== side;
            if (dodged) {
                fx.text(180 - side * 60, 300, 'DODGED!', { color: '#4ade80', size: 18 });
                sfx('whoosh'); buzz(10);
                daze = dazeWindow; state = 'daze';
                fx.text(180, 170, 'HE\'S DAZED — SWIPE UP!', { color: '#fb923c', size: 15, life: 1.2 });
                sfx('bounce');
            } else {
                hp -= foe.dmg; taken++;
                stun = .5;
                sfx('punch'); buzz(60); fx.shake(7, .3); fx.flash('#ef4444', .2);
                fx.text(180, 320, `-${foe.dmg}`, { color: '#f87171', size: 24 });
                if (hp <= 0) { finish(false); return; }
            }
        } else if (state === 'swing') {
            if (comboLeft > 0 && daze <= 0) { comboLeft--; state = 'windup'; stT = foe.tel * .75; side = -side; sfx('whoosh'); }
            else { state = 'idle'; stT = foe.rest + U.rand(0, .5); }
        }
    }

    function finish(win) {
        end({
            win, head: win ? 'CHAMPION OF THE DMV!' : 'TKO — YOU\'RE DOWN',
            lines: [`${kos}/${FOES.length} knockouts`, `${hits} punches landed · ${taken} eaten`, win ? 'Dodge, daze, uppercut. Textbook.' : 'Watch his glove glow, then swipe away from it'],
            stars: Math.max(1, kos * 2 + (win ? 3 : 0) + (taken <= 4 && win ? 1 : 0))
        });
    }

    // ---------- drawing ----------
    function drawArena(c) {
        c.fillStyle = U.vgrad(c, 0, H, [[0, '#0b0e1a'], [1, '#1a1030']]); c.fillRect(0, 0, W, H);
        U.crowd(c, 0, 20, W, 120, { rows: 4, gap: 15, t: env.time(), amp: daze > 0 ? .6 : .1, dim: .3, seed: 3 });
        // spotlight
        const g = c.createRadialGradient(180, 240, 30, 180, 240, 260);
        g.addColorStop(0, 'rgba(255,240,200,.16)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        // ring floor
        c.beginPath(); c.moveTo(20, 390); c.lineTo(340, 390); c.lineTo(390, 560); c.lineTo(-30, 560); c.closePath();
        c.fillStyle = '#20457a'; c.fill();
        c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(0, 390, W, 4);
        U.text(c, 'DMV', 180, 480, { size: 44, color: 'rgba(255,255,255,.08)' });
        // ropes behind foe
        for (let i = 0; i < 3; i++) {
            const y = 180 + i * 34;
            c.strokeStyle = ['#ef4444', '#f8fafc', '#3b82f6'][i]; c.lineWidth = 4;
            c.beginPath(); c.moveTo(0, y + 10); c.quadraticCurveTo(180, y, 360, y + 10); c.stroke();
        }
        c.fillStyle = '#334155'; c.fillRect(6, 160, 10, 130); c.fillRect(344, 160, 10, 130);
    }

    function drawFoe(c) {
        const t = env.time();
        let fx0 = 180 + Math.sin(swayT * 1.7) * 10, fy = 268, rot = 0, scale = 1;
        if (state === 'windup') { fx0 += side * (14 + (1 - Math.max(0, stT) / foe.tel) * 22); rot = side * .1; }
        if (state === 'swing') { fx0 += side * 10; fy += 26; scale = 1.12; rot = side * .18; }
        if (daze > 0) { rot = Math.sin(t * 9) * .12; fy += 10; }
        if (state === 'ko') { fy += 90 * Math.min(1, (1.8 - stT) / .6); rot = .5; }
        c.save(); c.translate(fx0, fy); c.rotate(rot); c.scale(scale, scale);
        // body
        U.shadow(c, 0, 118, 46, 12, .4);
        U.rr(c, -34, 10, 68, 80, 18); c.fillStyle = foe.skin; c.fill();
        c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(-34, 50, 68, 8);
        U.rr(c, -36, 58, 72, 34, 10); c.fillStyle = foe.trunks; c.fill();
        c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(-36, 58, 72, 5);
        // head
        c.fillStyle = foe.skin; c.beginPath(); c.arc(0, -16, 26, 0, 7); c.fill();
        c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(0, -26, 26, Math.PI, 0); c.fill();
        // face
        if (daze > 0) {
            c.strokeStyle = '#111'; c.lineWidth = 2.5;
            for (const ex of [-10, 10]) { c.beginPath(); c.moveTo(ex - 4, -22); c.lineTo(ex + 4, -14); c.moveTo(ex + 4, -22); c.lineTo(ex - 4, -14); c.stroke(); }
            c.beginPath(); c.arc(0, -4, 5, 0, 7); c.stroke();
            for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; U.text(c, '★', Math.cos(a) * 34, -46 + Math.sin(a) * 8, { size: 14, color: '#fde047' }); }
        } else if (state === 'ko') {
            c.strokeStyle = '#111'; c.lineWidth = 2.5;
            for (const ex of [-10, 10]) { c.beginPath(); c.moveTo(ex - 4, -18); c.lineTo(ex + 4, -18); c.stroke(); }
        } else {
            c.fillStyle = '#111'; c.beginPath(); c.arc(-9, -20, 3.4, 0, 7); c.arc(9, -20, 3.4, 0, 7); c.fill();
            c.fillStyle = state === 'windup' ? '#7f1d1d' : '#3f1d1d'; U.rr(c, -9, -6, 18, 5, 2); c.fill();
        }
        // gloves
        const wind = state === 'windup' ? (1 - Math.max(0, stT) / foe.tel) : 0;
        for (const s of [-1, 1]) {
            let gx = s * 42, gy = 30;
            if (state === 'windup' && s === side) { gx = s * (52 + wind * 16); gy = 8 - wind * 26; }
            if (state === 'swing' && s === side) { gx = s * 18; gy = 92; }
            if (daze > 0 || state === 'ko') { gy = 66; gx = s * 30; }
            c.fillStyle = '#b91c1c'; c.beginPath(); c.arc(gx, gy, state === 'swing' && s === side ? 24 : 17, 0, 7); c.fill();
            c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.arc(gx - 4, gy - 5, 5, 0, 7); c.fill();
            if (state === 'windup' && s === side) {
                U.glow(c, gx, gy, 26, 'rgba(253,224,71,.5)');
                c.strokeStyle = `rgba(253,224,71,${.5 + .5 * Math.sin(t * 12)})`; c.lineWidth = 3;
                c.beginPath(); c.arc(gx, gy, 22, 0, 7); c.stroke();
            }
        }
        c.restore();
        if (state === 'windup') {
            const warnX = 180 + side * 95;
            U.text(c, side < 0 ? '◀ HIS LEFT' : 'HIS RIGHT ▶', warnX, 388, { size: 13, color: '#fde047', alpha: .6 + .4 * Math.sin(t * 10), stroke: 'rgba(0,0,0,.8)', lw: 3 });
            U.text(c, 'SWIPE AWAY!', 180, 412, { size: 12, color: '#fca5a5', stroke: 'rgba(0,0,0,.8)', lw: 3 });
        }
    }

    function drawPlayerGloves(c) {
        const lean = dodge * 70;
        for (const s of [-1, 1]) {
            let gx = 180 + s * 95 + lean, gy = 520;
            if (punchT > 0 && (punchSide === s || punchSide === 0)) {
                const u = 1 - punchT / (punchSide === 0 ? .45 : .28);
                const arc = Math.sin(u * Math.PI);
                gy = 520 - arc * (punchSide === 0 ? 250 : 200);
                gx = U.lerp(gx, 180 + s * 24, arc);
            }
            if (stun > 0) { gy += 20; gx += Math.sin(env.time() * 20) * 4; }
            c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.arc(gx + 4, gy + 6, 34, 0, 7); c.fill();
            const grd = c.createRadialGradient(gx - 10, gy - 12, 6, gx, gy, 38);
            grd.addColorStop(0, '#f87171'); grd.addColorStop(1, '#7f1d1d');
            c.fillStyle = grd; c.beginPath(); c.arc(gx, gy, 34, 0, 7); c.fill();
            c.fillStyle = '#fecaca'; U.rr(c, gx - 12, gy + 16, 24, 14, 6); c.fill();
        }
        if (stun > 0) { c.fillStyle = `rgba(239,68,68,${stun * .4})`; c.fillRect(0, 0, W, H); }
    }

    function drawHud(c) {
        // player HP
        U.rr(c, 12, 10, 160, 40, 10); c.fillStyle = 'rgba(0,0,0,.65)'; c.fill();
        U.text(c, 'YOU', 34, 24, { size: 11, color: '#7dd3fc' });
        U.rr(c, 20, 32, 144, 10, 5); c.fillStyle = '#374151'; c.fill();
        U.rr(c, 20, 32, 144 * U.clamp(hp / MAXHP, 0, 1), 10, 5); c.fillStyle = hp > 35 ? '#4ade80' : '#ef4444'; c.fill();
        // foe HP
        U.rr(c, 188, 10, 160, 40, 10); c.fillStyle = 'rgba(0,0,0,.65)'; c.fill();
        U.text(c, foe.name, 268, 24, { size: 10, color: '#fca5a5' });
        U.rr(c, 196, 32, 144, 10, 5); c.fillStyle = '#374151'; c.fill();
        U.rr(c, 196, 32, 144 * U.clamp(fhp / foe.hp, 0, 1), 10, 5); c.fillStyle = '#f59e0b'; c.fill();
        if (daze > 0) {
            U.rr(c, 110, 58, 140, 8, 4); c.fillStyle = 'rgba(0,0,0,.5)'; c.fill();
            U.rr(c, 110, 58, 140 * (daze / DAZE), 8, 4); c.fillStyle = '#fb923c'; c.fill();
            U.text(c, 'SWIPE UP — UPPERCUT!', 180, 84, { size: 14, color: '#fb923c', alpha: .7 + .3 * Math.sin(env.time() * 8), stroke: 'rgba(0,0,0,.8)', lw: 3 });
        }
        if (state === 'idle' && fi === 0 && hits < 3) U.text(c, 'TAP TO JAB · SWIPE ◀▶ TO DODGE', 180, 440, { size: 12, color: '#fff', alpha: .7, stroke: 'rgba(0,0,0,.8)', lw: 3 });
    }

    function draw(c) {
        c.save();
        if (dodge !== 0) { c.translate(dodge * -26, 6); c.rotate(dodge * -.03); }
        drawArena(c);
        drawFoe(c);
        c.restore();
        drawPlayerGloves(c);
        drawHud(c);
    }

    return {
        title: '🥊 Ring Kings',
        goal: 'Knock out all 3 opponents',
        intro: { head: 'RING KINGS', lines: ['Watch the glowing glove, swipe AWAY to dodge', 'Dodge = dazed foe · swipe UP to uppercut', 'Tap to jab · beat all 3 champs'] },
        init: start, start, update, draw, down, move() { }, up, idle() { },
        _state: () => ({ fi, hp, fhp, state, daze, stun, kos, foe, side, stT, dazeWindow }),
        _set: o => { Object.assign({ }, o); if (o.daze !== undefined) daze = o.daze; }
    };
});
