'use strict';

const CasinoEvents = {
    entryStars: 5,
    chips: 1000,
    // Add announced events with unique id, title, startsAt and endsAt ISO timestamps.
    schedule: []
};

if (typeof module !== 'undefined' && module.exports) module.exports = CasinoEvents;
