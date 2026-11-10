'use strict';
const CityTransit = (() => {
    const quadrants = ['NW', 'NE', 'SE', 'SW'];
    // One stop per quadrant on a one-way loop. Every trip includes one stop interval of platform wait.
    const loop = ['NW', 'NE', 'SE', 'SW'];
    const BUS_STOP_INTERVAL = 4000, TRAIN_SPEEDUP = 1.7;
    const services = {
        bus: { fare: 2, label: 'Bus', interval: BUS_STOP_INTERVAL },
        train: { fare: 4, label: 'Metro train', interval: BUS_STOP_INTERVAL / TRAIN_SPEEDUP }
    };
    function route(origin, destination) {
        if (!quadrants.includes(origin) || !quadrants.includes(destination) || origin === destination)
            throw new Error('Invalid transit route');
        const stops = [], start = loop.indexOf(origin);
        for (let i = 1; loop[(start + i) % 4] !== destination; i++) stops.push(loop[(start + i) % 4]);
        return [...stops, destination];
    }
    function duration(mode, origin, destination) {
        if (!Object.hasOwn(services, mode)) throw new Error('Invalid transit route');
        return services[mode].interval * (1 + route(origin, destination).length);
    }
    function status(trip, now) {
        if (!valid(trip) || !Number.isFinite(now)) throw new Error('Invalid transit journey time');
        const interval = services[trip.mode].interval, stops = route(trip.origin, trip.destination);
        const total = interval * (1 + stops.length), elapsed = Math.max(0, Math.min(total, now - trip.started));
        const waiting = elapsed < interval, passed = waiting ? 0 : Math.min(stops.length, Math.floor((elapsed - interval) / interval));
        return { waiting, stops, passed, nextStop: stops[Math.min(passed, stops.length - 1)],
            boardIn: waiting ? interval - elapsed : 0, remaining: total - elapsed, arrivesAt: trip.started + total };
    }
    function valid(trip) {
        return !!trip && Object.hasOwn(services, trip.mode) && quadrants.includes(trip.origin) &&
            quadrants.includes(trip.destination) && trip.origin !== trip.destination &&
            Number.isSafeInteger(trip.started) && trip.started >= 0;
    }
    function start(mode, origin, destination, stars, now) {
        const trip = { mode, origin, destination, started: now };
        if (!valid(trip)) throw new Error('Invalid transit journey');
        if (!Number.isSafeInteger(stars) || stars < services[mode].fare) throw new Error('Not enough stars for this fare');
        return trip;
    }
    function position(trip, now) {
        if (!valid(trip) || !Number.isFinite(now)) throw new Error('Invalid transit journey time');
        return Math.max(0, Math.min(1, (now - trip.started) / duration(trip.mode, trip.origin, trip.destination)));
    }
    return { services, loop, route, valid, start, position, duration, status };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CityTransit;
