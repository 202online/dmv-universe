'use strict';
const RideBag = (() => {
    const portable = ['bike', 'scooter', 'ebike'];
    function validParked(value, owned, active, world) {
        return !!value && typeof value === 'object' && !Array.isArray(value) &&
            Object.entries(value).every(([id, p]) => ['impala', 'truck'].includes(id) && owned.includes(id) && id !== active &&
                p && ['NW', 'NE', 'SE', 'SW'].includes(p.quadrant) && Number.isFinite(p.x) && Number.isFinite(p.y) &&
                (p.heading === undefined || Array.isArray(p.heading) && p.heading.length === 2 &&
                    p.heading.every(Number.isFinite) && Math.abs(Math.hypot(...p.heading)-1)<.001) &&
                Math.abs(p.x - p.y) <= world && p.x + p.y >= 0 && p.x + p.y <= 2 * world);
    }
    function abandonment(distance,since,now){
        if(!Number.isFinite(distance)||!Number.isFinite(now))throw new Error('Invalid parked vehicle distance or time');
        if(distance<60)return {since:null,secure:false};
        const started=since===null||since===undefined?now:since;
        return {since:started,secure:now-started>=60000};
    }
    return { portable, validParked, abandonment };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = RideBag;
