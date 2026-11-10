'use strict';

const VehicleArt = (() => {
    const sizes = {
        bike: { w: 24, d: 7 }, scooter: { w: 23, d: 7 }, ebike: { w: 25, d: 8 },
        car: { w: 28, d: 14 }, truck: { w: 32, d: 16 }
    };
    function draw(c, { ctx, P, poly, shade }) {
        const cx = c.x + c.w / 2, cy = c.y + c.d / 2;
        const [fx, fy] = c.heading || [1, 0], sx = -fy, sy = fx;
        const point = (forward, side, z = 0) => P(cx + forward * fx + side * sx, cy + forward * fy + side * sy, z);
        const face = (points, color, stroke = '#18212b99') => poly(points.map(([f, s, z]) => point(f, s, z)), color, stroke);
        // Screen depth runs along world x+y, so only faces whose outward normal points that way are seen.
        const facing = (nx, ny) => nx + ny > 1e-6;
        const frontSeen = facing(fx, fy), backSeen = facing(-fx, -fy);
        const sides = [-1, 1].filter(side => facing(side * sx, side * sy));
        const prism = (f0, f1, s0, s1, z0, z1, color) => {
            if (backSeen) face([[f0,s0,z0],[f0,s1,z0],[f0,s1,z1],[f0,s0,z1]], shade(color, .65));
            if (frontSeen) face([[f1,s0,z0],[f1,s1,z0],[f1,s1,z1],[f1,s0,z1]], shade(color, .8));
            for (const side of sides) {
                const s = side < 0 ? s0 : s1;
                face([[f0,s,z0],[f1,s,z0],[f1,s,z1],[f0,s,z1]], shade(color, side < 0 ? .85 : .7));
            }
            face([[f0,s0,z1],[f1,s0,z1],[f1,s1,z1],[f0,s1,z1]], shade(color, 1.18));
        };
        const hw = c.w / 2, hd = c.d / 2, glass = '#294455';
        const cab0 = c.kind === 'truck' ? -c.w * .05 : -c.w * .22, cab1 = c.w * .24, cabS = hd * .82;
        face([[-hw,-hd,0],[hw,-hd,0],[hw,hd,0],[-hw,hd,0]], '#00000055', null);
        // Tires sit inside the body footprint, in the wheel's forward/height plane.
        // Draw them before the chassis so the upper halves tuck beneath the fenders.
        for (const side of [-1, 1]) for (const f of [-c.w * .3, c.w * .3]) {
            const outer = side * (hd - .2), inner = side * (hd - 1.6), r = 3.2;
            const ring = Array.from({ length: 20 }, (_, i) => {
                const angle = i * Math.PI / 10;
                return [f + Math.cos(angle) * r, outer, r + Math.sin(angle) * r];
            });
            for (let i = 0; i < ring.length; i++) {
                const a = ring[i], b = ring[(i + 1) % ring.length];
                face([a, b, [b[0], inner, b[2]], [a[0], inner, a[2]]], '#141b24', null);
            }
            face(ring, '#101821', null);
            if (sides.includes(side)) {
                const hub = Array.from({ length: 16 }, (_, i) => {
                    const angle = i * Math.PI / 8;
                    return [f + Math.cos(angle) * 1.45, outer, r + Math.sin(angle) * 1.45];
                });
                face(hub, '#aebbc4', '#53616c');
            }
        }
        prism(-hw, hw, -hd, hd, 5, 10, c.color);
        for (const side of sides) {
            const outer = side * (hd + .1);
            face([[-hw*.9,outer,6],[hw*.9,outer,6],[hw*.9,outer,7],[-hw*.9,outer,7]], c.trim || '#d5d9d5', null);
        }
        if (frontSeen) {
            face([[hw+.1,-hd*.8,6],[hw+.1,-hd*.35,6],[hw+.1,-hd*.35,9],[hw+.1,-hd*.8,9]], '#fef9c3');
            face([[hw+.1,hd*.35,6],[hw+.1,hd*.8,6],[hw+.1,hd*.8,9],[hw+.1,hd*.35,9]], '#fef9c3');
        }
        if (backSeen) face([[-hw-.1,-hd*.8,6],[-hw-.1,hd*.8,6],[-hw-.1,hd*.8,8],[-hw-.1,-hd*.8,8]], '#ef4444');
        if (c.kind === 'truck') {
            const bed0 = -hw * .9, bed1 = -c.w * .12, bedS = hd * .7;
            face([[bed0,-bedS,10.05],[bed1,-bedS,10.05],[bed1,bedS,10.05],[bed0,bedS,10.05]], '#1f2937');
        }
        prism(cab0, cab1, -cabS, cabS, 10, 18, c.color);
        for (const side of sides) {
            const s = side * (cabS + .05);
            face([[cab0+c.w*.03,s,12],[cab1-c.w*.03,s,12],[cab1-c.w*.03,s,16],[cab0+c.w*.03,s,16]], glass);
        }
        if (frontSeen) face([[cab1+.05,-cabS*.85,11.5],[cab1+.05,cabS*.85,11.5],[cab1+.05,cabS*.85,16.5],[cab1+.05,-cabS*.85,16.5]], glass);
        if (backSeen) face([[cab0-.05,-cabS*.8,12],[cab0-.05,cabS*.8,12],[cab0-.05,cabS*.8,16],[cab0-.05,-cabS*.8,16]], glass);
    }
    return { sizes, draw };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = VehicleArt;
