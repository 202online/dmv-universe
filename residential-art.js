'use strict';

const ResidentialArt = (() => {
    const vehicles = typeof module !== 'undefined' && module.exports ? require('./vehicle-art.js') : VehicleArt;
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
            [[.04, .04, .92, .48, 0, 1, 'flat']],
            [[0, 0, 1, .52, 0, .78, 'flat'], [.14, .10, .72, .32, .78, .22, 'flat']],
            [[.04, .04, .42, .48, 0, 1, 'flat'], [.54, .04, .42, .42, 0, .82, 'flat']]
        ][variant];
        const terrace = kind === 'condo' && b.terrace === true;
        if (terrace) pieces = [[0, .04, 1, .52, 0, 1, 'flat']];
        const parts = pieces.map(([x, y, w, d, z, h, roof]) => ({
            x: b.x + x * b.w, y: b.y + y * b.d, w: w * b.w, d: d * b.d, z: z * b.h, h: h * b.h, roof
        }));
        return { kind, variant, terrace, parts, available: b.available ?? variant === 0, garden: kind === 'apartment' ?
            { x: b.x + b.w * .04, y: b.y + b.d * .56, w: b.w * .16, d: b.d * .34 } : null,
            parking: kind === 'apartment' ?
            { x: b.x + b.w * .24, y: b.y + b.d * .56, w: b.w * .72, d: b.d * .40, spaces: [6, 4, 5][variant] } :
            terrace ? { x: b.x + b.w * .04, y: b.y + b.d * .66, w: b.w * .92, d: b.d * .30, spaces: 4 } :
            { x: b.x + b.w * .78, y: b.y + b.d * .04, w: b.w * .18, d: b.d * .92 } };
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
        const parkedCars = [];
        if (layout.kind === 'apartment') {
            const count = lot.spaces, slot = lot.w / count;
            for (let i = 0; i <= count; i++) {
                const x = lot.x + slot * i;
                line([[x, lot.y, .6], [x, lot.y + lot.d * .66, .6]], '#efe1ad', 1.2);
                if (i < count) box(x + slot * .20, lot.y + 1, .6, slot * .60, 1.5, 1, '#b8bcb6');
            }
            line([[lot.x, lot.y + lot.d * .92, .6], [lot.x + lot.w, lot.y + lot.d * .92, .6]], '#d7dfdc');
            for (const [i, color] of [[0, '#63879a'], [2, '#923d4b'], [count - 1, '#c6b38d']])
                parkedCars.push([lot.x + slot * (i + .5), lot.y + vehicles.sizes.car.w / 2 + 1, color]);
        } else {
            if (layout.terrace) box(lot.x, lot.y - 3, 0, lot.w, 2, 1, '#d0c8b3');
            else box(lot.x - 3, lot.y, 0, 2, lot.d, 1, '#d0c8b3');
            if (layout.terrace) {
                const slot = lot.w / lot.spaces;
                for (let i = 0; i <= lot.spaces; i++)
                    line([[lot.x + slot * i, lot.y, .6], [lot.x + slot * i, lot.y + lot.d, .6]], '#efe1ad', 1.2);
                for (let i = 0; i < lot.spaces; i++)
                    box(lot.x + slot * (i + .2), lot.y + 1, .6, slot * .6, 1.5, 1, '#b8bcb6');
            } else for (let i = 1; i < 5; i++)
                line([[lot.x, lot.y + lot.d * i / 5, .6], [lot.x + lot.w, lot.y + lot.d * i / 5, .6]], '#827e70');
            if (layout.variant === 1 && !layout.terrace) {
                const gx = lot.x, gy = lot.y;
                box(gx, gy, 0, lot.w, lot.d * .31, b.h * .24, b.color, outline);
                const garage = { x: gx, y: gy, w: lot.w, d: lot.d * .31 };
                front(garage, .10, .90, 1, b.h * .20, '#56636c', trim);
                for (let z = 4; z < b.h * .20; z += 5) front(garage, .10, .90, z, z + .7, '#c0c6c3');
            }
            if (layout.variant === 1 || layout.kind === 'condo' && layout.variant === 2)
                parkedCars.push([lot.x + lot.w * (layout.terrace ? .625 : .5), lot.y + lot.d - vehicles.sizes.car.w / 2 - 1, '#8b3344']);
        }
        function parkedCar(cx, cy, color) {
            const size = vehicles.sizes.car;
            vehicles.draw({ ...size, x: cx - size.w / 2, y: cy - size.d / 2, heading: [0, 1], kind: 'car', color, trim: '#d3d9d4' },
                { ctx: c, P, poly, shade });
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
                const depth = Math.min(b.d * .10, (layout.terrace ? lot.y - 2 : b.y + b.d * .98) - p.y - p.d);
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
        if (layout.garden) {
            const g = layout.garden, wallDepth = 3, height = 22;
            plane(g.x, g.y, g.w, g.d, .4, '#607f58', '#a6aa8a');
            box(g.x, g.y, 0, g.w, wallDepth, height, '#6d7f80', outline);
            for (let z = 5; z < height; z += 6)
                front({ x: g.x, y: g.y, w: g.w, d: wallDepth }, .04, .96, z, z + .8, '#b1b8aa');
            plane(g.x + 2, g.y + wallDepth, g.w - 4, g.d - wallDepth - 2, 1, '#4fa6b6');
            front({ x: g.x, y: g.y, w: g.w, d: wallDepth + .1 }, .22, .78, 2, height - 2, '#69c5d6');
            for (let i = 0; i < 4; i++) {
                const z = 3 + ((time * 9 + i * 4) % 16);
                front({ x: g.x, y: g.y, w: g.w, d: wallDepth + .2 }, .29, .71, z, z + 1, '#c5f2eb');
            }
            box(g.x, g.y + g.d - 2, 0, g.w, 2, 4, '#a0a997', outline);
            for (const x of [g.x, g.x + g.w - 2]) box(x, g.y + wallDepth, 0, 2, g.d - wallDepth, 4, '#919e8d');
            for (const u of [.15, .55, .82])
                line([[g.x + g.w * u, g.y + g.d * .65, 1.2], [g.x + g.w * Math.min(.95, u + .12), g.y + g.d * .65, 1.2]], '#b6e4de');
            for (const x of [g.x + 1, g.x + g.w - 4]) {
                box(x, g.y + g.d - 5, 0, 3, 3, 4, '#a07854');
                box(x, g.y + g.d - 5, 4, 3, 3, 4, '#4d814d');
                box(x + 1, g.y + g.d - 4, 8, 1, 1, 1, '#e6c876');
            }
        }
        if (layout.kind === 'house' && layout.variant === 2) {
            const p = layout.parts[0], z = p.z + p.h * .52;
            plane(p.x + p.w * .1, p.y + p.d, p.w * .8, b.d * .14, z, '#9d8260', trim);
            for (const u of [.12, .88]) box(p.x + p.w * u, p.y + p.d + b.d * .1, 0, 2, 2, z, '#d6c6a3');
        }
        for (const car of parkedCars) parkedCar(...car);
        if (layout.kind === 'house' && layout.variant !== 1) {
            const x = b.x + b.w * .06, y = b.y + b.d * .91, w = b.w * .50;
            box(x, y, 0, 2, 2, 43, '#f0e5cf', outline);
            box(x, y, 41, w + 4, 2, 2, '#f0e5cf', outline);
            for (const u of [.22, .83])
                line([[x + w * u, y + 1, 41], [x + w * u, y + 1, 37]], '#687076', 1.2);
            sign(x + 4, y, 17, w, 20, 'FOR SALE', 'CHOCOLATE CITY', '#8e3442', { ctx: c, P, box }, true);
        } else if (layout.kind !== 'house' && layout.available) {
            const apartment = layout.kind === 'apartment';
            const x = b.x + b.w * (apartment ? .24 : .05), y = b.y + b.d * (apartment ? .54 : layout.terrace ? .60 : .94);
            const w = b.w * (apartment ? .68 : .62);
            for (const u of [.08, .92]) {
                box(x + w * u, y, 0, 2, 2, 46, '#c6b89d', outline);
                box(x + w * u - .5, y - .5, 46, 3, 3, 1, '#e3d4b8', outline);
            }
            sign(x, y, 23, w, 22, apartment ? '1-4 BEDROOMS' : 'AVAILABLE CONDOS',
                apartment ? 'AVAILABLE' : 'INQUIRE WITHIN', '#215657', { ctx: c, P, box });
        }
        if (active) {
            const [sx, sy] = P(b.x + b.w / 2, b.y + b.d, 34 + Math.sin(time * 5) * 3);
            poly([[sx - 7, sy - 10], [sx + 7, sy - 10], [sx, sy]], '#34d399', '#15392d');
        }
    }
    function sign(x, y, z, w, h, title, subtitle, color, { ctx: c, P, box }, small = false, side = false) {
        box(side ? x - 2 : x, y, z, side ? 2 : w, side ? w : 2, h, '#eee3cb', '#34434b');
        const origin = side ? P(x, y + w, z + h) : P(x, y + 2, z + h);
        const right = side ? P(x, y + w - 1, z + h) : P(x + 1, y + 2, z + h);
        const down = side ? P(x, y + w, z + h - 1) : P(x, y + 2, z + h - 1);
        c.save();
        c.transform(right[0] - origin[0], right[1] - origin[1], down[0] - origin[0], down[1] - origin[1], ...origin);
        c.fillStyle = color; c.fillRect(1.5, 1.5, w - 3, h * .55);
        c.fillStyle = '#fff7e6'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = `800 ${small ? 6.5 : 8}px system-ui`;
        c.fillText(title, w / 2, h * .32, w - 6);
        c.fillStyle = '#254047'; c.font = `800 ${small ? 4.2 : 6.5}px system-ui`;
        c.fillText(subtitle, w / 2, h * .80, w - 6);
        for (const u of [3, w - 3]) {
            c.fillStyle = '#697675'; c.fillRect(u, h - 3, 1, 1);
        }
        c.restore();
    }
    function drawGarage(b, env, active = false, time = 0) {
        const { P, poly, box } = env;
        box(b.x, b.y, 0, b.w, b.d, b.h, b.color, '#34434b');
        poly([P(b.x, b.y, b.h), P(b.x + b.w, b.y, b.h),
            P(b.x + b.w, b.y + b.d, b.h), P(b.x, b.y + b.d, b.h)], '#718184', b.trim, 2);
        const side = (u0, u1, z0, z1, color) =>
            poly([P(b.x + b.w, b.y + b.d * u0, z0), P(b.x + b.w, b.y + b.d * u1, z0),
                P(b.x + b.w, b.y + b.d * u1, z1), P(b.x + b.w, b.y + b.d * u0, z1)], color, b.trim);
        for (const u of [.08, .39, .70]) {
            side(u, u + .23, 0, b.h * .52, '#425965');
            for (let z = 4; z < b.h * .52; z += 5) side(u, u + .23, z, z + .6, '#a7b5b4');
        }
        sign(b.x + b.w, b.y + b.d * .10, b.h * .62, b.d * .80, 18,
            'PARK HERE', 'GARAGE', '#215657', env, false, true);
        if (active) {
            const [sx, sy] = P(b.x + b.w, b.y + b.d / 2, b.h + 12 + Math.sin(time * 5) * 3);
            poly([[sx - 7, sy - 10], [sx + 7, sy - 10], [sx, sy]], '#34d399', '#15392d');
        }
    }
    return { plan, draw, drawGarage };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ResidentialArt;
