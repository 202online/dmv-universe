'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Art = require('./residential-art.js');
const Layout = require('./city-layout.js');

test('nine residential silhouettes reserve bounded driveways or apartment parking without changing lots', () => {
    const forms = new Set();
    for (const kind of ['house', 'apartment', 'condo']) for (const variant of [0, 1, 2]) {
        const b = { x: 100, y: 200, w: 80, d: 60, h: 125, kind, variant };
        const plan = Art.plan(b);
        forms.add(JSON.stringify(plan.parts.map(p => [p.x, p.y, p.w, p.d, p.z, p.h, p.roof])));
        for (const p of [...plan.parts, plan.parking, ...(plan.garden ? [plan.garden] : [])]) {
            assert.ok(p.x >= b.x && p.y >= b.y);
            assert.ok(p.x + p.w <= b.x + b.w + 1e-8);
            assert.ok(p.y + p.d <= b.y + b.d + 1e-8);
        }
        for (const p of plan.parts)
            assert.ok(!(p.x < plan.parking.x + plan.parking.w && p.x + p.w > plan.parking.x &&
                p.y < plan.parking.y + plan.parking.d && p.y + p.d > plan.parking.y), 'Structure leaves parking clear');
    }
    assert.equal(forms.size, 9);
});

test('houses, condos and apartments share one borderless lawn color', () => {
    for(const kind of ['house','condo','apartment']) {
        const planes=[];
        Art.draw({x:0,y:0,w:170,d:130,h:125,kind,variant:0,color:'#976b53',trim:'#e3ceb0'},{
            ctx:new Proxy({}, {get:()=>()=>{}}),
            P:(x,y,z=0)=>[x-y,(x+y)/2-z],
            poly(points,fill,stroke){planes.push({points,fill,stroke});},
            box(){},shade:c=>c
        });
        assert.equal(planes[0].fill,Art.grassColor);
        assert.equal(planes[0].stroke,undefined,'no visible plot outline divides matching lawns');
    }
});

test('house steps and widened walks connect to the driveway side without crossing its pavement', () => {
    for(const variant of [0,1,2,3]) for(const frontLayout of ['straight','garden-court']) {
        const b={x:100,y:200,w:100,d:104,h:90,kind:'house',variant,frontLayout,color:'#976b53',trim:'#e3ceb0'};
        const concrete=[],steps=[],landings=[];
        Art.draw(b,{
            ctx:new Proxy({}, {get:()=>()=>{}}),P:(x,y,z=0)=>[x,y,z],
            poly(points,fill){if(fill==='#c3c6c5')concrete.push(points);},
            box(x,y,z,w,d,h,color){if(color==='#c3c6c5') {
                const piece={x,y,z,w,d,h};
                if(d===4)landings.push(piece);else steps.push(piece);
            }},
            shade:c=>c
        });
        const plan=Art.plan(b);
        assert.equal(concrete.length,plan.paths.length+1,'all front-walk segments and the driveway branch are rendered');
        assert.equal(landings.length,1,'front door has a raised concrete landing');
        assert.equal(steps.length,3,'each tread is a solid concrete step');
        assert.deepEqual(steps.map(s=>s.h),[6,4,2],'steps descend toward the walkway');
        assert.equal(plan.path.w,28,'the front walkway is wide enough to match its stairs');
        assert.equal(steps[0].w,plan.path.w,'stairs align across the complete walkway');
        assert.ok(concrete.every(points=>points.every(([x,y])=>x>=b.x && x<=b.x+b.w && y>=b.y && y<=b.y+b.d)));
        assert.deepEqual(landings[0],{...plan.landing,z:0},'landing aligns with the threshold');
        assert.equal(steps[0].y,plan.landing.y+plan.landing.d,'stairs continue from the landing');
        assert.equal(steps[0].x,plan.path.x,'stairs remain centered on the walkway');
        assert.ok(plan.drivewayPath.d>0,'the driveway spur has a positive, connected depth');
        const connector=plan.paths.find(path=>path.x+path.w===plan.drivewayPath.x &&
            path.y<plan.drivewayPath.y+plan.drivewayPath.d && path.y+path.d>plan.drivewayPath.y);
        assert.ok(connector,'the spur joins the side of the nearest front-walk segment, not the stair edge');
        assert.equal(plan.drivewayPath.x+plan.drivewayPath.w,plan.parking.x,
            'the pedestrian branch ends at the driveway edge');
        assert.ok(plan.drivewayPath.y+plan.drivewayPath.d<=plan.parking.y+plan.parking.d,
            'the pedestrian branch stops at the driveway entry edge');
        assert.equal(Layout.polygonsOverlap(Layout.footprint(plan.drivewayPath).corners,
            Layout.footprint(plan.parking).corners),false,'the pedestrian branch does not cross the driveway');
    }
});

