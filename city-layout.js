(function (root) {
    'use strict';
    const STEP = 20, HALF = 44;
    const world = (e, s) => [(s + e) / 2, (s - e) / 2];
    const center = (b, e, s) => {
        const [x, y] = world(e, s);
        b.x = x - b.w / 2; b.y = y - b.d / 2;
    };
    const designs = {
        NW: {
            identity: 'Leafy rowhouse blocks, U Street culture and park recreation',
            homes: [-780, -540, -300, 300, 540, 780].map(e => [e, 150]),
            kind: 'house', colors: ['#a16c55', '#b49779', '#827e73'],
            districts: [
                { name: 'Uptown Rowhouses', e: -940, s: 40, w: 1880, d: 300, color: '#36543c' },
                { name: 'U Street Arts District', e: -940, s: 1200, w: 1880, d: 650, color: '#3e4144' }
            ]
        },
        NE: {
            identity: 'Residential grid above the market, food strip and sports district',
            homes: [150, 490].flatMap(s => [320, 560, 800].map(e => [e, s])),
            kind: 'house', colors: ['#b18262', '#a79573', '#99735d'],
            districts: [
                { name: 'Norf Residential Grid', e: 180, s: 40, w: 760, d: 570, color: '#605743' },
                { name: 'Market & Carryout Row', e: -940, s: 1200, w: 930, d: 680, color: '#62503b' }
            ]
        },
        SE: {
            identity: 'Garden-apartment courts, library commons and community recreation',
            homes: [[-800, 1300], [-800, 1690], [-280, 1750], [-600, 1850], [320, 1320], [760, 1320]],
            kind: 'apartment', colors: ['#956e5d', '#a27d65', '#87685b'],
            districts: [
                { name: 'Library Commons', e: -940, s: 1210, w: 1880, d: 410, color: '#426752' },
                { name: 'Garden Apartment Courts', e: -940, s: 1630, w: 1880, d: 360, color: '#526b45' }
            ]
        },
        SW: {
            identity: 'Waterfront homes and promenade beside the civic and arena district',
            homes: [[-800, 1510], [-800, 1760], [-520, 1870], [300, 1860], [580, 1860]],
            kind: 'condo', colors: ['#a69482', '#9c8b7b', '#a5a29a'],
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

    function nearRoad(q, x, y, margin = 0) {
        const e = x - y, s = x + y;
        return Math.abs(e) <= 120 + margin || Math.abs(s - 1000) <= 165 + margin ||
            q.neighborhood.streets.some(r => e >= Math.min(r.a[0], r.b[0]) - HALF - margin &&
                e <= Math.max(r.a[0], r.b[0]) + HALF + margin &&
                s >= Math.min(r.a[1], r.b[1]) - HALF - margin &&
                s <= Math.max(r.a[1], r.b[1]) + HALF + margin);
    }

    function intersects(r, b) {
        const e0 = Math.min(r.a[0], r.b[0]) - HALF, e1 = Math.max(r.a[0], r.b[0]) + HALF;
        const s0 = Math.min(r.a[1], r.b[1]) - HALF, s1 = Math.max(r.a[1], r.b[1]) + HALF;
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
        for (let e = -940; e <= 940; e += STEP) {
            for (let s = 60; s <= 1940; s += STEP) {
                const [x, y] = world(e, s);
                if (obstacles.some(b => Math.max(b.x - x, 0, x - b.x - b.w) +
                    Math.max(b.y - y, 0, y - b.y - b.d) < HALF)) continue;
                const k = key(e, s);
                free.add(k);
                if (Math.abs(e) <= 60 || Math.abs(s - 1000) <= 100) network.add(k);
            }
        }
        q.neighborhood.streets = [];
        q.roadAccess = [];
        for (const b of objects) {
            // Prefer a front-door approach; other sides serve tightly packed courts.
            const candidates = [
                [b.x + b.w / 2, b.y + b.d + 64],
                [b.x - 64, b.y + b.d / 2],
                [b.x + b.w + 64, b.y + b.d / 2],
                [b.x + b.w / 2, b.y - 64]
            ].map(([x, y]) => [Math.round((x - y) / STEP) * STEP, Math.round((x + y) / STEP) * STEP])
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
        q.districts = design.districts;
        const shops = q.neighborhood.buildings.filter(b => ['shop', 'restaurant'].includes(b.kind));
        q.neighborhood.buildings = design.homes.map(([e, s], i) => {
            const b = { name: `${id} ${design.kind === 'house' ? 'Rowhouse' : design.kind === 'condo' ? 'Waterfront Home' : 'Garden Apartment'} ${i + 1}`,
                kind: design.kind, variant: i % 3, type: 'crib',
                w: design.kind === 'apartment' ? 160 : design.kind === 'condo' ? 140 : 80,
                d: design.kind === 'apartment' ? 110 : design.kind === 'condo' ? 100 : 60,
                h: design.kind === 'house' ? 78 + i % 3 * 8 : design.kind === 'apartment' ? 140 + i % 3 * 12 : 120 + i % 3 * 10,
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
        connect(q);
    }

    const api = { apply, targets, nearRoad, intersects, designs, halfWidth: HALF };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.CityLayout = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
