(function (root) {
    'use strict';
    const STEP = 20, ROAD = 44, HALF = 76, SCALE = 1.6, WORLD = 1600;
    const projection = Object.freeze({ x: .87, y: .5 });
    const grassColor = '#55754c';
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
                { name: 'Uptown Rowhouses', e: -940, s: 40, w: 1880, d: 300, color: grassColor, grass: true },
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
                [-280, 1750, 'house'], [320, 1320, 'condo'], [760, 1320, 'apartment'], [-80, 1750, 'house']],
            colors: ['#956e5d', '#a27d65', '#87685b'],
            districts: [
                { name: 'Library Commons', e: -940, s: 1210, w: 1880, d: 410, color: grassColor, grass: true },
                { name: 'Garden Apartment Courts', e: -940, s: 1630, w: 1880, d: 360, color: grassColor, grass: true }
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
                { name: 'Harbor Homes', e: 180, s: 1740, w: 720, d: 240, color: grassColor, grass: true }
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
        if (b.garage) return point(b, b.x + b.w - 72, b.y + b.d + offset);
        return point(b, b.x + b.w * u, b.y + b.d + offset);
    }

    function residentialPlan(b) {
        if (b.garage || !['house', 'condo', 'apartment'].includes(b.kind || b.style)) return null;
        const art = typeof module !== 'undefined' && module.exports ? require('./residential-art.js') : ResidentialArt;
        return art.plan({ ...b, variant: b.variant ?? 1 });
    }

    // Child rectangles rotate around the property's centre, not their own local centre.
    function region(b, r) {
        const [cx, cy] = point(b, r.x + r.w / 2, r.y + r.d / 2);
        const heading = r.heading && (b.roadAligned ?
            [(r.heading[0] + r.heading[1]) * Math.SQRT1_2, (r.heading[1] - r.heading[0]) * Math.SQRT1_2] : [...r.heading]);
        return { ...r, x: cx - r.w / 2, y: cy - r.d / 2, roadAligned: b.roadAligned, ...(heading ? { heading } : {}) };
    }

    function vehicleCorners(cx, cy, heading, vehicle) {
        const [fx, fy] = heading, sx = -fy, sy = fx;
        return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([f, s]) =>
            [cx + f * vehicle.w / 2 * fx + s * vehicle.d / 2 * sx,
                cy + f * vehicle.w / 2 * fy + s * vehicle.d / 2 * sy]);
    }

    function contains(area, corners, margin = 0) {
        return corners.every(([x, y]) => {
            const [lx, ly] = point(area, x, y, true);
            return lx >= area.x + margin - 1e-7 && lx <= area.x + area.w - margin + 1e-7 &&
                ly >= area.y + margin - 1e-7 && ly <= area.y + area.d - margin + 1e-7;
        });
    }

    function buildingSolids(b) {
        const layout = residentialPlan(b);
        if (!layout) return [footprint(b)];
        return [...layout.parts.filter(p => !p.z), ...(layout.garden ? [layout.garden] : [])]
            .map(r => footprint(region(b, r))).concat(layout.decorativeCars.map(car => ({
                corners: vehicleCorners(...point(b, car.x + car.w / 2, car.y + car.d / 2), region(b, car).heading, car)
            })));
    }

    function compassArea(e0,e1,s0,s1) {
        const [x,y]=world((e0+e1)/2,(s0+s1)/2),w=(e1-e0)*Math.SQRT1_2,d=(s1-s0)*Math.SQRT1_2;
        return {x:x-w/2,y:y-d/2,w,d,roadAligned:true};
    }

    function visualSolids(b) {
        if(!b.h) return [];
        const layout=residentialPlan(b);
        const parts=layout ? layout.parts : b.garage ?
            [{x:b.x,y:b.y,w:b.w-100,d:b.d,h:b.h,z:0}] : [{...b,z:0}];
        return parts.map(part=>{
            const bounds=footprint(region(b,part));
            const roof=part.roof==='gable'||part.roof==='hip'?18:12;
            // Screen height projects north by height / KY in compass coordinates.
            return compassArea(bounds.e0,bounds.e1,bounds.s0-(part.h+(part.z||0)+roof)/projection.y,bounds.s1);
        });
    }

    function arrangeSightlines(q) {
        const objects=targets(q),groups=[];
        const garage=objects.find(b=>b.garage),apartment=garage && objects.find(b=>b.style==='apartment');
        for(const b of objects) {
            if(groups.some(g=>g.includes(b))) continue;
            const group=[b],f=footprint(b);
            for(const other of objects) {
                if(other===b || groups.some(g=>g.includes(other))) continue;
                const g=footprint(other);
                if((b.kind==='house' && other.kind==='house') ||
                    (b===apartment && other===garage) || (b===garage && other===apartment) ||
                    (b.type==='crib' && other.type==='crib' && !b.garage && !other.garage &&
                    Math.abs(f.s0-g.s0)<1 && Math.min(Math.abs(f.e1-g.e0),Math.abs(g.e1-f.e0))<14))
                    group.push(other);
            }
            groups.push(group);
        }
        const reserved=q.parkingLot?[q.parkingLot]:[];
        const mainRoads=[compassArea(-HALF-12,HALF+12,0,2*WORLD),compassArea(-WORLD,WORLD,WORLD-HALF-12,WORLD+HALF+12)];
        const offsets=[];
        for(let de=-1000;de<=1000;de+=20) for(let ds=-1000;ds<=1000;ds+=20)
            offsets.push({de,ds,distance:de*de+ds*ds});
        offsets.sort((a,b)=>a.distance-b.distance);
        for(const group of groups) {
            const original=group.map(b=>[b.x,b.y]);
            let placed=false;
            for(const {de,ds} of offsets) {
                const [dx,dy]=world(de,ds);
                group.forEach((b,i)=>{b.x=original[i][0]+dx;b.y=original[i][1]+dy;});
                const surfaces=group.flatMap(b=>[b,...visualSolids(b)]);
                const lots=group.filter(b=>!residentialPlan(b) && !b.garage && b.type!=='busstop').map(b=>{
                    const lot=region(b,{x:b.x+b.w,y:b.y+b.d-140,w:90,d:140});
                    return {building:b,lot};
                });
                surfaces.push(...lots.map(a=>a.lot));
                const frontages=group.map(b=>region(b,{x:b.x,y:b.y+b.d,
                    w:b.w+(!residentialPlan(b)&&!b.garage&&b.type!=='busstop'?90:0),d:160}));
                if(surfaces.some(s=>{
                    const f=footprint(s);
                    return f.e0<-WORLD+8 || f.e1>WORLD-8 || f.s0<8 || f.s1>2*WORLD-8 ||
                        mainRoads.some(r=>overlaps(r,s)) || reserved.some(r=>overlaps(r,s,12));
                }) || frontages.some(s=>{
                    const f=footprint(s);
                    return f.e0<-WORLD+8 || f.e1>WORLD-8 || f.s1>2*WORLD-8 ||
                        reserved.some(r=>overlaps(r,s,12));
                })) continue;
                reserved.push(...surfaces,...frontages);
                for(const {building,lot} of lots) building.siteParking=lot;
                if(group[0].kind==='house') for(const yard of q.houseYards||[]) {yard.x+=dx;yard.y+=dy;}
                placed=true;break;
            }
            if(!placed) throw new Error(`No unobscured block for ${group[0].name || group[0].type || group[0].kind}`);
        }
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
        return streetBounds(q,margin).some(r=>e>=r.e0 && e<=r.e1 && s>=r.s0 && s<=r.s1);
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
        const parking=[...objects.filter(b=>b.siteParking).map(b=>b.siteParking),...(q.parkingLot?[q.parkingLot]:[])]
            .map(b=>{const f=footprint(b);return compassArea(f.e0-12,f.e1+12,f.s0-12,f.s1+12);});
        const obstacles = [...objects.flatMap(b => [b, ...visualSolids(b)]),...parking];
        const key = (e, s) => `${e},${s}`;
        const network = new Set(), free = new Set();
        const edgeCache = new Map();
        const edgeClear = (a, b) => {
            const ak = key(...a), bk = key(...b), k = ak < bk ? `${ak}/${bk}` : `${bk}/${ak}`;
            if (!edgeCache.has(k)) edgeCache.set(k, !obstacles.some(o => intersects({ a, b }, o)));
            return edgeCache.get(k);
        };
        for (let e = -WORLD + 80; e <= WORLD - 80; e += STEP) {
            for (let s = 80; s <= 2 * WORLD - 80; s += STEP) {
                if (obstacles.some(b => intersects({ a: [e, s], b: [e, s] }, b))) continue;
                const k = key(e, s);
                free.add(k);
                if (Math.abs(e) <= ROAD || Math.abs(s - WORLD) <= ROAD) network.add(k);
            }
        }
        q.neighborhood.streets = [];
        q.roadAccess = [];
        for (const b of [...objects,...(q.parkingLot?[q.parkingLot]:[])]) {
            // Prefer a front-door approach; other sides serve tightly packed courts.
            const candidates = (b===q.parkingLot ? [
                [b.x+b.w/2,b.y+b.d+90],[b.x+b.w/2,b.y-90]
            ] : [
                ...(b.garage ? [[b.x + b.w - 72, b.y + b.d + 90]] : []),
                ...(b.siteParking ? [[b.x+b.w+40,b.y+b.d+80]] : []),
                [b.x + b.w / 2, b.y + b.d + 90],
                [b.x - 90, b.y + b.d / 2],
                [b.x + b.w + 90, b.y + b.d / 2],
                [b.x + b.w / 2, b.y - 90]
            ]).map(([x, y]) => point(b, x, y))
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
        const houseCount = design.homes.filter(([, , kind]) => kind === 'house').length;
        q.neighborhood.buildings = design.homes.map(([e, s, kind, terrace = false], i) => {
            const houseOrdinal = design.homes.slice(0, i).filter(([, , homeKind]) => homeKind === 'house').length;
            const available = kind !== 'house' && i % 2 === 0 && !availability.has(kind);
            if (available) availability.add(kind);
            const b = { name: `${id} ${kind === 'house' ? 'Rowhouse' : kind === 'condo' ? 'Waterfront Home' : 'Garden Apartment'} ${i + 1}`,
                kind, terrace, available,
                variant: kind === 'house' ? houseOrdinal === houseCount - 1 ? 3 : houseOrdinal % 3 : i % 3,
                frontLayout: kind === 'house' && houseOrdinal % 2 ? 'garden-court' : 'straight', type: 'crib',
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
            garage.w = apartment.w; garage.d = 100; garage.h = 55;
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
            const [cx, cy] = point(apartment, apartment.x + apartment.w + garage.w / 2, apartment.y + apartment.d - garage.d / 2);
            garage.x = cx - garage.w / 2; garage.y = cy - garage.d / 2;
        }
        arrangeHouses(q);
        for (const [type, e, s, w, d] of [['busstop', 165, WORLD + 340, 36, 24], ['metro', -180, WORLD - 300, 48, 36]]) {
            const station = { type, name: `${id} ${type === 'busstop' ? 'Bus Stop' : 'Underground Metro'}`, w, d, h: 48, roadAligned: true };
            center(station, e, s);
            q.buildings.push(station);
        }
        arrangeSightlines(q);
        connect(q);
        assignParking(q);
    }

    function arrangeHouses(q) {
        const houses = q.neighborhood.buildings.filter(b => b.kind === 'house');
        if (!houses.length) return;
        const preferredE = houses.reduce((sum,b) => sum + b.x + b.w / 2 - b.y - b.d / 2, 0) / houses.length;
        const preferredS = houses.reduce((sum,b) => sum + b.x + b.w / 2 + b.y + b.d / 2, 0) / houses.length;
        const obstacles = [...targets(q).filter(b => b.kind !== 'house'), ...(q.parkingLot ? [q.parkingLot] : [])];
        const spacing = 112 * Math.SQRT2;
        for (const b of houses) { b.w = 100; b.d = 104; }
        const candidates = [];
        for (let s = 140; s <= 2 * WORLD - 140; s += 40)
            for (let e = -WORLD + 110; e + spacing * (houses.length - 1) <= WORLD - 110; e += 40)
                candidates.push({ e, s, score: Math.hypot(e + spacing * (houses.length - 1) / 2 - preferredE, s - preferredS) });
        candidates.sort((a,b) => a.score - b.score);
        const row = candidates.find(({e,s}) => houses.every((b,i) => {
            center(b, e + i * spacing, s);
            const f = footprint(b);
            const frontage = region(b, { x: b.x - 6, y: b.y + b.d, w: b.w + 12, d: 160 });
            return (f.e1 < -HALF-20 || f.e0 > HALF+20) && (f.s1 < WORLD-HALF-20 || f.s0 > WORLD+HALF+20) &&
                !obstacles.some(o => overlaps(b,o,16) || overlaps(frontage,o,8));
        }));
        if (!row) throw new Error('No safe single-family residential row');
        houses.forEach((b,i) => center(b, row.e + i * spacing, row.s));
        q.houseYards = [region(houses[0], { x: houses[0].x - 6, y: houses[0].y - 6,
            w: houses.length * 100 + (houses.length - 1) * 12 + 12, d: 150 })];
    }
    function assignParking(q) {
        q.playerParking = [];
        q.parkingAreas = q.parkingLot ? [{ ...q.parkingLot, destination: q.parkingLot, kind: 'overflow' }] : [];
        if(q.parkingLot) q.parkingAreas[0].lane=region(q.parkingLot,{
            x:q.parkingLot.x+46,y:q.parkingLot.y+2,w:q.parkingLot.w-92,d:q.parkingLot.d-4});
        q.approaches = [];
        const addBay = (destination, area, bay) => q.playerParking.push({ ...bay, destination, area });
        if (q.parkingLot) {
            for (const [column, x] of [q.parkingLot.x + 5, q.parkingLot.x + q.parkingLot.w - 41].entries())
                for (let row = 0; row < 8; row++) {
                    if (column === 0 && row === 0 || column === 1 && row === 6) continue;
                    addBay(q.parkingLot, q.parkingAreas[0], region(q.parkingLot, {
                        x, y: q.parkingLot.y + row * 24, w: 36, d: 24, heading: [1, 0]
                    }));
                }
        }
        for (const destination of targets(q)) {
            const layout = residentialPlan(destination);
            if (!layout) continue;
            const area = { ...region(destination, layout.parking), destination, kind: layout.kind === 'house' ? 'driveway' : 'lot' };
            q.parkingAreas.push(area);
            const paths = layout.paths || [layout.path];
            for (const path of paths)
                q.approaches.push({ ...region(destination, path), destination, pedestrian: true });
            const access = q.roadAccess.find(a => a.building === destination);
            if(layout.kind==='house') {
                q.approaches.push({...region(destination,layout.drivewayPath),destination,pedestrian:true});
                const streetPath=paths.at(-1), bottom=streetPath.y+streetPath.d;
                const left=streetPath.x,right=streetPath.x+streetPath.w;
                const sidewalkEdge=streetBounds(q).map(r=>{
                    const corners=[[r.e0,r.s0],[r.e1,r.s0],[r.e1,r.s1],[r.e0,r.s1]]
                        .map(([e,s])=>point(destination,...world(e,s),true));
                    const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]);
                    return {left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};
                }).filter(r=>r.right>left && r.left<right && r.bottom>bottom)
                    .map(r=>r.top).sort((a,b)=>a-b)[0];
                const end=Math.max(bottom,Number.isFinite(sidewalkEdge)?sidewalkEdge+2:bottom);
                if(end>bottom) q.approaches.push({...region(destination,{
                    x:streetPath.x,y:bottom,w:streetPath.w,d:end-bottom
                }),destination,pedestrian:true});
                for(const bay of layout.bays) addBay(destination,area,region(destination,bay));
                continue;
            }
            const [ax, ay] = point(destination, ...world(...access.path[0]), true);
            const r = layout.path, bottom = r.y + r.d, end = Math.max(bottom, ay);
            if (end > bottom) q.approaches.push({ ...region(destination, { x: r.x, y: bottom, w: r.w, d: end - bottom }), destination, pedestrian: true });
            const mid = r.x + r.w / 2;
            q.approaches.push({ ...region(destination, { x: Math.min(mid, ax) - 10, y: end - 10,
                w: Math.abs(mid - ax) + 20, d: 20 }), destination, pedestrian: true });
            for (const bay of layout.bays.slice(0, layout.kind === 'apartment' ? 2 : undefined))
                addBay(destination, area, region(destination, bay));
        }
        for (const destination of targets(q).filter(b => !b.privateHome)) {
            if (residentialPlan(destination)) continue;
            if (destination.garage) {
                const area = { ...destination, destination, kind: 'garage' };
                area.lane = region(destination, {x:destination.x+destination.w-96,y:destination.y+2,w:48,d:destination.d-2});
                q.parkingAreas.push(area);
                for (let i = 0; i < 3; i++)
                    addBay(destination, area, region(destination, { x: destination.x + destination.w - 44,
                        y: destination.y + 4 + i * 30, w: 40, d: 26, heading: [1, 0] }));
                continue;
            }
            const entrance = region(destination, { x: destination.x + destination.w / 2 - 11,
                y: destination.y + destination.d, w: 22, d: 80 });
            q.approaches.push({ ...entrance, destination, pedestrian: true });
            if (destination.type === 'busstop') continue;
            if(!destination.siteParking) throw new Error(`No planned parking lot for ${destination.name || destination.kind}`);
            const area={...destination.siteParking,destination,kind:'lot'};
            area.lane=region(area,{x:area.x+30,y:area.y+2,w:58,d:area.d-2});
            const bays=[4,96].map(offset=>region(area,{x:area.x+3,y:area.y+offset,w:22,d:40,heading:[0,1]}));
            q.parkingAreas.push(area);
            bays.forEach(bay => addBay(destination, area, bay));
        }
        q.parkingSolids = targets(q).filter(b => b.garage).flatMap(b =>
            [{ x: b.x, y: b.y, w: b.w - 100, d: b.d },
                { x: b.x + b.w - 100, y: b.y, w: 100, d: 2 },
                { x: b.x + b.w - 2, y: b.y, w: 2, d: b.d }].map(r => footprint(region(b, r))));
        addParkingAprons(q);
    }

    function streets(q) {
        return [
            {a:[0,0],b:[0,2*WORLD]},
            {a:[-WORLD,WORLD],b:[WORLD,WORLD]},
            ...q.neighborhood.streets
        ];
    }

    function streetBounds(q, margin = 0, asphalt = false) {
        const half=(asphalt?ROAD:HALF)+margin;
        return streets(q).map(r=>({
            e0:Math.min(r.a[0],r.b[0])-half,e1:Math.max(r.a[0],r.b[0])+half,
            s0:Math.min(r.a[1],r.b[1])-half,s1:Math.max(r.a[1],r.b[1])+half
        }));
    }

    function grassAt(q,x,y) {
        const e=x-y,s=x+y;
        if(streetBounds(q).some(r=>e>=r.e0 && e<=r.e1 && s>=r.s0 && s<=r.s1) ||
            q.parkingAreas.some(a=>distanceTo(a,x,y)<1) || q.activities.some(a=>distanceTo(a,x,y)===0) ||
            q.approaches.some(a=>a.vehicleEntrance && (a.polygon ?
                polygonsOverlap(a.polygon,[[x-1,y-1],[x+1,y-1],[x+1,y+1],[x-1,y+1]]) : distanceTo(a,x,y)<1))) return false;
        for(const b of targets(q)) {
            const layout=residentialPlan(b);
            if(!layout && distanceTo(b,x,y)===0) return false;
            if(layout && distanceTo(b,x,y)===0) {
                return ![...layout.parts,layout.parking,...(layout.garden?[layout.garden]:[])]
                    .some(r=>distanceTo(region(b,r),x,y)===0);
            }
            if((q.houseYards||[]).some(a=>distanceTo(a,x,y)===0)) return true;
        }
        const district=q.districts.filter(d=>e>=d.e && e<=d.e+d.w && s>=d.s && s<=d.s+d.d).at(-1);
        return district ? district.grass===true : true;
    }

    function landscape(q) {
        const objects=targets(q), roads=streetBounds(q);
        const signAreas=objects.map(building=>{
            const layout=residentialPlan(building);
            return layout?.signClearance ? region(building,layout.signClearance) : null;
        }).filter(Boolean);
        const blocked=area=>objects.some(b=>overlaps(area,b,8)) ||
            q.activities.some(b=>overlaps(area,b,12)) ||
            q.parkingAreas.some(a=>overlaps(area,a,8)) ||
            signAreas.some(a=>overlaps(area,a,8)) ||
            q.approaches.some(a=>a.polygon ? polygonsOverlap(footprint(area).corners,a.polygon) : overlaps(area,a,8));
        q.trees=q.trees.filter(tree=>!signAreas.some(area=>distanceTo(area,tree.x,tree.y)<20));
        for(const side of [-1,1]) for(let s=300;s<2*WORLD-150;s+=360) {
            if(Math.abs(s-WORLD)<220) continue;
            const [x,y]=world(side*(ROAD+HALF)/2,s), area={x:x-10,y:y-10,w:20,d:20,roadAligned:true};
            if(!blocked(area) && !q.neighborhood.streets.some(r=>intersects(r,area)) &&
                !q.lamps.some(l=>Math.hypot(l.x-x,l.y-y)<30) &&
                !q.trees.some(t=>Math.hypot(t.x-x,t.y-y)<40)) q.trees.push({x,y,scale:.82});
        }
        q.trees.forEach((tree,i)=>{
            const area={x:tree.x-10,y:tree.y-10,w:20,d:20,roadAligned:true};
            const onGrass=footprint(area).corners.every(([x,y])=>grassAt(q,x,y));
            tree.setting=onGrass?'lawn':i%3===0?'raised':i%3===1?'pit':'berm';
            const e=tree.x-tree.y,s=tree.x+tree.y;
            if(roads.some(r=>e>=r.e0 && e<=r.e1 && s>=r.s0 && s<=r.s1)) tree.setting='pit';
        });
        q.plantings=[];
        for(const building of objects) {
            const layout=residentialPlan(building);
            if(!layout) continue;
            const reserved=[...layout.parts,layout.parking,...(layout.paths||[layout.path]),...(layout.drivewayPath?[layout.drivewayPath]:[]),
                ...(layout.garden?[layout.garden]:[])].map(r=>region(building,r));
            if(layout.signClearance) reserved.push(region(building,layout.signClearance));
            let count=0;
            for(const v of [.92,.78,.64,.50]) for(const u of [.15,.58,.70,.05,.38,.86,.21,.35,.265]) {
                if(count>=5) continue;
                const kind=count%3===0?'roses':count%3===1?'shrubs':'flowers';
                const width=layout.kind==='apartment'||layout.terrace?4:12;
                const bed=region(building,{x:building.x+building.w*u-width/2,y:building.y+building.d*v-3,w:width,d:6});
                if(!contains(building,footprint(bed).corners,2) || reserved.some(r=>overlaps(bed,r,2)) ||
                    q.approaches.some(a=>a.polygon ? polygonsOverlap(footprint(bed).corners,a.polygon) : overlaps(bed,a,2)) ||
                    q.plantings.some(p=>overlaps(bed,p,5))) continue;
                q.plantings.push({...bed,kind,raised:layout.kind!=='house',building});
                count++;
            }
        }
        q.trees.filter((t,i)=>t.setting==='lawn' && i%4===0).forEach(tree=>{
            const bed={x:tree.x+15,y:tree.y-4,w:18,d:10,roadAligned:true};
            if(footprint(bed).corners.every(([x,y])=>grassAt(q,x,y)) && !blocked(bed) &&
                !q.trees.some(t=>distanceTo(bed,t.x,t.y)<12) && !q.plantings.some(p=>overlaps(bed,p,5)))
                q.plantings.push({...bed,kind:'flowers',raised:false});
        });
    }

    function addParkingAprons(q) {
        const roads = streetBounds(q,0,true);
        const vehicleLength=(typeof module !== 'undefined' && module.exports ? require('./vehicle-art.js') : VehicleArt).sizes.truck.w;
        const obstacles = [...q.buildings.filter(b => !b.garage), ...q.neighborhood.buildings,
            ...q.activities.filter(b => b.type === 'boxing')].flatMap(buildingSolids).concat(q.parkingSolids,
                q.parkingLot?[5,q.parkingLot.w-41].map(offset=>
                    footprint(region(q.parkingLot,{x:q.parkingLot.x+offset,y:q.parkingLot.y,w:36,d:q.parkingLot.d}))):[]);
        for (const area of q.parkingAreas) {
            const lot = footprint(area.lane || area), candidates = [];
            const blocked = obstacles.concat(targets(q).filter(b => b !== area.destination).map(footprint),
                targets(q).flatMap(visualSolids).map(footprint),
                q.playerParking.filter(b=>b.area!==area || area.lane).map(footprint));
            for (const road of roads) for (const axis of ['e','s']) {
                const cross = axis === 'e' ? 's' : 'e';
                const lo = Math.max(lot[`${cross}0`],road[`${cross}0`]);
                const hi = Math.min(lot[`${cross}1`],road[`${cross}1`]);
                if (hi - lo < 28) continue;
                const mid = (lo + hi) / 2;
                let start, end;
                if (lot[`${axis}1`] < road[`${axis}0`]) {
                    start = lot[`${axis}1`] - 4; end = road[`${axis}0`] + 4;
                } else if (road[`${axis}1`] < lot[`${axis}0`]) {
                    start = road[`${axis}1`] - 4; end = lot[`${axis}0`] + 4;
                } else {
                    const shared = (Math.max(lot[`${axis}0`],road[`${axis}0`]) +
                        Math.min(lot[`${axis}1`],road[`${axis}1`])) / 2;
                    start = shared - 4; end = shared + 4;
                }
                if (end - start > 400) continue;
                const e0 = axis === 'e' ? start : mid - 14, e1 = axis === 'e' ? end : mid + 14;
                const s0 = axis === 's' ? start : mid - 14, s1 = axis === 's' ? end : mid + 14;
                const [cx,cy] = world((e0+e1)/2,(s0+s1)/2);
                const w = (e1-e0) * Math.SQRT1_2, d = (s1-s0) * Math.SQRT1_2;
                const apron = { x: cx-w/2, y: cy-d/2, w, d, roadAligned: true,
                    heading:axis==='e'?[Math.SQRT1_2,-Math.SQRT1_2]:[Math.SQRT1_2,Math.SQRT1_2],
                    destination: area.destination, pedestrian: false, vehicleEntrance: true };
                const corners = footprint({...apron,x:apron.x-(axis==='e'?vehicleLength/2:0),y:apron.y-(axis==='s'?vehicleLength/2:0),
                    w:w+(axis==='e'?vehicleLength:0),d:d+(axis==='s'?vehicleLength:0)}).corners;
                if (blocked.some(s => polygonsOverlap(corners,s.corners))) continue;
                candidates.push({ apron, length: end-start });
            }
            if (!candidates.length) for (const road of roads) {
                const e = Math.max(road.e0 + 16,Math.min(road.e1 - 16,(lot.e0+lot.e1)/2));
                const s = Math.max(road.s0 + 16,Math.min(road.s1 - 16,(lot.s0+lot.s1)/2));
                const start = world(Math.max(lot.e0+16,Math.min(lot.e1-16,e)),
                    Math.max(lot.s0+16,Math.min(lot.s1-16,s)));
                const end = world(e,s), dx = end[0]-start[0], dy = end[1]-start[1], length = Math.hypot(dx,dy);
                if (!length || length > 240) continue;
                const nx = -dy / length * 12, ny = dx / length * 12;
                const corners = [[start[0]+nx,start[1]+ny],[end[0]+nx,end[1]+ny],
                    [end[0]-nx,end[1]-ny],[start[0]-nx,start[1]-ny]];
                const swept=corners.map(([x,y],i)=>[x+dx/length*(i===0||i===3?-vehicleLength/2:vehicleLength/2),
                    y+dy/length*(i===0||i===3?-vehicleLength/2:vehicleLength/2)]);
                if (blocked.some(o => polygonsOverlap(swept,o.corners))) continue;
                const xs = corners.map(p=>p[0]), ys = corners.map(p=>p[1]);
                const x = Math.min(...xs), y = Math.min(...ys);
                candidates.push({ length, apron: { x, y, w: Math.max(...xs)-x, d: Math.max(...ys)-y,
                    polygon: corners, heading:[dx/length,dy/length],
                    destination: area.destination, pedestrian: false, vehicleEntrance: true } });
            }
            candidates.sort((a,b) => a.length-b.length);
            if (!candidates.length) throw new Error(`No clear parking entrance for ${area.destination.name || area.destination.type || area.kind}`);
            q.approaches.push(candidates[0].apron);
        }
    }

    const api = { apply, targets, nearRoad, intersects, designs, point, footprint, overlaps, distanceTo, front, polygonsOverlap,
        residentialPlan, region, vehicleCorners, contains, buildingSolids, visualSolids, streets, streetBounds, grassAt, landscape,
        halfWidth: HALF, roadHalfWidth: ROAD, laneOffset: ROAD/2, world: WORLD, scale: SCALE, projection, grassColor };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.CityLayout = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
