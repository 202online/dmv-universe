'use strict';

// Generic wearables (wave 1 basics, wave 2 hoodies and fitted caps). Intentionally unpriced and unlisted:
// shops must not sell these until a price and listing are added.
const ClothingCatalog = (() => {
    const colors = {
        red: { name: 'Red', hex: '#d62828', trim: '#8f1b1b' },
        yellow: { name: 'Yellow', hex: '#f6c90e', trim: '#b38f00' },
        blue: { name: 'Blue', hex: '#1f5fd1', trim: '#143f8c' },
        green: { name: 'Green', hex: '#2a9d4b', trim: '#1b6a32' },
        black: { name: 'Black', hex: '#1c1c1f', trim: '#4a4a52' },
        pink: { name: 'Pink', hex: '#f472b6', trim: '#b8417f' },
        purple: { name: 'Purple', hex: '#7e3fbf', trim: '#55288a' },
        orange: { name: 'Orange', hex: '#f17a1d', trim: '#ad5210' }
    };
    const slots = { top: 'Top', outerwear: 'Outerwear', bottom: 'Bottom', shoes: 'Shoes', hat: 'Hat' };
    const styles = {
        tshirt: { slot: 'top', label: 'T-shirt' },
        sweatpants: { slot: 'bottom', label: 'Sweatpants' },
        jeans: { slot: 'bottom', label: 'Jeans' },
        sneakers: { slot: 'shoes', label: 'Shoes' },
        hoodie: { slot: 'outerwear', label: 'Zip Hoodie', wearStates: ['zip', 'hood'] },
        fittedcap: { slot: 'hat', label: 'Fitted Cap' }
    };
    const item = (style, color, extra = {}) => Object.freeze({
        id: `${color}-${style}`, style, slot: styles[style].slot, color, wave: style === 'hoodie' || style === 'fittedcap' ? 2 : 1,
        name: `Generic ${colors[color].name} ${styles[style].label}`, hex: colors[color].hex, trim: colors[color].trim,
        price: null, listed: false, ...extra
    });
    const colorIds = Object.keys(colors);
    const items = Object.freeze([
        ...colorIds.map(c => item('tshirt', c)),
        item('jeans', 'black', { name: 'Generic Black Jeans', hex: '#202024', trim: '#5b5b66' }),
        ...colorIds.map(c => item('sweatpants', c)),
        ...colorIds.map(c => item('sneakers', c)),
        ...colorIds.map(c => item('hoodie', c)),
        ...colorIds.map(c => item('fittedcap', c))
    ]);
    const byId = Object.freeze(Object.fromEntries(items.map(i => [i.id, i])));

    function get(id) {
        if (!Object.hasOwn(byId, id)) throw new Error(`Unknown clothing item: ${id}`);
        return byId[id];
    }
    const bySlot = slot => {
        if (!Object.hasOwn(slots, slot)) throw new Error(`Unknown clothing slot: ${slot}`);
        return items.filter(i => i.slot === slot);
    };
    // Only priced, listed items may be sold; wave 1 currently has none.
    const forSale = () => items.filter(i => i.listed && Number.isInteger(i.price) && i.price >= 0);

    function preview(id, wear = {}) {
        const i = get(id), c = i.hex, t = i.trim;
        const zip = clamp(wear.zip ?? 1), hood = clamp(wear.hood ?? 0), open = (1 - zip) * 9, slider = 84 - zip * 62;
        const art = {
            tshirt: `<path d="M30 14l12-6q8 6 16 0l12 6 14 14-10 10-6-5v45H32V33l-6 5-10-10z" fill="${c}" stroke="${t}" stroke-width="2"/><path d="M42 8q8 8 16 0" fill="none" stroke="${t}" stroke-width="2"/>`,
            sweatpants: `<path d="M30 10h40l4 74H54L50 36l-4 48H26z" fill="${c}" stroke="${t}" stroke-width="2"/><path d="M30 16h40" stroke="${t}" stroke-width="3"/><path d="M48 16v8m4-8v8" stroke="#f3f4f6" stroke-width="1.5"/><path d="M27 76h18m10 0h18" stroke="${t}" stroke-width="5"/>`,
            jeans: `<path d="M30 10h40l4 76H55L50 36l-5 50H26z" fill="${c}" stroke="${t}" stroke-width="2"/><path d="M30 17h40" stroke="${t}" stroke-width="2"/><path d="M36 17q2 9 10 9m18-9q-2 9-10 9" fill="none" stroke="#a88d5a" stroke-width="1.2" stroke-dasharray="2 2"/><path d="M50 17v18" stroke="${t}"/>`,
            hoodie: `<path d="M50 ${18 - hood * 8}q${-17 - hood * 3} ${-1 - hood * 6} ${-16 - hood * 4} ${12 + hood * 4}q${6 + hood * 2} ${5 + hood * 8} 16 ${4 + hood * 3}q${10 - hood * 2} ${1 + hood * 5} 16 ${-4 - hood * 8}q1 ${-13 - hood * 2} -16 ${-12 - hood * 4}z" fill="${t}" stroke="${t}"/>` +
                `<path d="M50 ${26 - hood * 6}q-8 ${-4 - hood * 4} -9 ${4 + hood * 2}q4 4 9 3q5 1 9 -3q-1 ${-8 - hood * 2} -9 ${-4 - hood * 4}z" fill="#111827" opacity="${.35 + hood * .45}"/>` +
                `<path d="M30 22l-14 10-6 46h10l6-36v45h${24 - open}V${slider}L${50 - open} 24z" fill="${c}" stroke="${t}" stroke-width="2"/>` +
                `<path d="M70 22l14 10 6 46H80l-6-36v45H${50 + open}V${slider}L${50 + open} 24z" fill="${c}" stroke="${t}" stroke-width="2"/>` +
                `<path d="M26 80h48" stroke="${t}" stroke-width="4"/><path d="M50 87V${slider}" stroke="#d1d5db" stroke-width="1.5"/><rect x="47.5" y="${slider - 3}" width="5" height="6" rx="1" fill="#e5e7eb"/>` +
                `<path d="M45 28l-1 14m11-14l1 14" stroke="#f3f4f6" stroke-width="1.5"/><path d="M33 62l6 8m28-8l-6 8" stroke="${t}" stroke-width="2"/>`,
            fittedcap: `<path d="M22 56q0-32 28-34 28 2 28 34z" fill="${c}" stroke="${t}" stroke-width="2"/><path d="M50 22v34M36 26q-4 14-3 30m31-30q4 14 3 30" stroke="${t}" stroke-width="1.5" fill="none"/>` +
                `<circle cx="50" cy="21" r="3" fill="${c}" stroke="${t}"/><path d="M22 56h56" stroke="${t}" stroke-width="3"/><path d="M30 57q22 22 58 4q-26-9-58-4z" fill="${c}" stroke="${t}" stroke-width="2"/><path d="M40 60q20 9 40 2" stroke="${t}" fill="none"/>`,
            sneakers: `<path d="M14 60q0-16 14-18l16-6 12 12q14 4 26 6 8 2 8 10v6H14z" fill="${c}" stroke="${t}" stroke-width="2"/><path d="M14 66h76v8H14z" fill="#f3f4f6" stroke="${t}" stroke-width="1.5"/><path d="M36 44l6 6m-1-9l6 6m-1-9l6 6" stroke="#f3f4f6" stroke-width="2"/>`
        }[i.style];
        return `<svg viewBox="0 0 100 92" role="img" aria-label="${i.name}">${art}</svg>`;
    }
    function clamp(v) { return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0)); }
    const lerp = (a, b, t) => a + (b - a) * t;
    function shade(hex, f) {
        const n = parseInt(hex.slice(1), 16);
        const ch = s => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
        return `#${[16, 8, 0].map(s => ch(s).toString(16).padStart(2, '0')).join('')}`;
    }

    // Hoodie zip and hood tween between 0 and 1 (1 = zipped / hood up).
    const ANIM_MS = { zip: 420, hood: 300 };
    function wearState({ zipped = true, hoodUp = false } = {}) {
        const at = v => ({ from: v, to: v, start: 0 });
        return { zip: at(zipped ? 1 : 0), hood: at(hoodUp ? 1 : 0) };
    }
    function amount(state, part, now) {
        const a = state[part];
        if (!a || !Object.hasOwn(ANIM_MS, part)) throw new Error(`Unknown wear state: ${part}`);
        const t = clamp((now - a.start) / ANIM_MS[part]);
        return lerp(a.from, a.to, t * t * (3 - 2 * t));
    }
    function setWear(state, part, on, now) {
        state[part] = { from: amount(state, part, now), to: on ? 1 : 0, start: now };
        return state;
    }
    const toggleWear = (state, part, now) => setWear(state, part, state[part].to < .5, now);
    const animating = (state, now) => Object.keys(ANIM_MS).some(p => now - state[p].start < ANIM_MS[p]);

    const OUTFIT_SLOTS = { top: ['tshirt'], bottom: ['sweatpants', 'jeans'], shoes: ['sneakers'], hoodie: ['hoodie'], cap: ['fittedcap'] };
    const SLOT_LABEL = { top: 'T-shirt', bottom: 'bottom', shoes: 'pair of shoes', hoodie: 'hoodie', cap: 'fitted cap' };
    function outfitItems(outfit) {
        const worn = {};
        for (const key of Object.keys(outfit)) {
            if (key === 'state' || !outfit[key]) continue;
            if (!Object.hasOwn(OUTFIT_SLOTS, key)) throw new Error(`Unknown outfit slot: ${key}`);
            const i = get(outfit[key]);
            if (!OUTFIT_SLOTS[key].includes(i.style)) throw new Error(`${i.id} is not a ${SLOT_LABEL[key]}`);
            worn[key] = i;
        }
        return worn;
    }

    // Draws worn clothing over an avatar drawn with the game's drawAvatar, using the same
    // anchor (sx, sy at the feet) and pose (bob, sw, fx, fy) so every piece follows the walk.
    // layer: 'body' (garments, drawn before hair), 'head' (cap and hood, after hair) or 'all'.
    function drawWorn(ctx, outfit, pose, layer = 'all') {
        if (!['all', 'body', 'head'].includes(layer)) throw new Error(`Unknown clothing layer: ${layer}`);
        const body = layer !== 'head', head = layer !== 'body';
        const { sx, sy, bob = 0, sw = 0, fx = 0, fy = 1, skin = '#c68642', now = 0, hair = 'short' } = pose;
        const { top: tee, bottom: pants, shoes, hoodie, cap } = outfitItems(outfit);
        const curly = hair === 'curly';
        const state = outfit.state || wearState();
        const zip = hoodie ? amount(state, 'zip', now) : 1, hood = hoodie ? amount(state, 'hood', now) : 0;
        const front = fy >= 0, top = sy - 36 - bob, bottom = sy - 14 - bob, hy = sy - 45 - bob;
        const line = (x1, y1, x2, y2, col, w) => {
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
            ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke();
        };
        const shape = (pts, fill, stroke) => {
            ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
            ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = .8; ctx.stroke(); }
        };
        ctx.save();
        if (pants && body) {
            const c = pants.hex, t = pants.trim, hip = sy - 16 - bob;
            ctx.save();
            // Hips sit under the hem; clip so pants never cover the shirt.
            ctx.beginPath(); ctx.rect(sx - 20, sy - 15 - bob, 40, 40); ctx.clip();
            for (const side of [-1, 1]) {
                const x0 = sx + side * 3, x1 = x0 - side * sw * .6;
                line(x0, hip, x1, sy - 2.2, t, pants.style === 'jeans' ? 5.8 : 6.4);
                line(x0, hip, x1, sy - 2.2, c, pants.style === 'jeans' ? 4.8 : 5.4);
                if (pants.style === 'sweatpants') {
                    line(x1 - .2 * (x1 - x0), sy - 4.4, x1, sy - 2.4, t, 5.2);
                    line(x0 - side * 1.6, hip + 1, x1 - side * 1.6, sy - 5, shade(c, 1.25), .7);
                } else {
                    line(x0 + side * 1.4, hip + 1, x1 + side * 1.4, sy - 3, '#c9a35f', .45);
                    line(x0 - side * 1, hip + 2, x1 - side * 1, sy - 5, shade(c, 1.6), .6);
                }
            }
            ctx.restore();
        }
        if (shoes && body) {
            const c = shoes.hex, t = shoes.trim;
            for (const foot of [sx - 3 + sw * .6, sx + 3 - sw * .6]) {
                ctx.fillStyle = c; ctx.strokeStyle = t; ctx.lineWidth = .6;
                ctx.beginPath(); ctx.ellipse(foot, sy - 1, 4.7, 2.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                line(foot - 3.6, sy + .7, foot + 3.6, sy + .7, '#f3f4f6', 1);
                if (fy >= 0) { line(foot - 1.4, sy - 2.2, foot + 1.2, sy - 2.2, '#f3f4f6', .5); line(foot - 1.2, sy - 1.3, foot + 1.4, sy - 1.3, '#f3f4f6', .5); }
            }
        }
        if (tee && body) {
            const c = tee.hex, b = bob, y = v => sy - v - b;
            ctx.beginPath();
            ctx.moveTo(sx - 4, y(37)); ctx.lineTo(sx - 8, y(36)); ctx.lineTo(sx - 13, y(29)); ctx.lineTo(sx - 9, y(27));
            ctx.lineTo(sx - 7, y(30)); ctx.lineTo(sx - 8, y(15)); ctx.lineTo(sx + 8, y(15)); ctx.lineTo(sx + 7, y(30));
            ctx.lineTo(sx + 9, y(27)); ctx.lineTo(sx + 13, y(29)); ctx.lineTo(sx + 8, y(36)); ctx.lineTo(sx + 4, y(37));
            ctx.quadraticCurveTo(sx, y(33), sx - 4, y(37)); ctx.closePath();
            ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
            ctx.beginPath(); ctx.arc(sx, y(37), 3.5, 0, Math.PI); ctx.strokeStyle = tee.trim; ctx.lineWidth = .9; ctx.stroke();
            line(sx + 5, y(30), sx + 6, y(21), shade(c, .75), .8);
            line(sx - 6, y(28), sx - 5, y(21), shade(c, 1.2), .8);
            line(sx - 12.2, y(28.6), sx - 9.4, y(26.8), tee.trim, .8);
            line(sx + 12.2, y(28.6), sx + 9.4, y(26.8), tee.trim, .8);
        }
        if (hoodie && body) {
            const c = hoodie.hex, t = hoodie.trim;
            // Slim sleeves that follow the arm, finished with a narrow ribbed cuff.
            for (const side of [-1, 1]) {
                const hx = sx + side * 11, hyand = sy - 19 - bob - side * sw * .5, ax = sx + side * 7.6;
                // Tapers from a shoulder cap wide enough to hide any tee sleeve down to the wrist.
                shape([[sx + side * 7.4, top - .6], [sx + side * 13.4, top + 6.6], [sx + side * 12.2, top + 9.8],
                    [hx + side * 1.9, hyand - 1], [hx - side * 1.9, hyand - .4], [ax - side * .2, top + 8]], c, shade(c, .62));
                line(ax + side * .4, top + 4, hx - side * .3, hyand - 2.6, shade(c, side < 0 ? 1.18 : .86), .7);
                line(hx - side * .15, hyand - 1.3, hx, hyand - .1, shade(c, .8), 3.6);
                ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(hx, hyand + 1.4, 1.6, 0, Math.PI * 2); ctx.fill();
            }
            // The body hugs the shirt silhouette: shoulders, a slight waist taper and a gathered hem.
            const hem = bottom - .8;
            const torso = side => [[sx + side * 3.5, top - 1], [sx + side * 7.8, top - .2], [sx + side * 8.1, top + 4],
                [sx + side * 7.4, top + 12], [sx + side * 7.9, hem]];
            const open = front ? (1 - zip) * 4.5 : 0, slider = lerp(bottom, top + 1, zip);
            // Lowered hood, front view: bunched behind the neck so only its rim shows beside the head.
            if (front && hood < .5) {
                ctx.beginPath(); ctx.ellipse(sx, top - 1.6, 8, 4.2, 0, 0, Math.PI * 2);
                ctx.fillStyle = shade(c, .82); ctx.fill(); ctx.strokeStyle = shade(c, .55); ctx.lineWidth = .8; ctx.stroke();
                ctx.beginPath(); ctx.ellipse(sx, top - 1.9, 6, 2.8, 0, Math.PI, 0);
                ctx.strokeStyle = shade(c, .5); ctx.lineWidth = .7; ctx.stroke();
            }
            if (front) for (const side of [-1, 1]) {
                shape([...torso(side), [sx, hem], [sx, slider], [sx + side * open, top + 1]], c, shade(c, .62));
                if (open > .2) line(sx, slider, sx + side * open, top + 1, shade(c, .6), .7);
            }
            // The back is one seamless panel.
            else shape([...torso(-1), ...torso(1).reverse()], c, shade(c, .62));
            // Soft shading at the sides gives the fabric some volume.
            line(sx + 6.2, top + 4, sx + 6.4, hem - 3, shade(c, .84), 1.1);
            line(sx - 6.2, top + 4, sx - 6.4, hem - 3, shade(c, 1.12), .9);
            // Ribbed waistband sits snug at the hips.
            ctx.fillStyle = shade(c, .86); ctx.fillRect(sx - 7.6, hem - 1.8, 15.2, 1.8);
            for (let x = -6.6; x <= 6.6; x += 1.5) line(sx + x, hem - 1.7, sx + x, hem - .1, shade(c, .7), .3);
            if (front) {
                line(sx, hem, sx, slider, '#cbd5e1', .7);
                ctx.fillStyle = '#e5e7eb'; ctx.fillRect(sx - .8, slider - 1.3, 1.6, 2.6);
                // Front pouch-pocket seams.
                for (const side of [-1, 1]) line(sx + side * 1.6, hem - 6.6, sx + side * 4.8, hem - 2.2, shade(c, .66), .6);
                if (hood <= .01) for (const side of [-1, 1]) line(sx + side * 2.2, top + 1, sx + side * 2.6, top + 7, '#f3f4f6', .7);
            } else if (hood < .5) {
                // Lowered hood, back view: it lies on the upper back with its opening facing up.
                const k = 1 - hood * 2, h = 11 * k + 2;
                ctx.beginPath(); ctx.moveTo(sx - 7.6, top - 1.5);
                ctx.quadraticCurveTo(sx - 8.4, top + h * .7, sx, top + h);
                ctx.quadraticCurveTo(sx + 8.4, top + h * .7, sx + 7.6, top - 1.5);
                ctx.quadraticCurveTo(sx, top - 3, sx - 7.6, top - 1.5); ctx.closePath();
                ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = shade(c, .55); ctx.lineWidth = .8; ctx.stroke();
                ctx.beginPath(); ctx.ellipse(sx, top + .2, 5.8, 1.9 * k + .4, 0, 0, Math.PI * 2);
                ctx.fillStyle = shade(c, .42); ctx.fill();
                ctx.beginPath(); ctx.ellipse(sx, top + .2, 5.8, 1.9 * k + .4, 0, 0, Math.PI);
                ctx.strokeStyle = shade(c, 1.25); ctx.lineWidth = .6; ctx.stroke();
            }
        }
        if (cap && head) {
            const c = cap.hex, t = cap.trim;
            ctx.fillStyle = c; ctx.strokeStyle = t; ctx.lineWidth = .8;
            const crx = curly ? 9.4 : 7.8, cry = curly ? 10.4 : 6.4, crown = hy - 2.5 - cry;
            ctx.beginPath(); ctx.ellipse(sx, hy - 2.5, crx, cry, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
            line(sx - crx + .2, hy - 2.6, sx + crx - .2, hy - 2.6, t, 1.2);
            for (const ox of [-3.6, 0, 3.6]) line(sx + fx * 1.5, crown + 2, sx + ox * crx / 4.6 + fx, hy - 3, shade(c, .75), .5);
            ctx.fillStyle = c; ctx.beginPath(); ctx.arc(sx + fx * 1.5, crown + 1.7, 1, 0, Math.PI * 2); ctx.fill();
        }
        if (hoodie && head && hood > .01) {
            const c = hoodie.hex, inner = shade(c, .45);
            // The face opening reaches the face early so the rising hood never covers it.
            const face = Math.min(1, hood * 2.6);
            const cy = lerp(front ? top - .5 : top + 3, hy - (curly ? 3 : 1.5), hood);
            const ox = sx + fx * 1.4 * face, oy = lerp(front ? top : cy, hy + .2, face), orx = lerp(4.4, 6.4, face), ory = lerp(1.2, 7.4, face);
            const rx = Math.max(lerp(front ? 6.4 : 7, curly ? 10.8 : 9.6, hood), front ? orx + 2 : 0);
            const ry = Math.max(lerp(front ? 2.4 : 4, curly ? 12.2 : 10.2, hood), front ? Math.abs(cy - oy) + ory + 1.2 : 0);
            ctx.beginPath(); ctx.ellipse(sx, cy, rx, ry, 0, 0, Math.PI * 2);
            if (front) ctx.ellipse(ox, oy, orx, ory, 0, 0, Math.PI * 2);
            ctx.fillStyle = c; ctx.fill('evenodd');
            ctx.strokeStyle = shade(c, .55); ctx.lineWidth = .8; ctx.stroke();
            if (front) {
                ctx.beginPath(); ctx.ellipse(ox, oy, orx, ory, 0, 0, Math.PI * 2);
                ctx.strokeStyle = inner; ctx.lineWidth = 1.1; ctx.stroke();
                const sy0 = lerp(top + 1, cy + 7, hood);
                for (const side of [-1, 1]) line(sx + side * 2.2, sy0, sx + side * 2.6, sy0 + 6, '#f3f4f6', .7);
            }
        }
        if (cap && head && front) {
            const c = cap.hex, t = cap.trim, side = Math.abs(fx) > .5 && Math.abs(fy) < .5;
            ctx.save();
            ctx.fillStyle = c; ctx.strokeStyle = t; ctx.lineWidth = .8;
            ctx.beginPath();
            if (side) ctx.ellipse(sx + fx * (curly ? 8.4 : 7), hy - 2.4, 5, 1.5, 0, 0, Math.PI * 2);
            else ctx.ellipse(sx + fx * 2.5, hy - 3.6, curly ? 8.6 : 7.6, 1.8, 0, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
        return { zip, hood };
    }

    return { colors, slots, styles, items, get, bySlot, forSale, preview,
        ANIM_MS, OUTFIT_SLOTS, wearState, amount, setWear, toggleWear, animating, drawWorn };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ClothingCatalog;
