'use strict';

// Food-service arcades share a counter scene, but each has its own preparation mechanic.
(() => {
    function scene(c, env, title, accent, stats, customer, patience) {
        const { U, W, H } = env;
        c.fillStyle = U.vgrad(c, 0, H, [[0, '#111827'], [.6, '#334155'], [1, '#0f172a']]);
        c.fillRect(0, 0, W, H);
        for (let y = 70; y < 300; y += 30) {
            c.strokeStyle = '#475569'; c.lineWidth = 1;
            c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
            for (let x = (y % 60 ? 0 : 30); x < W; x += 60) c.strokeRect(x, y, 60, 30);
        }
        U.rr(c, 12, 8, 336, 50, 12); c.fillStyle = '#020617'; c.fill();
        U.text(c, title, 180, 25, { size: 18, color: accent });
        U.text(c, stats, 180, 45, { size: 12, color: '#e2e8f0' });
        U.crowd(c, 25, 82, 310, 50, { rows: 1, gap: 48, t: env.time(), dim: .1 });
        U.rr(c, 16, 144, 328, 132, 10); c.fillStyle = '#fff7ed'; c.fill();
        U.text(c, customer, 180, 162, { size: 15, color: '#78350f' });
        if (patience !== undefined) {
            c.fillStyle = '#475569'; c.fillRect(24, 133, 312, 5);
            c.fillStyle = patience < .25 ? '#f87171' : '#4ade80';
            c.fillRect(24, 133, 312 * U.clamp(patience, 0, 1), 5);
        }
        c.fillStyle = '#a16207'; c.fillRect(0, 282, W, 12);
        c.fillStyle = U.vgrad(c, 294, H, [[0, '#713f12'], [1, '#292524']]); c.fillRect(0, 294, W, H - 294);
    }
    function button(c, U, x, y, w, h, label, active = false, enabled = true) {
        U.rr(c, x, y, w, h, 10);
        c.fillStyle = !enabled ? '#475569' : active ? '#047857' : '#172554'; c.fill();
        c.strokeStyle = active ? '#6ee7b7' : '#94a3b8'; c.lineWidth = 2; c.stroke();
        U.text(c, label, x + w / 2, y + h / 2, { size: 13, color: enabled ? '#f8fafc' : '#cbd5e1' });
    }
    function feedback(env, text, good) {
        env.sfx(good ? 'coin' : 'thud'); env.buzz(good ? 15 : 30);
        env.fx.text(180, 300, text, { size: 20, color: good ? '#86efac' : '#fca5a5' });
        if (good) env.fx.burst(180, 280, { n: 16, colors: ['#fde047', '#86efac', '#fff'], speed: 110 });
    }
    const inside = (p, x, y, w, h) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
    function taps(action) {
        return {
            down(p) { p.foodTap = true; },
            up(p) { if (p.foodTap && !p.cancelled && p.len < 24) action(p); }
        };
    }
    function sandwich(c, U, x, y, scale, layers) {
        c.save(); c.translate(x, y); c.scale(scale, scale);
        c.fillStyle = '#e5ddd0'; c.beginPath(); c.ellipse(0, 23, 118, 24, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = U.vgrad(c, 5, 28, [[0, '#f3bd63'], [1, '#ac612c']]);
        U.rr(c, -104, 0, 208, 29, 14); c.fill();
        layers.forEach((i, n) => {
            const yy = -3 - n * 4;
            c.fillStyle = ingredients[i].color;
            c.beginPath(); c.moveTo(-98, yy);
            for (let xx = -98; xx <= 98; xx += 12) c.lineTo(xx, yy + Math.sin(xx + n) * 3);
            c.lineTo(98, yy + 7); c.lineTo(-98, yy + 7); c.closePath(); c.fill();
        });
        const top = -11 - layers.length * 4;
        c.fillStyle = U.vgrad(c, top - 27, top + 8, [[0, '#ffe0a2'], [.55, '#eab45f'], [1, '#ba702d']]);
        c.beginPath(); c.moveTo(-104, top + 13); c.bezierCurveTo(-106, top - 23, -52, top - 31, 0, top - 29);
        c.bezierCurveTo(53, top - 31, 106, top - 23, 104, top + 13); c.closePath(); c.fill();
        c.strokeStyle = '#fff0bd'; c.lineWidth = 2.5;
        for (let i = 0; i < 15; i++) {
            const xx = -81 + (i % 8) * 23, yy = top - 9 + Math.floor(i / 8) * 11;
            c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + 3, yy - 3); c.stroke();
        }
        c.restore();
    }

    function wing(c, U, x, y, rotation, sauce, cooked) {
        c.save(); c.translate(x, y); c.rotate(rotation);
        U.shadow(c, 2, 13, 23, 7, .22);
        c.fillStyle = U.vgrad(c, -15, 16, [[0, sauce ? (sauce === '#a51f30' ? '#d34a50' : '#a66a3d') : cooked ? '#ffd483' : '#f1ccac'], [.5, sauce || '#d88a30'], [1, sauce ? (sauce === '#a51f30' ? '#691522' : '#54270e') : '#9d4c20']]);
        c.beginPath(); c.moveTo(-23, 2); c.bezierCurveTo(-24, -12, -9, -18, 3, -9);
        c.bezierCurveTo(12, -17, 26, -8, 24, 4); c.bezierCurveTo(20, 20, 7, 16, 0, 12);
        c.bezierCurveTo(-11, 19, -25, 16, -23, 2); c.fill();
        c.strokeStyle = sauce ? (sauce === '#a51f30' ? '#ef9394' : '#dca578') : '#f7d391'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(-15, -3); c.quadraticCurveTo(-6, -9, 0, -2); c.stroke();
        c.fillStyle = '#8b4526';
        for (let i = 0; i < 7; i++) {
            c.beginPath(); c.arc(-15 + i * 5, Math.sin(i * 3) * 7 + 4, .9, 0, Math.PI * 2); c.fill();
        }
        c.restore();
    }

    Minigames.register('lemonade', env => {
        const { U, end } = env, rank = U.challenge(env.level);
        const target = 6 + Math.floor(rank), profitGoal = 6 + Math.floor(rank), duration = 65 - rank * 1.5;
        const sweetSpot = .22 - rank * .009;
        let time, cash, expenses, revenue, stock, price, sold, lost, stage, fill, pour, customer, arrival, patience, finished;
        const waitLimit = () => 14 - rank * .55;
        const demand = () => ({ 2: 1.2, 3: 2, 4: 3.2 })[price];
        function start() {
            time = duration; cash = 12; expenses = 8; revenue = 0; stock = 6; price = 3;
            sold = 0; lost = 0; stage = 0; fill = 0; pour = null; customer = true; arrival = 0;
            patience = waitLimit(); finished = false;
        }
        start();
        function finish(win) {
            if (finished) return;
            finished = true; pour = null;
            end({ win, head: win ? 'FRESH SQUEEZED!' : 'STAND CLOSED', stars: 0,
                lines: [`${sold}/${target} cups sold`, `Sales $${revenue} - supplies $${expenses}`, `Profit $${revenue - expenses} / goal $${profitGoal}`] });
        }
        function tap(p) {
            if (finished) return;
            if (p.y >= 318 && p.y <= 360) {
                for (let i = 0; i < 3; i++) if (inside(p, 18 + i * 110, 318, 104, 42)) price = i + 2;
                return;
            }
            if (inside(p, 18, 482, 150, 52)) {
                if (cash < 6) { feedback(env, 'Need $6 stand cash', false); return; }
                cash -= 6; expenses += 6; stock += 5; feedback(env, '+5 supply kits', true); return;
            }
            if (inside(p, 192, 482, 150, 52)) {
                if (stage !== 3 || !customer) { feedback(env, stage !== 3 ? 'Prepare a full cup first' : 'Wait for a customer', false); return; }
                revenue += price; cash += price; sold++; stage = 0; fill = 0;
                customer = false; arrival = demand(); feedback(env, `SOLD +$${price}`, true);
                if (sold >= target && revenue - expenses >= profitGoal) finish(true);
                return;
            }
            if (!inside(p, 18, 386, 324, 76)) return;
            if (stage === 0) {
                if (!stock) { feedback(env, 'Restock supply kits', false); return; }
                stock--; stage = 1; env.sfx('splash');
            } else if (stage === 1) { stage = 2; fill = 0; env.sfx('whoosh'); }
        }
        function down(p) {
            if (!finished && stage === 2 && pour === null && inside(p, 18, 386, 324, 76)) {
                pour = p.id; p.pouring = true; env.sfx('splash');
            } else p.foodTap = true;
        }
        function up(p) {
            if (p.pouring && pour === p.id) {
                pour = null;
                if (p.cancelled) { fill = 0; return; }
                if (Math.abs(fill - .7) <= sweetSpot) { stage = 3; feedback(env, 'PERFECT POUR', true); }
                else { stage = 0; fill = 0; feedback(env, 'Missed the fill mark', false); }
            } else if (p.foodTap && !p.cancelled && p.len < 24) tap(p);
        }
        function update(dt) {
            if (finished) return;
            time = Math.max(0, time - dt);
            if (time <= 0) { finish(false); return; }
            if (pour !== null) fill = Math.min(1.2, fill + dt * .7);
            if (customer) {
                patience -= dt;
                if (patience <= 0) { lost++; customer = false; arrival = demand(); feedback(env, 'Customer left', false); }
            } else {
                arrival -= dt;
                if (arrival <= 0) { customer = true; patience = waitLimit(); }
            }
            if (!stock && stage === 0 && cash < 6) finish(false);
        }
        function draw(c) {
            scene(c, env, 'FRESH LEMONADE', '#fde047', `${Math.ceil(time)}s  |  ${sold}/${target} cups  |  Profit $${revenue - expenses}/$${profitGoal}`,
                customer ? `Customer wants lemonade: $${price}` : 'Next customer on the way', customer ? patience / waitLimit() : 1);
            const cx = 174, cy = 215;
            U.shadow(c, 80, 252, 43, 9, .18);
            c.fillStyle = U.vgrad(c, 202, 244, [[0, '#fff2a1'], [.5, '#eccd3b'], [1, '#d39424']]);
            c.beginPath(); c.ellipse(68, 229, 30, 20, -.3, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#39824c'; c.beginPath(); c.ellipse(91, 207, 13, 5, -.7, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#fff3b1'; c.beginPath(); c.arc(107, 238, 21, 0, Math.PI * 2); c.fill();
            c.strokeStyle = '#e5b832'; c.lineWidth = 2;
            c.beginPath(); c.arc(107, 238, 17, 0, Math.PI * 2); c.stroke();
            for (let i = 0; i < 8; i++) {
                const a = i * Math.PI / 4;
                c.beginPath(); c.moveTo(107, 238); c.lineTo(107 + Math.cos(a) * 17, 238 + Math.sin(a) * 17); c.stroke();
            }
            U.shadow(c, cx, 259, 29, 6, .2);
            c.fillStyle = '#c9e6ef77';
            c.beginPath(); c.moveTo(cx - 28, cy - 31); c.lineTo(cx + 28, cy - 31);
            c.lineTo(cx + 22, cy + 40); c.quadraticCurveTo(cx, cy + 48, cx - 22, cy + 40); c.closePath(); c.fill();
            c.save(); c.clip();
            const liquid = Math.min(1, fill), surface = cy + 39 - liquid * 65;
            c.fillStyle = U.vgrad(c, surface, cy + 42, [[0, '#fff28a'], [1, '#e8b52a']]);
            c.fillRect(cx - 28, surface, 56, cy + 44 - surface);
            if (liquid > .1) {
                c.fillStyle = '#ffffd1'; c.beginPath(); c.ellipse(cx, surface + 1, 26, 4, 0, 0, Math.PI * 2); c.fill();
                for (let i = 0; i < 3; i++) {
                    c.fillStyle = '#f1fbffbb'; U.rr(c, cx - 19 + i * 13, surface + 8 + i % 2 * 11, 12, 11, 3); c.fill();
                }
            }
            c.restore();
            c.strokeStyle = '#d7f0f9'; c.lineWidth = 2; c.beginPath(); c.ellipse(cx, cy - 31, 28, 5, 0, 0, Math.PI * 2); c.stroke();
            c.strokeStyle = '#ffffff88'; c.lineWidth = 3; c.beginPath(); c.moveTo(cx - 20, cy - 20); c.lineTo(cx - 17, cy + 30); c.stroke();
            c.strokeStyle = '#059669'; c.lineWidth = 3;
            c.beginPath(); c.moveTo(cx - 30, cy + 39 - 65 * .7); c.lineTo(cx + 30, cy + 39 - 65 * .7); c.stroke();
            U.text(c, `Cash $${cash}`, 280, 207, { color: '#14532d', size: 14 });
            U.text(c, `${stock} supply kits`, 280, 232, { color: '#78350f', size: 13 });
            for (let i = 0; i < 3; i++) button(c, U, 18 + i * 110, 318, 104, 42, `$${i + 2} / cup`, price === i + 2);
            U.text(c, 'Low price = faster arrivals', 180, 373, { size: 12, color: '#fde68a' });
            button(c, U, 18, 386, 324, 76, ['1. SQUEEZE LEMON', '2. MIX SUGAR + ICE', '3. HOLD TO POUR / RELEASE AT LINE', 'CUP READY - SERVE BELOW'][stage], stage === 3);
            button(c, U, 18, 482, 150, 52, 'Restock 5 kits: $6', false, cash >= 6);
            button(c, U, 192, 482, 150, 52, 'SERVE', stage === 3 && customer);
            U.text(c, 'Stand cash is separate from city stars', 180, 548, { size: 11, color: '#cbd5e1' });
        }
        return { title: 'Lemonade Stand', goal: `Sell ${target} cups and make $${profitGoal} profit`,
            intro: { head: 'LEMONADE STAND', lines: ['Tap squeeze, then mix your drink', 'Hold pour; release at the green line', 'Set price, serve, restock from sales', 'Stand cash is not your city stars'] },
            start, update, draw, down, up,
            _state: () => ({ time, cash, expenses, revenue, stock, price, sold, lost, stage, fill, customer, target, profitGoal, duration, sweetSpot, finished }) };
    });

    const ingredients = [
        { name: 'Turkey', color: '#f5c5a5' }, { name: 'Steak', color: '#92400e' }, { name: 'Cheese', color: '#fde047' },
        { name: 'Lettuce', color: '#4ade80' }, { name: 'Tomato', color: '#f87171' }, { name: 'Mayo', color: '#fff7ed' },
        { name: 'Mambo', color: '#ea580c' }, { name: 'Pickles', color: '#84cc16' }
    ];
    Minigames.register('subshop', env => {
        const { U, end } = env, rank = U.challenge(env.level);
        const target = 4 + Math.floor(rank / 2), limit = 18 - rank * .7, duration = 85;
        let time, served, mistakes, lost, order, selected, patience, cooldown, finished;
        function ticket() {
            const meat = U.pick([0, 1]), extras = [2, 3, 4, 5, 6, 7];
            for (let i = extras.length - 1; i > 0; i--) {
                const j = Math.floor(U.rand(0, i + 1)); [extras[i], extras[j]] = [extras[j], extras[i]];
            }
            order = [meat, ...extras.slice(0, 2 + Math.floor(rank / 3))].sort((a, b) => a - b);
            selected = new Set(); patience = limit; cooldown = 0;
        }
        function start() { time = duration; served = 0; mistakes = 0; lost = 0; finished = false; ticket(); }
        start();
        function finish(win) {
            if (finished) return;
            finished = true;
            end({ win, head: win ? 'SUB SHOP STAR!' : 'SHIFT COMPLETE', stars: 0,
                lines: [`${served}/${target} perfect orders`, `${mistakes} remakes | ${lost} customers left`, 'Match every ingredient on the ticket'] });
        }
        function tap(p) {
            if (finished || cooldown > 0) return;
            for (let i = 0; i < ingredients.length; i++) {
                if (inside(p, 16 + (i % 4) * 86, 328 + Math.floor(i / 4) * 64, 70, 54)) {
                    if (selected.has(i)) selected.delete(i); else selected.add(i);
                    env.sfx('tap'); return;
                }
            }
            if (inside(p, 18, 478, 140, 56)) { selected.clear(); return; }
            if (!inside(p, 176, 478, 166, 56)) return;
            const match = selected.size === order.length && order.every(i => selected.has(i));
            if (!match) { mistakes++; patience = Math.max(0, patience - 2); feedback(env, 'Check ticket - remake', false); return; }
            served++; cooldown = .7; feedback(env, 'ORDER UP!', true);
            if (served >= target) finish(true);
        }
        function update(dt) {
            if (finished) return;
            time = Math.max(0, time - dt);
            if (time <= 0) { finish(false); return; }
            if (cooldown > 0) { cooldown -= dt; if (cooldown <= 0) ticket(); return; }
            patience -= dt;
            if (patience <= 0) { lost++; feedback(env, 'Next customer', false); ticket(); }
        }
        function draw(c) {
            scene(c, env, 'THE NE SUB SHOP', '#86efac', `${Math.ceil(time)}s  |  ${served}/${target} orders  |  ${mistakes} remakes`,
                cooldown > 0 ? 'Perfect order - next customer!' : 'ORDER TICKET - MATCH ALL', patience / limit);
            const words = order.map(i => ingredients[i].name);
            U.text(c, words.slice(0, 3).join(' + '), 180, 190, { size: 15, color: '#78350f' });
            U.text(c, words.slice(3).join(' + ') || 'No extra toppings', 180, 214, { size: 14, color: '#78350f' });
            sandwich(c, U, 180, 283, .65, [...selected]);
            ingredients.forEach((item, i) => {
                const x = 16 + i % 4 * 86, y = 328 + Math.floor(i / 4) * 64;
                button(c, U, x, y, 70, 54, '', selected.has(i));
                c.fillStyle = item.color; c.strokeStyle = '#fff6'; c.lineWidth = 1;
                if (i === 4 || i === 7) {
                    for (let n = -1; n <= 1; n++) {
                        c.beginPath(); c.ellipse(x + 35 + n * 9, y + 15, 9, 7, n * .3, 0, Math.PI * 2); c.fill(); c.stroke();
                        c.fillStyle = i === 4 ? '#fbbf24' : '#d9f99d';
                        c.fillRect(x + 33 + n * 9, y + 12, 3, 4); c.fillStyle = item.color;
                    }
                } else {
                    U.rr(c, x + 17, y + 8, 36, 16, i < 2 ? 7 : 3); c.fill();
                    c.strokeStyle = '#fff8'; c.beginPath(); c.moveTo(x + 21, y + 12); c.lineTo(x + 48, y + 19); c.stroke();
                }
                U.text(c, item.name, x + 35, y + 40, { size: 12, color: '#f8fafc' });
            });
            U.text(c, 'Tap again to remove an ingredient', 180, 459, { size: 13, color: '#fde68a' });
            button(c, U, 18, 478, 140, 56, 'Clear tray');
            button(c, U, 176, 478, 166, 56, 'SERVE SUB', selected.size > 0);
            U.text(c, 'Ticket stays visible - accuracy before speed', 180, 548, { size: 11, color: '#cbd5e1' });
        }
        return { title: 'Sub Shop', goal: `Serve ${target} perfect subs before closing`,
            intro: { head: 'SUB SHOP RUSH', lines: ['Read each customer ticket', 'Tap ingredients to build the sub', 'Tap again to remove; serve exact orders', 'Remakes cost customer patience'] },
            start, update, draw, ...taps(tap),
            _state: () => ({ time, served, mistakes, lost, order: [...order], selected: [...selected], patience, cooldown, target, limit, finished }) };
    });

    Minigames.register('carryout', env => {
        const { U, end } = env, rank = U.challenge(env.level);
        const target = 4 + Math.floor(rank / 2), cookRate = .24 + rank * .012;
        const window = .19 - rank * .008, limit = 17 - rank * .5;
        let time, served, burnt, lost, stage, heat, sauce, wanted, patience, cooldown, finished;
        const sauces = ['Mambo', 'BBQ', 'Plain'];
        function ticket() {
            stage = 0; heat = 0; sauce = null; wanted = Math.floor(U.rand(0, sauces.length));
            patience = limit; cooldown = 0;
        }
        function start() { time = 85; served = 0; burnt = 0; lost = 0; finished = false; ticket(); }
        start();
        function finish(win) {
            if (finished) return;
            finished = true;
            end({ win, head: win ? 'CARRYOUT LEGEND!' : 'KITCHEN CLOSED', stars: 0,
                lines: [`${served}/${target} boxes served`, `${burnt} burnt batches | ${lost} customers left`, 'Timing + the correct sauce = happy customers'] });
        }
        function tap(p) {
            if (finished || cooldown > 0) return;
            if (inside(p, 18, 321, 324, 60)) {
                if (stage === 0) { stage = 1; heat = 0; env.sfx('splash'); }
                else if (stage === 1) {
                    if (Math.abs(heat - .65) <= window) { stage = 2; feedback(env, 'GOLDEN CRISP!', true); }
                    else { stage = 0; heat = 0; feedback(env, 'Too early - new batch', false); }
                }
                return;
            }
            for (let i = 0; i < sauces.length; i++) {
                if (inside(p, 18 + i * 110, 402, 104, 54)) {
                    if (stage < 2) { feedback(env, 'Cook the wings first', false); return; }
                    sauce = i; stage = 3; env.sfx('splash'); return;
                }
            }
            if (!inside(p, 18, 483, 324, 52)) return;
            if (stage !== 3) { feedback(env, 'Cook and choose a sauce', false); return; }
            if (sauce !== wanted) { patience = Math.max(0, patience - 2); feedback(env, 'Wrong sauce - change it', false); return; }
            served++; cooldown = .7; feedback(env, 'BOXED AND READY!', true);
            if (served >= target) finish(true);
        }
        function update(dt) {
            if (finished) return;
            time = Math.max(0, time - dt);
            if (time <= 0) { finish(false); return; }
            if (cooldown > 0) { cooldown -= dt; if (cooldown <= 0) ticket(); return; }
            patience -= dt;
            if (patience <= 0) { lost++; feedback(env, 'Customer left', false); ticket(); return; }
            if (stage === 1) {
                heat += dt * cookRate;
                if (heat > .65 + window) { burnt++; stage = 0; heat = 0; feedback(env, 'BURNT - start again', false); }
            }
        }
        function draw(c) {
            scene(c, env, 'MAMBO SAUCE RUSH', '#fb923c', `${Math.ceil(time)}s  |  ${served}/${target} boxes  |  ${burnt} burnt`,
                cooldown > 0 ? 'Order served!' : `Wings + ${sauces[wanted]}${wanted === 2 ? ' (no sauce)' : ' sauce'}`, patience / limit);
            c.fillStyle = '#e6d9bb'; U.rr(c, 36, 183, 288, 80, 10); c.fill();
            c.strokeStyle = '#b9a784'; c.lineWidth = 2; c.stroke();
            c.fillStyle = '#f8f2e5'; U.rr(c, 43, 188, 274, 69, 7); c.fill();
            for (let i = 0; i < 5; i++) {
                const x = 69 + i * 42, y = 215 + Math.sin(i * 2) * 10;
                wing(c, U, x, y, -.4 + i * .15, stage === 3 && sauce !== 2 ? (sauce === 0 ? '#a51f30' : '#78350f') : null, stage >= 2);
                if (stage === 1) {
                    c.strokeStyle = '#fef3c7'; c.lineWidth = 2; c.beginPath();
                    c.moveTo(x, y - 16); c.quadraticCurveTo(x + 7, y - 25, x, y - 35 - Math.sin(env.time() * 5 + i) * 4); c.stroke();
                }
            }
            c.fillStyle = '#e9b64d';
            for (let i = 0; i < 7; i++) {
                c.save(); c.translate(276 + i % 3 * 7, 200 + i % 2 * 6); c.rotate(-.25 + i * .08);
                c.fillRect(0, 0, 5, 34); c.fillStyle = '#ffe3a0'; c.fillRect(0, 0, 2, 31); c.fillStyle = '#e9b64d'; c.restore();
            }
            c.fillStyle = '#475569'; c.fillRect(28, 288, 304, 14);
            c.fillStyle = '#22c55e'; c.fillRect(28 + (.65 - window) * 304, 288, window * 2 * 304, 14);
            c.fillStyle = '#fff'; c.fillRect(28 + Math.min(1, heat) * 304 - 2, 284, 4, 22);
            button(c, U, 18, 321, 324, 60, stage === 0 ? 'DROP WINGS' : stage === 1 ? 'LIFT IN THE GREEN ZONE' : 'BATCH READY', stage >= 2);
            U.text(c, 'HOUSE SPECIAL: GLOSSY RED MAMBO SAUCE', 180, 391, { size: 10, color: '#fecdd3' });
            sauces.forEach((name, i) => {
                button(c, U, 18 + i * 110, 402, 104, 54, name, sauce === i);
                c.fillStyle = ['#a51f30', '#78350f', '#d88a30'][i];
                c.beginPath(); c.ellipse(70 + i * 110, 446, 18, 4, 0, 0, Math.PI * 2); c.fill();
                c.strokeStyle = '#f8ddd1'; c.lineWidth = 1; c.stroke();
            });
            button(c, U, 18, 483, 324, 52, 'PACK + SERVE', stage === 3);
            U.text(c, 'Arcade timing only - not real cooking instructions', 180, 549, { size: 10, color: '#cbd5e1' });
        }
        return { title: 'Carryout Craze', goal: `Cook, sauce and serve ${target} wing boxes`,
            intro: { head: 'MAMBO SAUCE RUSH', lines: ['Tap DROP WINGS to start the fryer', 'Lift while the marker is in green', 'Mambo = glossy red, ketchup-like sauce', 'Choose the ticket sauce, then pack + serve'] },
            start, update, draw, ...taps(tap),
            _state: () => ({ time, served, burnt, lost, stage, heat, sauce, wanted, patience, cooldown, target, window, cookRate, limit, finished }) };
    });
})();
