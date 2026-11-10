'use strict';

const ResidentialArt = (() => {
    function plan(b) {
        const kind = b.kind || b.style;
        if (!['house', 'apartment', 'condo'].includes(kind)) throw new Error('Unknown residential kind');
        const variant = b.variant ?? 0;
        if (![0, 1, 2].includes(variant)) throw new Error('Unknown residential variant');
        let pieces;
        if (kind === 'house') pieces = [
            [[.04, .06, .65, .70, 0, 1, 'gable'], [.20, .76, .30, .14, 0, .60, 'flat']],
            [[.04, .06, .64, .43, 0, .85, 'hip'], [.04, .49, .38, .41, 0, .65, 'gable']],
            [[.04, .06, .65, .70, 0, .78, 'flat'], [.12, .12, .49, .50, .78, .22, 'gable']]
        ][variant];
        else if (kind === 'condo') pieces = [
            [[.04, .06, .64, .47, 0, 1, 'flat'], [.04, .53, .39, .36, 0, .72, 'flat']],
            [[.04, .06, .64, .68, 0, .72, 'flat'], [.12, .12, .48, .48, .72, .28, 'flat']],
            [[.04, .06, .64, .30, 0, .82, 'flat'], [.04, .36, .24, .52, 0, 1, 'flat'], [.44, .36, .24, .27, 0, .66, 'flat']]
        ][variant];
        else pieces = [
            [[.04, .04, .92, .53, 0, 1, 'flat']],
            [[.04, .04, .92, .62, 0, .78, 'flat'], [.14, .10, .72, .40, .78, .22, 'flat']],
            [[.04, .04, .42, .61, 0, 1, 'flat'], [.54, .04, .42, .54, 0, .82, 'flat']]
        ][variant];
        const parts = pieces.map(([x, y, w, d, z, h, roof]) => ({
            x: b.x + x * b.w, y: b.y + y * b.d, w: w * b.w, d: d * b.d, z: z * b.h, h: h * b.h, roof
        }));
        return { kind, variant, parts, parking: kind === 'apartment' ?
            { x: b.x + b.w * .04, y: b.y + b.d * .72, w: b.w * .92, d: b.d * .24 } :
            { x: b.x + b.w * .74, y: b.y + b.d * .04, w: b.w * .22, d: b.d * .92 } };
    }
    function draw(b, { ctx: c, P, poly, box, shade }, active = false, time = 0) {
        const layout = plan(b), trim = b.trim, outline = '#17232899';
        const plane = (x, y, w, d, z, fill, stroke, width = 1) =>
            poly([P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z)], fill, stroke, width);
        const front = (p, u0, u1, z0, z1, fill, stroke, width = 1) =>
            poly([P(p.x + p.w * u0, p.y + p.d, z0), P(p.x + p.w * u1, p.y + p.d, z0),
                P(p.x + p.w * u1, p.y + p.d, z1), P(p.x + p.w * u0, p.y + p.d, z1)], fill, stroke, width);
        const line = (points, color, width = 1) => {
            c.beginPath(); points.forEach(([x, y, z], i) => { const p = P(x, y, z); i ? c.lineTo(...p) : c.moveTo(...p); });
            c.strokeStyle = color; c.lineWidth = width; c.stroke();
        };
        plane(b.x, b.y, b.w, b.d, 0, layout.kind === 'apartment' ? '#6d7768' : '#55754c', '#9c9b7a');
        const lot = layout.parking;
        plane(lot.x, lot.y, lot.w, lot.d, .3, layout.kind === 'apartment' ? '#48515b' : '#a9a28d', '#d2c8a9');
        if (layout.kind === 'apartment') {
            const count = layout.variant === 2 ? 4 : 3;
            for (let i = 0; i <= count; i++) {
                const x = lot.x + lot.w * i / count;
                line([[x, lot.y, .6], [x, lot.y + lot.d * .85, .6]], '#efe1ad');
            }
            if (layout.variant !== 1) {
                const x = lot.x + lot.w * .12, y = lot.y + lot.d * .12;
                box(x, y, 1, lot.w * .16, lot.d * .60, 3, '#63879a', outline);
                plane(x + lot.w * .02, y + lot.d * .12, lot.w * .12, lot.d * .26, 4.1, '#a4c5cc');
            }
        } else {
            for (let i = 1; i < 5; i++)
                line([[lot.x, lot.y + lot.d * i / 5, .6], [lot.x + lot.w, lot.y + lot.d * i / 5, .6]], '#827e70');
            if (layout.variant === 1) {
                const gx = lot.x, gy = lot.y;
                box(gx, gy, 0, lot.w, lot.d * .31, b.h * .24, b.color, outline);
                const garage = { x: gx, y: gy, w: lot.w, d: lot.d * .31 };
                front(garage, .10, .90, 1, b.h * .20, '#56636c', trim);
                for (let z = 4; z < b.h * .20; z += 5) front(garage, .10, .90, z, z + .7, '#c0c6c3');
            }
            if (layout.variant > 0) {
                const carX = lot.x + lot.w * .15, carY = lot.y + lot.d * .59;
                box(carX, carY, 1, lot.w * .70, lot.d * .26, 4, layout.variant === 1 ? '#8b3344' : '#52778c', outline);
                box(carX + lot.w * .08, carY + lot.d * .07, 5, lot.w * .54, lot.d * .11, 3, '#a8c6ce', outline);
                for (const x of [carX + lot.w * .08, carX + lot.w * .58])
                    box(x, carY + lot.d * .20, .5, Math.max(1, lot.w * .12), 2, 2, '#1e293b');
            }
        }
        for (const p of layout.parts) {
            const color = b.color;
            box(p.x, p.y, p.z, p.w, p.d, p.h, color, outline);
            const levels = Math.max(1, Math.round(p.h / (layout.kind === 'house' ? 35 : 32)));
            for (let level = 0; level < levels; level++) {
                const z = p.z + 12 + level * (p.h - 16) / levels;
                const height = Math.min(16, p.h / levels - 10);
                for (const u of [.15, .62]) {
                    if (level || p.z || u !== .15) front(p, u, u + .20, z, z + height, '#86adb3', trim, 1.2);
                    poly([P(p.x + p.w, p.y + p.d * u, z), P(p.x + p.w, p.y + p.d * (u + .20), z),
                        P(p.x + p.w, p.y + p.d * (u + .20), z + height), P(p.x + p.w, p.y + p.d * u, z + height)], '#7099a4', trim);
                }
            }
            if (!p.z) front(p, .12, .30, 0, Math.min(28, p.h - 3), '#343d42', trim, 1.5);
            const top = p.z + p.h;
            if (p.roof === 'gable') {
                const ridge1 = P(p.x + p.w / 2, p.y, top + 16), ridge2 = P(p.x + p.w / 2, p.y + p.d, top + 16);
                poly([P(p.x, p.y + p.d, top), P(p.x + p.w, p.y + p.d, top), ridge2], shade(color, .75), trim);
                poly([P(p.x, p.y, top), P(p.x, p.y + p.d, top), ridge2, ridge1], '#796253', trim);
                poly([P(p.x + p.w, p.y, top), P(p.x + p.w, p.y + p.d, top), ridge2, ridge1], '#5d4c46', trim);
                for (let k = 1; k < 5; k++) {
                    const y = p.y + p.d * k / 5;
                    line([[p.x + p.w, y, top], [p.x + p.w / 2, y, top + 16]], '#917767');
                }
            } else if (p.roof === 'hip') {
                const corners = [[p.x, p.y], [p.x + p.w, p.y], [p.x + p.w, p.y + p.d], [p.x, p.y + p.d]];
                corners.forEach((corner, k) => poly([P(...corner, top), P(...corners[(k + 1) % 4], top),
                    P(p.x + p.w / 2, p.y + p.d / 2, top + 18)], ['#80685a', '#665348', '#74594d', '#94725d'][k], trim));
            } else {
                front(p, 0, 1, top - 4, top, trim);
                plane(p.x + p.w * .1, p.y + p.d * .1, p.w * .8, p.d * .8, top + .5, '#52616a', trim);
                if (layout.kind === 'condo') {
                    line([[p.x + p.w * .1, p.y + p.d * .1, top + 7], [p.x + p.w * .9, p.y + p.d * .1, top + 7],
                        [p.x + p.w * .9, p.y + p.d * .9, top + 7]], '#c7d4d0', 1.5);
                }
            }
            if (layout.kind !== 'house' || layout.variant === 2) {
                const depth = Math.min(b.d * .10, b.y + b.d * .98 - p.y - p.d);
                if (depth > 0) for (let level = 1; level < levels; level++) {
                    const z = p.z + level * p.h / levels, left = p.x + p.w * .1, right = p.x + p.w * .9, y = p.y + p.d + depth;
                    plane(left, p.y + p.d, right - left, depth, z, '#b9a58a', '#d7ccaf');
                    line([[left, y, z + 8], [right, y, z + 8]], '#cbdad6', 1.5);
                    for (let rail = 0; rail <= 6; rail++) {
                        const x = left + (right - left) * rail / 6;
                        line([[x, y, z], [x, y, z + 8]], '#a2b6b5');
                    }
                    box(right - 6, y - depth * .7, z + 1, 4, Math.max(2, depth * .6), 3, '#9c6a48');
                }
            }
        }
        if (layout.kind === 'apartment' && layout.variant === 1) {
            const p = layout.parts[0];
            for (const u of [.38, .67]) {
                front(p, u, u + .22, 1, 20, '#465768', trim);
                for (let z = 4; z < 20; z += 4) front(p, u, u + .22, z, z + .7, '#aabac2');
            }
        }
        if (layout.kind === 'house' && layout.variant === 2) {
            const p = layout.parts[0], z = p.z + p.h * .52;
            plane(p.x + p.w * .1, p.y + p.d, p.w * .8, b.d * .14, z, '#9d8260', trim);
            for (const u of [.12, .88]) box(p.x + p.w * u, p.y + p.d + b.d * .1, 0, 2, 2, z, '#d6c6a3');
        }
        if (layout.kind === 'house' && layout.variant !== 1) {
            const x = b.x + b.w * .06, y = b.y + b.d * .91, w = b.w * .50;
            box(x, y, 0, 2, 2, 43, '#f0e5cf', outline);
            box(x, y, 41, w + 4, 2, 2, '#f0e5cf', outline);
            for (const u of [.22, .83])
                line([[x + w * u, y + 1, 41], [x + w * u, y + 1, 37]], '#687076', 1.2);
            sign(x + 4, y, 17, w, 20, 'FOR SALE', 'CHOCOLATE CITY', '#8e3442');
        } else if (layout.kind !== 'house') {
            const x = b.x + b.w * .05, y = b.y + b.d * .94, w = b.w * .62;
            for (const u of [.08, .92]) {
                box(x + w * u, y, 0, 2, 2, 46, '#c6b89d', outline);
                box(x + w * u - .5, y - .5, 46, 3, 3, 1, '#e3d4b8', outline);
            }
            sign(x, y, 23, w, 22, '1-4 BEDROOMS', 'AVAILABLE', '#215657');
        }
        function sign(x, y, z, w, h, title, subtitle, color) {
            box(x, y, z, w, 2, h, '#eee3cb', '#34434b');
            const origin = P(x, y + 2, z + h);
            const right = P(x + 1, y + 2, z + h), down = P(x, y + 2, z + h - 1);
            c.save();
            c.transform(right[0] - origin[0], right[1] - origin[1], down[0] - origin[0], down[1] - origin[1], ...origin);
            c.fillStyle = color; c.fillRect(1.5, 1.5, w - 3, h * .55);
            c.fillStyle = '#fff7e6'; c.textAlign = 'center'; c.textBaseline = 'middle';
            c.font = `800 ${layout.kind === 'house' ? 6.5 : 8}px system-ui`;
            c.fillText(title, w / 2, h * .32, w - 6);
            c.fillStyle = '#254047'; c.font = `800 ${layout.kind === 'house' ? 4.2 : 6.5}px system-ui`;
            c.fillText(subtitle, w / 2, h * .80, w - 6);
            for (const u of [3, w - 3]) {
                c.fillStyle = '#697675'; c.fillRect(u, h - 3, 1, 1);
            }
            c.restore();
        }
        if (active) {
            const [sx, sy] = P(b.x + b.w / 2, b.y + b.d, 34 + Math.sin(time * 5) * 3);
            poly([[sx - 7, sy - 10], [sx + 7, sy - 10], [sx, sy]], '#34d399', '#15392d');
        }
    }
    return { plan, draw };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ResidentialArt;