test('single-family architecture and front-yard layouts are independent customization options', () => {
    assert.deepEqual(Art.houseDesigns.map(design => design.id),
        ['bay-front', 'l-shaped', 'porch-setback', 'craftsman']);
    assert.deepEqual(Art.frontLayouts.map(layout => layout.id), ['straight', 'garden-court']);
    const b={x:100,y:200,w:100,d:104,h:90,kind:'house',color:'#976b53',trim:'#e3ceb0'};
    const classic=Art.plan({...b,architecture:'bay-front'});
    const craftsman=Art.plan({...b,architecture:'craftsman'});
    const straight=Art.plan({...b,architecture:'craftsman',frontLayout:'straight'});
    const garden=Art.plan({...b,architecture:'craftsman',frontLayout:'garden-court'});
    assert.notDeepEqual(classic.parts,craftsman.parts,'new architecture has its own massing');
    assert.deepEqual(straight.parts,garden.parts,'front-yard choices do not change the house architecture');
    assert.equal(craftsman.architecture,'craftsman');
    assert.equal(garden.frontLayout,'garden-court');
    assert.equal(garden.paths.length,3,'garden-court walk has an upper run, turn and lower run');
    assert.equal(garden.paths[0].y+garden.paths[0].d,garden.paths[1].y);
    assert.equal(garden.paths[1].y+garden.paths[1].d,garden.paths[2].y);
    assert.ok(garden.paths[1].x<garden.paths[0].x,'garden-court walk turns away from the driveway');
    assert.equal(garden.drivewayPath.x+garden.drivewayPath.w,garden.parking.x);
    assert.equal(garden.drivewayPath.y+garden.drivewayPath.d,garden.parking.y+garden.parking.d);
    assert.equal(Layout.polygonsOverlap(Layout.footprint(garden.drivewayPath).corners,
        Layout.footprint(garden.parking).corners),false);
    assert.throws(()=>Art.plan({...b,architecture:'unknown'}),/Unknown house architecture/);
    assert.throws(()=>Art.plan({...b,frontLayout:'unknown'}),/Unknown house front layout/);
});

