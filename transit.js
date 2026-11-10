'use strict';
const CityTransit = (() => {
    const layout = typeof module !== 'undefined' && module.exports ? require('./city-layout.js') : CityLayout;
    const quadrants = ['NW', 'NE', 'SE', 'SW'];
    const services = {
        bus: { fare: 2, speed: 1.3, label: 'Bus' },
        train: { fare: 4, speed: 2.6, label: 'Metro train' }
    };
    const WALK_SPEED = (3.6 / 5) * 1.2 * 1.2 * 60;
    function duration(mode, origin, destination) {
        if (!Object.hasOwn(services, mode) || !quadrants.includes(origin) || !quadrants.includes(destination) || origin === destination)
            throw new Error('Invalid transit route');
        const coordinates = { NW: [0, 0], NE: [1, 0], SW: [0, 1], SE: [1, 1] };
        const a = coordinates[origin], b = coordinates[destination];
        const distance = (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])) * 2 * layout.world / Math.SQRT2;
        return distance / (WALK_SPEED * services[mode].speed) * 1000;
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
    return { services, valid, start, position, duration };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CityTransit;
