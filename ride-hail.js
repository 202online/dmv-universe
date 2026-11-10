'use strict';
const RideHail = (() => {
    const layout = typeof module !== 'undefined' && module.exports ? require('./city-layout.js') : CityLayout;
    const quadrants = { NW:[0,0], NE:[1,0], SW:[0,1], SE:[1,1] };
    function pointValid(p) {
        return p && Object.hasOwn(quadrants,p.quadrant) && Number.isFinite(p.x) && Number.isFinite(p.y) &&
            Math.abs(p.x-p.y)<=layout.world && p.x+p.y>=0 && p.x+p.y<=2*layout.world;
    }
    function quote(pickup, dropoff) {
        if(!pointValid(pickup)||!pointValid(dropoff))throw new Error('Invalid City Ride location');
        const compass=p=>[p.x-p.y+quadrants[p.quadrant][0]*2*layout.world,
            p.x+p.y+quadrants[p.quadrant][1]*2*layout.world];
        const a=compass(pickup),b=compass(dropoff);
        const distance=(Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]))/Math.SQRT2;
        if(distance<40)throw new Error('You are already at this destination');
        return {distance,fare:6,
            duration:Math.max(5000,distance/((3.6/5)*1.2*1.2*60*1.8)*1000),speed:1.8};
    }
    function valid(trip) {
        if(!trip||trip.mode!=='taxi'||!Number.isSafeInteger(trip.started)||trip.started<0||
            !pointValid(trip.pickup)||!pointValid(trip.dropoff)||typeof trip.label!=='string'||trip.label.length>120)return false;
        try {quote(trip.pickup,trip.dropoff);return true;}catch{return false;}
    }
    function start(pickup,dropoff,label,stars,now) {
        const trip={mode:'taxi',origin:pickup.quadrant,destination:dropoff.quadrant,pickup:{...pickup},dropoff:{...dropoff},label,started:now};
        if(!valid(trip))throw new Error('Invalid City Ride booking');
        if(!Number.isSafeInteger(stars)||stars<quote(pickup,dropoff).fare)throw new Error('Not enough stars for this ride');
        return trip;
    }
    function position(trip,now) {
        if(!valid(trip)||!Number.isFinite(now))throw new Error('Invalid City Ride journey');
        return Math.max(0,Math.min(1,(now-trip.started)/quote(trip.pickup,trip.dropoff).duration));
    }
    return {quote,valid,start,position,pointValid};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=RideHail;
