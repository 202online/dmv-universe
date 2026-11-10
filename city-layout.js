(function (root) {
    'use strict';
    const STEP = 20, HALF = 44, SCALE = 1.6, WORLD = 1600;
    const world = (e, s) => [(s + e) / 2, (s - e) / 2];
    const center = (b, e, s) => {
        const [x, y] = world(e, s);
        b.x = x - b.w / 2; b.y = y - b.d / 2;
    };
    const designs = {
        NW: {
            identity: 'Leafy rowhouse blocks mixed with condos and apartments, U Street culture and park recreation',
            homes: [[-780, 150, 'house'], [-540, 150, 'house'], [-300, 150, 'condo'],
                [300, 150, 'house'], [540, 150, 'condo'], [780, 150, 'apartment']],
            colors: ['#a16c55', '#b49779', '#827e73'],
            districts: [
                { name: 'Uptown Rowhouses', e: -940, s: 40, w: 1880, d: 300, color: '#36543c' },
                { name: 'U Street Arts District', e: -940, s: 1200, w: 1880, d: 650, color: '#3e4144' }
            ]
        },
        NE: {
            identity: 'A mixed house, condo and apartment grid above the market and sports district',
            homes: [[320, 150, 'house'], [560, 150, 'condo'], [800, 150, 'apartment'],
                [320, 490, 'house'], [560, 490, 'apartment'], [800, 490, 'house']],
            colors: ['#b18262', '#a79573', '#99735d'],
            districts: [
                { name: 'Norf Residential Grid', e: 180, s: 40, w: 760, d: 570, color: '#605743' },
                { name: 'Market & Carryout Row', e: -940, s: 1200, w: 930, d: 680, color: '#62503b' }
            ]
        },
        SE: {
            identity: 'Close-set garden apartments mixed with condos and houses beside the library commons',
            homes: [[-800, 1300, 'condo'], [-800, 1690, 'apartment'], [-800 + 168 * Math.SQRT2 / SCALE, 1690, 'apartment'],
                [-280, 1750, 'house'], [320, 1320, 'condo'], [760, 1320, 'apartment']],
            colors: ['#956e5d', '#a27d65', '#87685b'],
            districts: [
                { name: 'Library Commons', e: -940, s: 1210, w: 1880, d: 410, color: '#426752' },
                { name: 'Garden Apartment Courts', e: -940, s: 1630, w: 1880, d: 360, color: '#526b45' }
            ]
        },
        SW: {
            identity: 'Attached waterfront condos, houses and apartments beside the civic and arena district',
            homes: [[-800, 1510, 'condo', true], [-800 + 140 * Math.SQRT2 / SCALE, 1510, 'condo', true],
                [-520, 1870, 'house'], [300, 1860, 'house'], [580, 1860, 'apartment']],
            colors: ['#a69482', '#9c8b7b', '#a5a29a'],
            districts: [
                { name: 'Waterfront Neighborhood', e: -950, s: 1370, w: 230, d: 600, color: '#8a806a' },
                { name: 'Civic & Arena District', e: 160, s: 150, w: 780, d: 650, color: '#56636b' },
                { name: 'Harbor Homes', e: 180, s: 1740, w: 720, d: 240, color: '#647665' }
            ]
        }
    };

    function targets(q) {
        return [...q.buildings, ...q.activities, ...q.neighborhood.buildings];
    }

    function point(b, x, y, inverse = false) {
        if (!b.roadAligned) return [x, y];
        const cx = b.x + b.w / 2, cy = b.y + b.d / 2, dx = x - cx, dy = y - cy;
        return inverse ? [cx + (dx - dy) * Math.SQRT1_2, cy + (dx + dy) * Math.SQRT1_2] :
            [cx + (dx + dy) * Math.SQRT1_2, cy + (dy - dx) * Math.SQRT1_2];
    }

    const footprintCache = new WeakMap();
    function footprint(b) {
        const old = footprintCache.get(b);
        if (old && old.x === b.x && old.y === b.y && old.w === b.w && old.d === b.d && old.aligned === b.roadAligned) return old;
        const corners = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.d], [b.x, b.y + b.d]]
            .map(([x, y]) => point(b, x, y));
        const xs = corners.map(p => p[0]), ys = corners.map(p => p[1]);
        const es = corners.map(([x, y]) => x - y), ss = corners.map(([x, y]) => x + y);
        const result = { x: b.x, y: b.y, w: b.w, d: b.d, aligned: b.roadAligned, corners,
            x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys),
            e0: Math.min(...es), e1: Math.max(...es), s0: Math.min(...ss), s1: Math.max(...ss) };
        footprintCache.set(b, result);
        return result;
    }

    function overlaps(a, b, margin = 0) {
        const A = footprint(a), B = footprint(b), epsilon = 1e-7;
        return A.x0 < B.x1 + margin - epsilon && A.x1 > B.x0 - margin + epsilon &&
            A.y0 < B.y1 + margin - epsilon && A.y1 > B.y0 - margin + epsilon &&
            A.e0 < B.e1 + margin * Math.SQRT2 - epsilon && A.e1 > B.e0 - margin * Math.SQRT2 + epsilon &&
            A.s0 < B.s1 + margin * Math.SQRT2 - epsilon && A.s1 > B.s0 - margin * Math.SQRT2 + epsilon;
    }

    function distanceTo(b, x, y) {
        const [lx, ly] = point(b, x, y, true);
        return Math.hypot(Math.max(b.x - lx, 0, lx - b.x - b.w), Math.max(b.y - ly, 0, ly - b.y - b.d));
    }

    function front(b, offset = 26, u = .5) {
        if (b.garage) return point(b, b.x + b.w + offset, b.y + b.d * u);
        return point(b, b.x + b.w * u, b.y + b.d + offset);
    }

    function polygonsOverlap(a, b) {
        return [a, b].every(polygon => polygon.every(([x, y], i) => {
            const next = polygon[(i + 1) % polygon.length], ax = y - next[1], ay = next[0] - x;
            const A = a.map(([px, py]) => px * ax + py * ay), B = b.map(([px, py]) => px * ax + py * ay);
            return Math.max(...A) > Math.min(...B) + 1e-7 && Math.max(...B) > Math.min(...A) + 1e-7;
        }));
    }

    function nearRoad(q, x, y, margin = 0) {
        const e = x - y, s = x + y;
        return Math.abs(e) <= 120 + margin || Math.abs(s - WORLD) <= 165 + margin ||
            q.neighborhood.streets.some(r => e >= Math.min(r.a[0], r.b[0]) - HALF - margin &&
                e <= Math.max(r.a[0], r.b[0]) + HALF + margin &&
                s >= Math.min(r.a[1], r.b[1]) - HALF - margin &&
                s <= Math.max(r.a[1], r.b[1]) + HALF + margin);
    }

    function intersects(r, b) {
        const e0 = Math.min(r.a[0], r.b[0]) - HALF, e1 = Math.max(r.a[0], r.b[0]) + HALF;
        const s0 = Math.min(r.a[1], r.b[1]) - HALF, s1 = Math.max(r.a[1], r.b[1]) + HALF;
        if (b.roadAligned) {
            const f = footprint(b);
            return e0 < f.e1 - 1e-7 && e1 > f.e0 + 1e-7 && s0 < f.s1 - 1e-7 && s1 > f.s0 + 1e-7;
        }
        // Separating axes for an isometric building and a compass-aligned street.
        return (s0 + e0) / 2 < b.x + b.w && (s1 + e1) / 2 > b.x &&
            (s0 - e1) / 2 < b.y + b.d && (s1 - e0) / 2 > b.y &&
            e0 < b.x + b.w - b.y && e1 > b.x - b.y - b.d &&
            s0 < b.x + b.y + b.w + b.d && s1 > b.x + b.y;
    }

    function connect(q) {
        const objects = targets(q);
        const obstacles = [...objects, ...(q.parkingLot ? [q.parkingLot] : [])];
        const key = (e, s) => `${e},${s}`;
        const network = new Set(), free = new Set();
        const edgeCache = new Map();
        const edgeClear = (a, b) => {
            const ak = key(...a), bk = key(...b), k = ak < bk ? `${ak}/${bk}` : `${bk}/${ak}`;
            if (!edgeCache.has(k)) edgeCache.set(k, !obstacles.some(o => intersects({ a, b }, o)));
            return edgeCache.get(k);
        };
        for (let e = -WORLD + 60; e <= WORLD - 60; e += STEP) {
            for (let s = 60; s <= 2 * WORLD - 60; s += STEP) {
                if (obstacles.some(b => intersects({ a: [e, s], b: [e, s] }, b))) continue;
                const k = key(e, s);
                free.add(k);
                if (Math.abs(e) <= 60 || Math.abs(s - WORLD) <= 100) network.add(k);
            }
        }
        q.neighborhood.streets = [];
        q.roadAccess = [];
        for (const b of objects) {
            // Prefer a front-door approach; other sides serve tightly packed courts.
            const candidates = [
                ...(b.garage ? [[b.x + b.w + 64, b.y + b.d / 2]] : []),
                [b.x + b.w / 2, b.y + b.d + 64],
                [b.x - 64, b.y + b.d / 2],
                [b.x + b.w + 64, b.y + b.d / 2],
                [b.x + b.w / 2, b.y - 64]
            ].map(([x, y]) => point(b, x, y))
                .map(([x, y]) => [Math.round((x - y) / STEP) * STEP, Math.round((x + y) / STEP) * STEP])
                .filter(([e, s]) => free.has(key(e, s)));
            let path;
            for (const start of candidates) {
                const queue = [start], parent = new Map([[key(...start), null]]);
                let end;
                for (let i = 0; i < queue.length; i++) {
                    const p = queue[i], k = key(...p);
                    if (network.has(k)) { end = p; break; }
                    for (const [de, ds] of [[0, -STEP], [STEP, 0], [-STEP, 0], [0, STEP]]) {
                        const next = [p[0] + de, p[1] + ds], nk = key(...next);
                        if (free.has(nk) && !parent.has(nk) && edgeClear(p, next)) { parent.set(nk, p); queue.push(next); }
                    }
                }
                if (!end) continue;
                path = [];
                for (let p = end; p; p = parent.get(key(...p))) path.push(p);
                path.reverse();
                break;
            }
            if (!path) throw new Error(`No street approach for ${b.name || b.kind}`);
            path.forEach(p => network.add(key(...p)));
            if (path.length === 1) q.neighborhood.streets.push({ a: path[0], b: path[0] });
            for (let i = 1; i < path.length; i++) {
                const a = path[i - 1], p = path[i], last = q.neighborhood.streets.at(-1);
                if (i > 1 && last && last.b === a &&
                    (last.a[0] === a[0] && a[0] === p[0] || last.a[1] === a[1] && a[1] === p[1])) last.b = p;
                else q.neighborhood.streets.push({ a, b: p });
            }
            q.roadAccess.push({ building: b, path });
        }
    }

    function apply(id, q) {
        const design = designs[id];
        q.identity = design.identity;
        q.districts = design.districts.map(d => ({ ...d, e: d.e * SCALE, s: d.s * SCALE, w: d.w * SCALE, d: d.d * SCALE }));
        const grounds = { basketball: [150, 140], tennis: [180, 170] };
        for (const activity of q.activities) {
            const size = grounds[activity.type];
            if (size) {
                const e = activity.x + activity.w / 2 - activity.y - activity.d / 2;
                const s = activity.x + activity.w / 2 + activity.y + activity.d / 2;
                [activity.w, activity.d] = size;
                center(activity, e, s);
            }
        }
        const shops = q.neighborhood.buildings.filter(b => ['shop', 'restaurant'].includes(b.kind));
        const availability = new Set();
        q.neighborhood.buildings = design.homes.map(([e, s, kind, terrace = false], i) => {
            const available = kind !== 'house' && i % 2 === 0 && !availability.has(kind);
            if (available) availability.add(kind);
            const b = { name: `${id} ${kind === 'house' ? 'Rowhouse' : kind === 'condo' ? 'Waterfront Home' : 'Garden Apartment'} ${i + 1}`,
                kind, terrace, available, variant: i % 3, type: 'crib',
                w: kind === 'apartment' ? 160 : kind === 'condo' ? 140 : 80,
                d: kind === 'apartment' ? 110 : kind === 'condo' ? 100 : 60,
                h: kind === 'house' ? 78 + i % 3 * 8 : kind === 'apartment' ? 140 + i % 3 * 12 : terrace ? 120 : 120 + i % 3 * 10,
                color: design.colors[i % design.colors.length], trim: '#e3ceb0' };
            center(b, e, s);
            return b;
        }).concat(shops);
        if (id === 'SE') {
            const apartment = q.buildings[0], garage = q.buildings[1];
            center(apartment, 650, 1740);
            garage.w = apartment.w; garage.d = 70; garage.h = 55;
            garage.x = apartment.x; garage.y = apartment.y - garage.d;
        }
        if (id === 'NE') {
            center(shops[0], 560, 1850);
            center(shops[1], 300, 1850);
        }
        for (const b of [...targets(q), ...(q.parkingLot ? [q.parkingLot] : [])]) {
            b.x = (b.x + b.w / 2) * SCALE - b.w / 2;
            b.y = (b.y + b.d / 2) * SCALE - b.d / 2;
            b.roadAligned = true;
        }
        if (id === 'SE') {
            const apartment = q.buildings[0], garage = q.buildings[1];
            const [cx, cy] = point(apartment, apartment.x + apartment.w / 2, apartment.y - garage.d / 2);
            garage.x = cx - garage.w / 2; garage.y = cy - garage.d / 2;
        }
        for (const [type, e, s, w, d] of [['busstop', 165, WORLD + 340, 36, 24], ['metro', -180, WORLD - 300, 48, 36]]) {
            const station = { type, name: `${id} ${type === 'busstop' ? 'Bus Stop' : 'Underground Metro'}`, w, d, h: 48, roadAligned: true };
            center(station, e, s);
            q.buildings.push(station);
        }
        connect(q);
        assignParking(q);
    }
    function assignParking(q) {
        const objects = [...targets(q), ...(q.parkingLot ? [q.parkingLot] : [])];
        q.playerParking = [];
        for (const destination of targets(q).filter(b => !b.privateHome)) {
            const cx = destination.x + destination.w / 2, cy = destination.y + destination.d / 2;
            const candidates = [];
            for (let dx = -220; dx <= destination.w + 220; dx += 20)
                for (let dy = -220; dy <= destination.d + 220; dy += 20) {
                    const bay = { x: destination.x + dx, y: destination.y + dy, w: 40, d: 26, destination, roadAligned: true };
                    const ex = bay.x + bay.w / 2, ey = bay.y + bay.d / 2;
                    const corners = footprint(bay).corners;
                    if (corners.some(([x, y]) => Math.abs(x - y) > WORLD - 20 || x + y < 20 || x + y > 2 * WORLD - 20)) continue;
                    const bounds = footprint(bay);
                    if (!(bounds.e1 < -125 || bounds.e0 > 125) ||
                        !(bounds.s1 < WORLD - 170 || bounds.s0 > WORLD + 170)) continue;
                    if ([...objects, ...q.playerParking].some(b => overlaps(bay, b, 5))) continue;
                    if (q.neighborhood.streets.some(r => intersects(r, bay))) continue;
                    if (!nearRoad(q, ex, ey, 70)) continue;
                    candidates.push({ bay, distance: Math.hypot(ex - cx, ey - cy) });
                }
            candidates.sort((a, b) => a.distance - b.distance);
            if (!candidates.length) throw new Error(`No player parking space for ${destination.name || destination.kind}`);
            q.playerParking.push(candidates[0].bay);
        }
    }

    const api = { apply, targets, nearRoad, intersects, designs, point, footprint, overlaps, distanceTo, front, polygonsOverlap,
        halfWidth: HALF, world: WORLD, scale: SCALE };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.CityLayout = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
