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
        const prism = (f0, f1, s0, s1, z0, z1, color) => {
            const faces = [
                { f: f0, s: (s0 + s1) / 2, points: [[f0,s0,z0],[f0,s1,z0],[f0,s1,z1],[f0,s0,z1]], light: .65 },
                { f: f1, s: (s0 + s1) / 2, points: [[f1,s0,z0],[f1,s1,z0],[f1,s1,z1],[f1,s0,z1]], light: .8 },
                { f: (f0 + f1) / 2, s: s0, points: [[f0,s0,z0],[f1,s0,z0],[f1,s0,z1],[f0,s0,z1]], light: .85 },
                { f: (f0 + f1) / 2, s: s1, points: [[f0,s1,z0],[f1,s1,z0],[f1,s1,z1],[f0,s1,z1]], light: .7 }
            ];
            faces.sort((a, b) => (a.f * (fx + fy) + a.s * (sx + sy)) - (b.f * (fx + fy) + b.s * (sx + sy)))
                .forEach(side => face(side.points, shade(color, side.light)));
            face([[f0,s0,z1],[f1,s0,z1],[f1,s1,z1],[f0,s1,z1]], shade(color, 1.18));
        };
        const hw = c.w / 2, hd = c.d / 2;
        face([[-hw,-hd,0],[hw,-hd,0],[hw,hd,0],[-hw,hd,0]], '#00000055', null);
        prism(-hw, hw, -hd, hd, 3, 10, c.color);
        prism(c.kind === 'truck' ? -c.w * .05 : -c.w * .22, c.w * .24, -hd * .82, hd * .82, 10, 18, c.color);
        if (c.kind === 'truck') face([[-hw*.9,-hd*.7,11],[-c.w*.12,-hd*.7,11],[-c.w*.12,hd*.7,11],[-hw*.9,hd*.7,11]], '#1f2937');
        for (const side of [-1, 1]) {
            const s = side * hd * .83;
            face([[-c.w*.19,s,12],[c.w*.21,s,12],[c.w*.21,s,16],[-c.w*.19,s,16]], '#294455');
            const outer = side * (hd + .1);
            face([[-hw*.9,outer,6],[hw*.9,outer,6],[hw*.9,outer,7],[-hw*.9,outer,7]], c.trim || '#d5d9d5', null);
            for (const f of [-c.w * .3, c.w * .3]) {
                const [x, y] = point(f, outer, 3.5);
                ctx.fillStyle = '#101821'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#c9d0d4'; ctx.beginPath(); ctx.arc(x, y, 1.7, 0, Math.PI * 2); ctx.fill();
            }
        }
        face([[hw+.1,-hd*.8,6],[hw+.1,-hd*.35,6],[hw+.1,-hd*.35,9],[hw+.1,-hd*.8,9]], '#fef9c3');
        face([[hw+.1,hd*.35,6],[hw+.1,hd*.8,6],[hw+.1,hd*.8,9],[hw+.1,hd*.35,9]], '#fef9c3');
        face([[-hw-.1,-hd*.8,6],[-hw-.1,hd*.8,6],[-hw-.1,hd*.8,8],[-hw-.1,-hd*.8,8]], '#ef4444');
    }
    return { sizes, draw };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = VehicleArt;
