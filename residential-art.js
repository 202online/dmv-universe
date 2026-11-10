'use strict';

const ResidentialArt = (() => {
    const vehicles = typeof module !== 'undefined' && module.exports ? require('./vehicle-art.js') : VehicleArt;
    const grassColor = (typeof module !== 'undefined' && module.exports ? require('./city-layout.js') : CityLayout).grassColor;
    function listing(b) {
        const kind = b.kind || b.style, variant = b.variant ?? (b.kind ? 0 : 1);
        if (b.garage || !['house', 'apartment', 'condo'].includes(kind)) return null;
        if (kind === 'house') return variant !== 1 ? 'FOR SALE' : null;
        return (b.available ?? variant === 0) ? 'AVAILABLE' : null;
    }
    function plan(b) {
        const kind = b.kind || b.style;
        if (!['house', 'apartment', 'condo'].includes(kind)) throw new Error('Unknown residential kind');
        const variant = b.variant ?? (b.kind ? 0 : 1);
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
        if (kind === 'house') for (const p of parts) {
            p.x = b.x + b.w * .10 + (p.x - b.x) * .78; p.w *= .78;
            p.y = b.y + b.d * .08 + (p.y - b.y) * .65; p.d *= .65;
        }
        if (kind === 'apartment') for (const p of parts) {
            p.y = b.y + (p.y - b.y) * .84; p.d *= .84;
        }
        const garden = kind === 'apartment' ?
            { x: b.x + b.w * .04, y: b.y + b.d * .56, w: b.w * .14, d: b.d * .34 } : null;
        const parking = kind === 'apartment' ?
            { x: b.x + b.w * .40, y: b.y + b.d * .48, w: b.w * .56, d: b.d * .50, spaces: 4 } :
            terrace ? { x: b.x + b.w * .30, y: b.y + b.d * .66, w: b.w * .66, d: b.d * .32, spaces: 2 } :
            { x: b.x + b.w * (kind === 'house' ? .74 : .78), y: b.y + b.d * (kind === 'house' ? .10 : .04),
                w: b.w * (kind === 'house' ? .22 : .20), d: b.d * (kind === 'house' ? .73 : .94), spaces: 1 };
        const entrancePart = parts.filter(p => !p.z).sort((a, c) => c.y + c.d - a.y - a.d)[0];
        const doorX = kind === 'apartment' ? b.x + b.w * .30 :
            terrace ? b.x + b.w * .16 : entrancePart.x + entrancePart.w * .5;
        const door = { x: doorX, y: entrancePart.y + entrancePart.d, w: Math.min(16, entrancePart.w * .4), h: 28 };
        const path = { x: door.x - 10, y: door.y, w: 20, d: b.y + b.d - door.y };
        const bays = [];
        if (kind === 'apartment') {
            const slot = parking.w / parking.spaces;
            for (let i = 0; i < parking.spaces; i++)
                bays.push({ x: parking.x + slot * i + (slot - 20) / 2, y: parking.y + 2, w: 20, d: 36, heading: [0, 1] });
        } else if (terrace) {
            for (let i = 0; i < parking.spaces; i++)
                bays.push({ x: parking.x + parking.w / parking.spaces * i + 2, y: parking.y + 2, w: 40, d: 22, heading: [1, 0] });
        } else {
            const width = Math.min(20, parking.w);
            bays.push({ x: parking.x + (parking.w - width) / 2, y: parking.y + parking.d - 38, w: width, d: 36, heading: [0, 1] });
        }
        // Reserve the entrance-side spaces for real player vehicles.
        const decorativeCars = kind === 'apartment' ? bays.slice(2).map((bay, i) => ({
            ...vehicles.sizes.car, x: bay.x + bay.w / 2 - vehicles.sizes.car.w / 2,
            y: bay.y + bay.d / 2 - vehicles.sizes.car.d / 2, heading: bay.heading, color: ['#63879a', '#923d4b'][i]
        })) : [];
        const available = b.available ?? variant === 0;
        return { kind, variant, terrace, parts, door, path, bays, decorativeCars,
            available, listed: listing(b) !== null, garden, parking };
    }
    function draw(b, { ctx: c, P, poly, box, shade, entrances = [] }, active = false, time = 0) {
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
        plane(b.x, b.y, b.w, b.d, 0, grassColor);
        if (entrances.length) {
            c.save();
            plane(b.x,b.y,b.w,b.d,0,null,null); c.clip();
            for (const entrance of entrances) poly(entrance.map(p=>P(...p)), '#2e3340');
            c.restore();
        }
        const lot = layout.parking;
        plane(lot.x, lot.y, lot.w, lot.d, .3, '#2e3340');
        for (let y = lot.y + 9; y < lot.y + lot.d - 2; y += 14)
            line([[lot.x + 1, y, .35], [lot.x + lot.w - 1, y, .35]], '#29313b25', .6);
        for (let x = lot.x + 12; x < lot.x + lot.w - 2; x += 22)
            line([[x, lot.y + 1, .35], [x, lot.y + lot.d - 1, .35]], '#d8d1b32b', .6);
        const drainX = lot.x + lot.w - 5, drainY = lot.y + lot.d - 6;
        plane(drainX, drainY, 4, 5, .45, '#35434a', '#83918b', .5);
        for (let i = 1; i < 4; i++)
            line([[drainX + .5, drainY + i, .5], [drainX + 3.5, drainY + i, .5]], '#a2aca1', .5);
        for (const [i, bay] of layout.bays.entries()) {
            plane(bay.x, bay.y, bay.w, bay.d, .6, null, '#d6d5ca', 1.2);
            if (layout.kind !== 'house') {
                const vertical = Math.abs(bay.heading[1]) > Math.abs(bay.heading[0]);
                const stop = vertical ?
                    { x: bay.x + 3, y: bay.y + 2, w: bay.w - 6, d: 1.5 } :
                    { x: bay.x + 2, y: bay.y + 3, w: 1.5, d: bay.d - 6 };
                plane(stop.x, stop.y, stop.w, stop.d, .8, '#d6c69b', '#84795f', .5);
            }
            if (i < (layout.kind === 'apartment' ? 2 : layout.bays.length)) {
                const [sx, sy] = P(bay.x + bay.w / 2, bay.y + bay.d / 2, .7);
                c.save(); c.font = 'bold 10px system-ui'; c.fillStyle = '#e2e8d8'; c.textAlign = 'center';
                c.fillText('P', sx, sy); c.restore();
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
            if (p === layout.parts.find(part => !part.z && Math.abs(part.y + part.d - layout.door.y) < 1e-7)) {
                const door = layout.door;
                front(p, (door.x - door.w / 2 - p.x) / p.w, (door.x + door.w / 2 - p.x) / p.w, 0, door.h, '#343d42', trim, 1.5);
            }
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
                const depth = Math.min(b.d * .10, (layout.kind === 'apartment' || layout.terrace ? lot.y - 2 : b.y + b.d * .98) - p.y - p.d);
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
            plane(g.x + 2, g.y + wallDepth, g.w - 4, g.d - wallDepth - 2, 1, '#286878');
            plane(g.x + 3, g.y + wallDepth + 1, g.w - 6, g.d - wallDepth - 4, 1.05, '#3f98a8');
            plane(g.x + 4, g.y + wallDepth + 2, Math.max(1, g.w * .22), g.d - wallDepth - 6, 1.1, '#70bbba66');
            for (let i = 0; i < 7; i++) {
                const y = g.y + wallDepth + 2 + i * (g.d - wallDepth - 5) / 7;
                const offset = Math.sin(time * 1.7 + i * 2.1) * .8;
                line([[g.x + 3 + offset, y, 1.2], [g.x + g.w * .55, y + .5, 1.2],
                    [g.x + g.w - 3 + offset, y, 1.2]], i % 2 ? '#a9e3dd88' : '#1f778c99', .6);
            }
            for (let i = 0; i < 4; i++) {
                const phase = (time*.45+i*.25)%1, radius = .6+phase*2;
                const cx = g.x+g.w*(.35+i*.10), cy = g.y+wallDepth+3;
                poly(Array.from({length:16},(_,k)=>{
                    const angle=k*Math.PI/8;
                    return P(cx+Math.cos(angle)*radius,cy+Math.sin(angle)*radius*.55,1.25);
                }),null,`rgba(216,247,233,${((1-phase)*.55).toFixed(3)})`,.6);
            }
            front({ x: g.x, y: g.y, w: g.w, d: wallDepth + .1 }, .22, .78, 2, height - 2, '#69c5d6');
            for (let i = 0; i < 4; i++) {
                const z = 3 + ((time * 9 + i * 4) % 16);
                front({ x: g.x, y: g.y, w: g.w, d: wallDepth + .2 }, .29, .71, z, z + 1, '#c5f2eb');
            }
            box(g.x, g.y + g.d - 2, 0, g.w, 2, 4, '#a0a997', outline);
            for (const x of [g.x, g.x + g.w - 2]) box(x, g.y + wallDepth, 0, 2, g.d - wallDepth, 4, '#919e8d');
            for (let x = g.x + 5; x < g.x + g.w - 2; x += 6)
                line([[x, g.y + g.d - 2, 4.1], [x, g.y + g.d, 4.1]], '#64766e', .7);
            for (let y = g.y + wallDepth + 4; y < g.y + g.d - 2; y += 6)
                for (const x of [g.x, g.x + g.w - 2])
                    line([[x, y, 4.1], [x + 2, y, 4.1]], '#64766e', .7);
            for (let i = 0; i < 5; i++) {
                const x = g.x + g.w * (.3 + i * .1), y = g.y + wallDepth + 1 + (i % 2);
                line([[x - .6, y, 1.3], [x + .6, y, 1.3]], '#e0faf0', 1.2);
            }
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
        for (const car of layout.decorativeCars)
            vehicles.draw({ ...car, kind: 'car', trim: '#d3d9d4' }, { ctx: c, P, poly, shade });
        if (layout.kind === 'house' && layout.listed) {
            const x = b.x + b.w * .04, y = b.y + b.d * .94, w = b.w * .16;
            box(x, y, 0, 2, 2, 43, '#f0e5cf', outline);
            box(x, y, 41, w + 4, 2, 2, '#f0e5cf', outline);
            for (const u of [.22, .83])
                line([[x + w * u, y + 1, 41], [x + w * u, y + 1, 37]], '#687076', 1.2);
            sign(x + 4, y, 17, w, 20, 'FOR SALE', 'CHOCOLATE CITY', '#8e3442', { ctx: c, P, box }, true);
        } else if (layout.kind !== 'house' && layout.listed) {
            const apartment = layout.kind === 'apartment';
            const x = b.x + b.w * (apartment || layout.terrace ? .40 : .38), y = b.y + b.d * (apartment ? .46 : layout.terrace ? .60 : .94);
            const w = b.w * (apartment || layout.terrace ? .55 : .30);
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
        // The parking deck is open to the sky; only the service wing has a roof.
        box(b.x, b.y, 0, b.w - 100, b.d, b.h, b.color, '#34434b');
        box(b.x + b.w - 100, b.y, 0, 100, 2, 7, b.color, '#34434b');
        box(b.x + b.w - 2, b.y, 0, 2, b.d, 7, b.color, '#34434b');
        poly([P(b.x, b.y, b.h), P(b.x + b.w-100, b.y, b.h),
            P(b.x + b.w-100, b.y + b.d, b.h), P(b.x, b.y + b.d, b.h)], '#718184', b.trim, 2);
        sign(b.x+3, b.y+b.d-2, b.h*.48, b.w-106, 18,
            'PARK HERE', 'GARAGE', '#215657', env);
        if (active) {
            const [sx, sy] = P(b.x+b.w-72, b.y+b.d, 24 + Math.sin(time * 5) * 3);
            poly([[sx - 7, sy - 10], [sx + 7, sy - 10], [sx, sy]], '#34d399', '#15392d');
        }
    }
    return { plan, listing, draw, drawGarage, grassColor };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ResidentialArt;
