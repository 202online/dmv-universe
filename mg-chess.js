'use strict';

// Checkmate Lounge: full chess vs the house AI. Tap a piece, tap a highlighted square. Castling, en passant & promotion included.
Minigames.register('chess', env => {
    const { W, H, U, sfx, buzz, fx, banner, end } = env;
    const SQ = 42, BX = (360 - SQ * 8) / 2, BY = 92;
    const GLYPH = { wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙', bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟' };
    const VAL = { P: 100, N: 310, B: 330, R: 500, Q: 900, K: 0 };

    let bd, turn, sel, legal, castle, ep, thinking, thinkT, lastMove, over, moveN, capsW, capsB, checkFlash, msg, msgT;

    function start() {
        bd = [];
        const back = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
        for (let i = 0; i < 64; i++) bd.push(null);
        for (let f = 0; f < 8; f++) {
            bd[f] = 'b' + back[f]; bd[8 + f] = 'bP';
            bd[48 + f] = 'wP'; bd[56 + f] = 'w' + back[f];
        }
        turn = 'w'; sel = -1; legal = []; thinking = false; thinkT = 0;
        castle = { wK: true, wQ: true, bK: true, bQ: true }; ep = -1;
        lastMove = null; over = false; moveN = 1; capsW = []; capsB = []; checkFlash = 0; msg = ''; msgT = 0;
    }

    // ---------- move generation ----------
    const fil = i => i % 8, rnk = i => (i / 8) | 0;
    const on = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;

    function pseudo(b, i, cas, epSq) {
        const pc = b[i]; if (!pc) return [];
        const col = pc[0], k = pc[1], f = fil(i), r = rnk(i), out = [];
        const add = (tf, tr, flags) => { if (on(tf, tr)) { const t = tf + tr * 8; if (!b[t] || b[t][0] !== col) out.push({ from: i, to: t, ...flags }); return !b[t]; } return false; };
        if (k === 'P') {
            const dir = col === 'w' ? -1 : 1, home = col === 'w' ? 6 : 1;
            if (!b[f + (r + dir) * 8] && on(f, r + dir)) {
                out.push({ from: i, to: f + (r + dir) * 8 });
                if (r === home && !b[f + (r + 2 * dir) * 8]) out.push({ from: i, to: f + (r + 2 * dir) * 8, dbl: true });
            }
            for (const df of [-1, 1]) {
                const tf = f + df, tr = r + dir;
                if (!on(tf, tr)) continue;
                const t = tf + tr * 8;
                if (b[t] && b[t][0] !== col) out.push({ from: i, to: t });
                else if (t === epSq) out.push({ from: i, to: t, ep: true });
            }
        } else if (k === 'N') {
            for (const [df, dr] of [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]) add(f + df, r + dr);
        } else if (k === 'K') {
            for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) if (df || dr) add(f + df, r + dr);
            const hr = col === 'w' ? 7 : 0;
            if (cas[col + 'K'] && !b[hr * 8 + 5] && !b[hr * 8 + 6]) out.push({ from: i, to: hr * 8 + 6, castle: 'K' });
            if (cas[col + 'Q'] && !b[hr * 8 + 1] && !b[hr * 8 + 2] && !b[hr * 8 + 3]) out.push({ from: i, to: hr * 8 + 2, castle: 'Q' });
        } else {
            const dirs = k === 'R' ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : k === 'B' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
            for (const [df, dr] of dirs) { let s = 1; while (add(f + df * s, r + dr * s)) s++; }
        }
        return out;
    }

    function attacked(b, sq, byCol) {
        for (let i = 0; i < 64; i++) {
            if (!b[i] || b[i][0] !== byCol) continue;
            for (const m of pseudo(b, i, { wK: false, wQ: false, bK: false, bQ: false }, -1)) {
                if (m.to === sq && !(b[i][1] === 'P' && fil(m.from) === fil(m.to))) return true;
            }
        }
        return false;
    }

    function apply(b, m, cas, epSq) {
        const nb = b.slice(), pc = nb[m.from], col = pc[0];
        const nc = { ...cas };
        let nep = -1, cap = nb[m.to];
        nb[m.to] = pc; nb[m.from] = null;
        if (m.ep) { const capSq = m.to + (col === 'w' ? 8 : -8); cap = nb[capSq]; nb[capSq] = null; }
        if (m.dbl) nep = m.from + (col === 'w' ? -8 : 8);
        if (m.castle) {
            const hr = col === 'w' ? 7 : 0;
            if (m.castle === 'K') { nb[hr * 8 + 5] = nb[hr * 8 + 7]; nb[hr * 8 + 7] = null; }
            else { nb[hr * 8 + 3] = nb[hr * 8]; nb[hr * 8] = null; }
        }
        if (pc[1] === 'K') { nc[col + 'K'] = false; nc[col + 'Q'] = false; }
        if (pc[1] === 'R') { if (m.from === (col === 'w' ? 63 : 7)) nc[col + 'K'] = false; if (m.from === (col === 'w' ? 56 : 0)) nc[col + 'Q'] = false; }
        if (cap === 'wR') { if (m.to === 63) nc.wK = false; if (m.to === 56) nc.wQ = false; }
        if (cap === 'bR') { if (m.to === 7) nc.bK = false; if (m.to === 0) nc.bQ = false; }
        if (pc[1] === 'P' && (rnk(m.to) === 0 || rnk(m.to) === 7)) nb[m.to] = col + 'Q';
        return { b: nb, cas: nc, ep: nep, cap };
    }

    const kingSq = (b, col) => b.indexOf(col + 'K');
    const inCheck = (b, col) => attacked(b, kingSq(b, col), col === 'w' ? 'b' : 'w');

    function legalMoves(b, col, cas, epSq) {
        const out = [];
        for (let i = 0; i < 64; i++) {
            if (!b[i] || b[i][0] !== col) continue;
            for (const m of pseudo(b, i, cas, epSq)) {
                if (m.castle) {
                    const hr = col === 'w' ? 7 : 0, mid = m.castle === 'K' ? hr * 8 + 5 : hr * 8 + 3;
                    const foe = col === 'w' ? 'b' : 'w';
                    if (attacked(b, hr * 8 + 4, foe) || attacked(b, mid, foe) || attacked(b, m.to, foe)) continue;
                }
                const r = apply(b, m, cas, epSq);
                if (!inCheck(r.b, col)) out.push(m);
            }
        }
        return out;
    }

    // ---------- AI ----------
    function evalB(b) {
        let s = 0;
        for (let i = 0; i < 64; i++) {
            if (!b[i]) continue;
            const v = VAL[b[i][1]] + (b[i][1] === 'P' ? (b[i][0] === 'b' ? rnk(i) : 7 - rnk(i)) * 6 : 0)
                + ((fil(i) > 1 && fil(i) < 6 && rnk(i) > 1 && rnk(i) < 6) ? 8 : 0);
            s += b[i][0] === 'b' ? v : -v;
        }
        return s;
    }

    function aiMove() {
        const ms = legalMoves(bd, 'b', castle, ep);
        if (!ms.length) return null;
        let best = null, bestS = -1e9;
        for (const m of ms) {
            const r1 = apply(bd, m, castle, ep);
            // white's best reply (greedy material)
            const replies = legalMoves(r1.b, 'w', r1.cas, r1.ep);
            let worst = 1e9;
            if (!replies.length) worst = inCheck(r1.b, 'w') ? 1e8 : 0;
            for (const w of replies) {
                const r2 = apply(r1.b, w, r1.cas, r1.ep);
                worst = Math.min(worst, evalB(r2.b));
            }
            const s = worst + Math.random() * 12;
            if (s > bestS) { bestS = s; best = m; }
        }
        return best;
    }

    // ---------- play flow ----------
    function doMove(m, col) {
        const pc = bd[m.from];
        const r = apply(bd, m, castle, ep);
        if (r.cap) {
            (col === 'w' ? capsW : capsB).push(r.cap);
            sfx('punch'); buzz(14); fx.shake(2, .1);
            const [x, y] = sqXY(m.to);
            fx.burst(x + SQ / 2, y + SQ / 2, { n: 9, colors: ['#fde047', '#fff'], speed: 120, life: .35, g: 90 });
        } else sfx('tap');
        if (m.castle) { msg = col === 'w' ? 'You castled!' : 'CPU castles'; msgT = 1.4; }
        if (pc[1] === 'P' && (rnk(m.to) === 0 || rnk(m.to) === 7)) { msg = 'Pawn promoted to QUEEN!'; msgT = 1.6; sfx('cheer'); }
        bd = r.b; castle = r.cas; ep = r.ep; lastMove = m;
        turn = col === 'w' ? 'b' : 'w';
        if (col === 'b') moveN++;
        const foe = turn;
        const moves = legalMoves(bd, foe, castle, ep);
        const chk = inCheck(bd, foe);
        if (!moves.length) {
            over = true;
            if (chk) finish(foe === 'b', 'CHECKMATE');
            else finish(null, 'STALEMATE');
            return;
        }
        if (chk) { checkFlash = 1; sfx('whoosh'); banner('CHECK!', foe === 'w' ? '#fca5a5' : '#86efac'); }
        if (turn === 'b') { thinking = true; thinkT = U.rand(.5, .9); }
    }

    function finish(win, why) {
        const mat = capsW.reduce((a, p) => a + VAL[p[1]], 0);
        if (win === null) end({ win: false, head: 'STALEMATE', lines: ['A draw at the lounge', `${capsW.length} pieces captured`, 'Press the attack earlier next time'], stars: Math.max(1, 2 + Math.floor(mat / 900)) });
        else if (win) end({ win: true, head: 'CHECKMATE!', lines: ['You beat the house AI', `${moveN} moves · ${capsW.length} captures`, 'Lounge grandmaster status'], stars: Math.max(1, 6 + Math.min(3, Math.floor(mat / 600))) });
        else end({ win: false, head: 'CHECKMATED', lines: [`The house wins in ${moveN} moves`, 'Guard your king — castle early', 'Trade when you\'re ahead'], stars: Math.max(1, 1 + Math.floor(mat / 900)) });
    }

    function down(p) {
        if (over || turn !== 'w' || thinking) return;
        const f = Math.floor((p.x - BX) / SQ), r = Math.floor((p.y - BY) / SQ);
        if (!on(f, r)) { sel = -1; legal = []; return; }
        const i = f + r * 8;
        const m = legal.find(m => m.to === i);
        if (m) { sel = -1; legal = []; doMove(m, 'w'); return; }
        if (bd[i] && bd[i][0] === 'w') {
            sel = i; legal = legalMoves(bd, 'w', castle, ep).filter(m => m.from === i);
            sfx('bounce'); buzz(6);
        } else { sel = -1; legal = []; }
    }

    function update(dt) {
        checkFlash = Math.max(0, checkFlash - dt); msgT = Math.max(0, msgT - dt);
        if (thinking && !over) {
            thinkT -= dt;
            if (thinkT <= 0) {
                thinking = false;
                const m = aiMove();
                if (m) doMove(m, 'b');
            }
        }
    }

    // ---------- drawing ----------
    const sqXY = i => [BX + fil(i) * SQ, BY + rnk(i) * SQ];

    function draw(c) {
        c.fillStyle = U.vgrad(c, 0, H, [[0, '#17101f'], [1, '#241433']]); c.fillRect(0, 0, W, H);
        for (let i = 0; i < 5; i++) { U.glow(c, 40 + i * 70, 36, 22, 'rgba(232,121,249,.12)'); }
        // frame
        U.rr(c, BX - 12, BY - 12, SQ * 8 + 24, SQ * 8 + 24, 10); c.fillStyle = '#5b3418'; c.fill();
        c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(BX - 12, BY - 12, SQ * 8 + 24, 5);
        // squares
        for (let i = 0; i < 64; i++) {
            const [x, y] = sqXY(i), light = (fil(i) + rnk(i)) % 2 === 0;
            c.fillStyle = light ? '#e8d5b0' : '#8a5a36';
            c.fillRect(x, y, SQ, SQ);
            if (lastMove && (lastMove.from === i || lastMove.to === i)) { c.fillStyle = 'rgba(253,224,71,.3)'; c.fillRect(x, y, SQ, SQ); }
            if (sel === i) { c.fillStyle = 'rgba(74,222,128,.4)'; c.fillRect(x, y, SQ, SQ); }
        }
        // check highlight
        if (checkFlash > 0) {
            const k = kingSq(bd, turn);
            if (k >= 0) { const [x, y] = sqXY(k); c.fillStyle = `rgba(239,68,68,${.25 + .3 * Math.sin(env.time() * 10)})`; c.fillRect(x, y, SQ, SQ); }
        }
        // legal dots
        for (const m of legal) {
            const [x, y] = sqXY(m.to);
            if (bd[m.to] || m.ep) { c.strokeStyle = 'rgba(239,68,68,.8)'; c.lineWidth = 3; c.strokeRect(x + 2, y + 2, SQ - 4, SQ - 4); }
            else { c.fillStyle = 'rgba(34,197,94,.55)'; c.beginPath(); c.arc(x + SQ / 2, y + SQ / 2, 6.5, 0, 7); c.fill(); }
        }
        // coordinates
        c.textAlign = 'center';
        for (let f = 0; f < 8; f++) U.text(c, 'abcdefgh'[f], BX + f * SQ + SQ / 2, BY + SQ * 8 + 7, { size: 8, color: 'rgba(255,255,255,.5)' });
        for (let r = 0; r < 8; r++) U.text(c, `${8 - r}`, BX - 7, BY + r * SQ + SQ / 2, { size: 8, color: 'rgba(255,255,255,.5)' });
        // pieces
        for (let i = 0; i < 64; i++) {
            if (!bd[i]) continue;
            const [x, y] = sqXY(i), pc = bd[i];
            c.font = `${SQ * .82}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
            c.fillStyle = 'rgba(0,0,0,.35)';
            c.fillText(GLYPH[pc], x + SQ / 2 + 1.5, y + SQ / 2 + 4.5);
            c.fillStyle = pc[0] === 'w' ? '#fafafa' : '#1a1a22';
            c.fillText(GLYPH[pc], x + SQ / 2, y + SQ / 2 + 3);
            if (pc[0] === 'b') { c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1; c.strokeText(GLYPH[pc], x + SQ / 2, y + SQ / 2 + 3); }
        }
        drawHud(c);
    }

    function drawHud(c) {
        U.rr(c, 8, 8, 344, 38, 10); c.fillStyle = 'rgba(0,0,0,.65)'; c.fill();
        U.text(c, '♟️ CHECKMATE LOUNGE', 95, 20, { size: 11, color: '#e879f9' });
        U.text(c, `MOVE ${moveN}`, 300, 20, { size: 11, color: '#fde047' });
        const st = over ? 'GAME OVER' : thinking || turn === 'b' ? 'HOUSE AI THINKING…' : inCheck(bd, 'w') ? 'YOU\'RE IN CHECK!' : 'YOUR MOVE (WHITE)';
        U.text(c, st, 180, 37, { size: 12, color: thinking || turn === 'b' ? '#f0abfc' : inCheck(bd, 'w') && !over ? '#f87171' : '#7dd3fc' });
        // captured trays
        c.font = '15px serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
        c.fillStyle = '#fafafa'; capsB.slice(0, 12).forEach((p, i) => c.fillText(GLYPH[p], 14 + i * 15, BY + SQ * 8 + 30));
        c.fillStyle = '#cbd5e1'; capsW.slice(0, 12).forEach((p, i) => c.fillText(GLYPH[p], 14 + i * 15, BY + SQ * 8 + 52));
        U.text(c, 'LOST:', 330, BY + SQ * 8 + 30, { size: 9, color: 'rgba(255,255,255,.45)' });
        U.text(c, 'TAKEN:', 330, BY + SQ * 8 + 52, { size: 9, color: 'rgba(255,255,255,.45)' });
        if (msgT > 0) U.text(c, msg, 180, 70, { size: 13, color: '#fde047', alpha: Math.min(1, msgT), stroke: 'rgba(0,0,0,.7)', lw: 3 });
        if (moveN === 1 && turn === 'w' && sel < 0) U.text(c, 'TAP A PIECE, THEN A GREEN SQUARE', 180, H - 14, { size: 11, color: '#fff', alpha: .55 + .35 * Math.sin(env.time() * 4), stroke: 'rgba(0,0,0,.7)', lw: 3 });
    }

    return {
        title: '♟️ Checkmate Lounge',
        intro: { head: 'CHECKMATE LOUNGE', lines: ['Full chess vs the house AI', 'Tap a piece, then a highlighted square', 'Castling, en passant & auto-queen included'] },
        init: start, start, update, draw, down, move() { }, up() { }, idle() { },
        _state: () => ({ bd, turn, over, moveN, capsW, capsB }),
        _move: (from, to) => { const m = legalMoves(bd, 'w', castle, ep).find(m => m.from === from && m.to === to); if (m) doMove(m, 'w'); return !!m; }
    };
});