test('roofs, balconies, driveways, garages and apartment spaces draw within each property boundary', () => {
    for (const [w, d] of [[80, 60], [140, 100], [160, 110], [170, 130]]) {
        const b = { x: 100, y: 200, w, d, h: 125, color: '#976b53', trim: '#e3ceb0' };
        let planes = 0;
        const env = {
            ctx: new Proxy({}, { get: (target, key) => key in target ? target[key] : (...args) => {
                args.filter(a => typeof a === 'number').forEach(n => assert.ok(Number.isFinite(n)));
            } }),
            P(x, y, z = 0) {
                assert.ok(Number.isFinite(z) && z >= 0);
                assert.ok(x >= b.x - 1e-8 && x <= b.x + w + 1e-8, `x ${x}`);
                assert.ok(y >= b.y - 1e-8 && y <= b.y + d + 1e-8, `y ${y}`);
                return [x - y, (x + y) / 2 - z];
            },
            poly() { planes++; }, box(x, y, z, ww, dd, h, color) {
                assert.match(color, /^#[0-9a-f]{6}$/i, 'Box shading receives a hex color, not an already-shaded rgb value');
                env.P(x, y, z); env.P(x + ww, y + dd, z + h);
            }, shade: color => color
        };
        for (const kind of ['house', 'apartment', 'condo'].filter(kind => kind !== 'apartment' || w >= 160)) for (const variant of [0, 1, 2]) {
            const before = planes;
            Art.draw({ ...b, kind, variant }, env, true, 1);
            assert.ok(planes > before, `${kind} variant ${variant} renders visible geometry`);
        }
    }
});

test('apartment parking has four full-size spaces, an aisle and a separate animated waterfall garden', () => {
    for (const [w, d] of [[160, 110], [170, 130]]) for (const variant of [0, 1, 2]) {
        const b = { x: 100, y: 200, w, d, h: 150, kind: 'apartment', variant, color: '#976b53', trim: '#e3ceb0' };
        const { parking: p, garden: g, parts } = Art.plan(b);
        assert.equal(p.spaces, 4);
        assert.ok(p.w / p.spaces >= 19, 'Marked bays fit the detailed parked cars');
        assert.ok(p.d * .34 >= 14, 'The clear access aisle fits the widest parked car');
        assert.ok(g.x + g.w <= p.x && g.y >= b.y + b.d / 2, 'Front garden stays outside parking bays');
        assert.ok(parts.every(part => part.y + part.d <= g.y), 'Waterfall garden is outside apartment walls');
        const frames = [];
        for (const time of [0, .5]) {
            const drops = [];
            Art.draw(b, {
                ctx: new Proxy({}, { get: (target, key) => key in target ? target[key] : () => {} }),
                P: (x, y, z = 0) => [x - y, (x + y) / 2 - z],
                poly(points, color) { if (color === '#c5f2eb') drops.push(points); },
                box() {}, shade: color => color
            }, false, time);
            assert.equal(drops.length, 4);
            frames.push(drops);
        }
        assert.notDeepEqual(frames[0], frames[1], 'Waterfall streams animate');
    }
});

test('residential structures, parking and signs render without a transparency override', () => {
    const b={x:100,y:200,w:160,d:110,h:150,kind:'apartment',variant:0,color:'#976b53',trim:'#e3ceb0'};
    let parking=0,structures=0,signs=0;
    const canvas=new Proxy({globalAlpha:1,fillText(text){if(text==='P')parking++;else signs++;}},
        {get:(target,key)=>target[key]||(()=>{}),set(target,key,value){
            if(key==='globalAlpha')assert.equal(value,1);target[key]=value;return true;
        }});
    Art.draw(b,{
        ctx:canvas,
        P:(x,y,z=0)=>[x-y,(x+y)/2-z],poly(){},shade:c=>c,
        box(x,y,z,w,d,h){if(h>50)structures++;}
    });
    assert.ok(structures>0);assert.equal(parking,2);assert.ok(signs>0);
});

test('listing text exactly follows visible sale and availability boards, including style-based buildings', () => {
    for (const kind of ['house', 'apartment', 'condo']) for (const variant of [0, 1, 2])
        for (const available of [undefined, false, true]) {
            const b = { x: 0, y: 0, w: 160, d: 110, h: 140, kind, variant, available };
            const expected = kind === 'house' ? (variant !== 1 ? 'FOR SALE' : null) :
                (available ?? variant === 0) ? 'AVAILABLE' : null;
            assert.equal(Art.listing(b), expected);
            assert.equal(Art.plan(b).listed, expected !== null);
            const boards = [];
            Art.draw({ ...b, color: '#976b53', trim: '#e3ceb0' }, {
                ctx: new Proxy({ fillText(text) { if (text !== 'P') boards.push(text); } },
                    { get: (target, key) => key in target ? target[key] : () => {} }),
                P: (x, y, z = 0) => [x - y, (x + y) / 2 - z],
                poly() {}, box() {}, shade: color => color
            });
            assert.equal(boards.length > 0, expected !== null);
            if (expected) assert.ok(boards.some(text => text.includes(expected)));
        }
    assert.equal(Art.listing({ style: 'apartment' }), null, 'The starter apartment uses its rendered occupied variant');
    assert.equal(Art.listing({ style: 'apartment', available: true }), 'AVAILABLE');
    assert.equal(Art.listing({ style: 'garage', garage: true }), null);
    assert.equal(Art.listing({ kind: 'shop' }), null);
});

test('garages have an opaque service wing beside an uncovered parking deck and a wall-mounted board', () => {
    const b = { x: 100, y: 200, w: 170, d: 100, h: 55, color: '#746c65', trim: '#bb9c84' };
    const text = [], transforms = [], panels = [], solids = [];
    const env = {
        ctx: new Proxy({
            transform(...matrix) { transforms.push(matrix); },
            fillText(title) { text.push(title); }
        }, { get: (target, key) => key in target ? target[key] : () => {} }),
        P(x, y, z = 0) {
            assert.ok(x >= b.x && x <= b.x + b.w);
            assert.ok(y >= b.y && y <= b.y + b.d);
            assert.ok(Number.isFinite(z) && z >= 0);
            return [x - y, (x + y) / 2 - z];
        },
        box(x, y, z, w, d, h, color) {
            assert.match(color, /^#[0-9a-f]{6}$/i);
            env.P(x, y, z); env.P(x + w, y + d, z + h);
            solids.push({ x, y, z, w, d, h });
        },
        poly(points, color) { panels.push({ points, color }); }
    };
    Art.drawGarage(b, env, true, 1);
    assert.deepEqual(text, ['PARK HERE', 'GARAGE']);
    assert.deepEqual(transforms[0].slice(0, 4), [1, .5, 0, 1]);
    const roof=panels.find(p=>p.color==='#718184');
    assert.ok(roof.points.every(([x,y])=>x+y*2+2*b.h<=2*(b.x+b.w-100)+1e-7),'roof covers only the service wing, not the parking deck');
    const sign = solids.find(s => s.z>0 && s.d===2);
    assert.ok(sign.x+sign.w<=b.x+b.w-100,'Board stays on the service wing, away from the driving lane');
    assert.ok(sign.z > 0 && sign.z + sign.h <= b.h, 'Board remains below the garage roof');
});

test('property notices are supported 3D boards with lettering projected onto their faces', () => {
    for (const kind of ['house', 'apartment', 'condo']) for (const variant of [0, 1, 2]) {
        const text = [], transforms = [], supports = [];
        let projected = false;
        const env = {
            ctx: new Proxy({
                transform(...matrix) { transforms.push(matrix); projected = true; },
                fillText(title) {
                    if (title === 'P') return;
                    assert.ok(projected, 'Sign lettering uses world projection, not a floating screen label');
                    text.push(title);
                },
                restore() { projected = false; }
            }, { get: (target, key) => key in target ? target[key] : () => {} }),
            P: (x, y, z = 0) => [x - y, (x + y) / 2 - z],
            poly() {}, box(x, y, z, w, d, h) { supports.push({ z, w, d, h }); }, shade: color => color
        };
        Art.draw({ x: 100, y: 200, w: 160, d: 90, h: 140, kind, variant, color: '#976b53', trim: '#e3ceb0' }, env);
        if (kind === 'house' && variant === 1 || kind !== 'house' && variant !== 0) {
            assert.deepEqual(text, [], 'Occupied homes have no availability signs');
            continue;
        }
        assert.deepEqual(text, kind === 'house' ? ['FOR SALE', 'CHOCOLATE CITY'] :
            kind === 'apartment' ? ['1-4 BEDROOMS', 'AVAILABLE'] : ['AVAILABLE CONDOS', 'INQUIRE WITHIN']);
        assert.equal(transforms.length, 1);
        assert.deepEqual(transforms[0].slice(0, 4), [1, .5, 0, 1]);
        assert.ok(supports.some(p => p.z === 0 && p.w === 2 && p.d === 2 && p.h >= 43), 'Boards have ground-supported posts');
        assert.ok(supports.some(p => p.z > 0 && p.w >= 20 && p.d === 2 && p.h >= 20), 'Board has physical thickness');
    }
});

test('driveways have a visible setback from walls and roofs for every house and condo design', () => {
    for (const kind of ['house', 'condo']) for (const variant of [0, 1, 2]) {
        const { parts, parking } = Art.plan({ x: 100, y: 200, w: 80, d: 60, h: 125, kind, variant });
        for (const part of parts) assert.ok(parking.x - part.x - part.w >= 6,
            `${kind} ${variant}: driveway is separated from building geometry`);
        assert.ok(parking.w >= 14, 'Driveway fits a shared-size sedan facing the street');
    }
});

test('availability can be explicitly set without changing residential silhouettes', () => {
    for (const kind of ['apartment', 'condo']) {
        const b = { x: 100, y: 200, w: 160, d: 110, h: 140, kind };
        assert.equal(Art.plan({ ...b, variant: 0 }).available, true);
        assert.equal(Art.plan({ ...b, variant: 1 }).available, false);
        assert.equal(Art.plan({ ...b, variant: 0, available: false }).available, false);
        assert.equal(Art.plan({ ...b, variant: 2, available: true }).available, true);
    }
});

test('rowhome condos reserve front parking bays below their shared wall and balconies', () => {
    for (const variant of [0, 1, 2]) {
        const b = { x: 100, y: 200, w: 140, d: 100, h: 120, kind: 'condo', terrace: true, variant };
        const { parts, parking, terrace } = Art.plan(b);
        assert.ok(terrace);
        assert.equal(parts[0].x, b.x);
        assert.equal(parts[0].w, b.w, 'Full-width walls can join the next rowhome');
        assert.ok(parts.every(p => p.y + p.d + b.d * .08 < parking.y));
        assert.equal(parking.spaces, 2);
        assert.ok(parking.w / parking.spaces >= 14);
        assert.ok(parking.d >= 30);
    }
});

test('decorative cars fit their own spaces and never occupy a player bay or the entrance path', () => {
    for (const kind of ['house', 'condo', 'apartment']) for (const variant of [0, 1, 2]) {
        const plan = Art.plan({ x: 100, y: 200, w: kind === 'house' ? 80 : 160,
            d: kind === 'house' ? 60 : 110, h: 140, kind, variant });
        const reserved = plan.bays.slice(0, kind === 'apartment' ? 2 : undefined);
        for (const car of plan.decorativeCars) {
            const corners = Layout.vehicleCorners(car.x + car.w / 2, car.y + car.d / 2, car.heading, car);
            assert.ok(Layout.contains(plan.parking, corners, 1));
            for (const region of [...reserved, plan.path])
                assert.equal(Layout.polygonsOverlap(corners, Layout.footprint(region).corners), false);
        }
    }
});
