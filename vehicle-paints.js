'use strict';

// Free paint jobs for owned rides. Bikes and scooters start in a random color from their set;
// cars start with a fixed default. Invalid saved paints are replaced the same way.
const VehiclePaints = (() => {
    const paints = {
        bike: {
            skyblue: { name: 'Sky blue', color: '#38bdf8', trim: '#f8fafc' },
            red: { name: 'Red', color: '#dc2626', trim: '#f8fafc' },
            pink: { name: 'Pink', color: '#f472b6', trim: '#fdf2f8' },
            lavender: { name: 'Lavender', color: '#c4b5fd', trim: '#4c1d95' },
            white: { name: 'White', color: '#f1f2ee', trim: '#1f2937' },
            black: { name: 'Black', color: '#141417', trim: '#c9ced4' }
        },
        scooter: {
            purple: { name: 'Purple', color: '#a855f7', trim: '#e5e7eb' },
            black: { name: 'Black', color: '#141417', trim: '#c9ced4' },
            pink: { name: 'Pink', color: '#f472b6', trim: '#fdf2f8' },
            lavender: { name: 'Lavender', color: '#c4b5fd', trim: '#4c1d95' },
            white: { name: 'White', color: '#f1f2ee', trim: '#1f2937' },
            teal: { name: 'Teal', color: '#14b8a6', trim: '#f0fdfa' }
        },
        ebike: {
            green: { name: 'Green', color: '#10b981', trim: '#f8fafc' },
            white: { name: 'White', color: '#f1f2ee', trim: '#1f2937' },
            pink: { name: 'Pink', color: '#f472b6', trim: '#fdf2f8' },
            lavender: { name: 'Lavender', color: '#c4b5fd', trim: '#4c1d95' },
            black: { name: 'Black', color: '#141417', trim: '#c9ced4' },
            yellow: { name: 'Yellow', color: '#facc15', trim: '#1f2937' }
        },
        impala: {
            red: { name: 'Red', color: '#c8102e', trim: '#f8fafc' },
            pink: { name: 'Pink', color: '#f472b6', trim: '#fdf2f8' },
            black: { name: 'Black', color: '#141417', trim: '#c9ced4' },
            skyblue: { name: 'Sky blue', color: '#7cc4ec', trim: '#f8fafc' },
            white: { name: 'White', color: '#f1f2ee', trim: '#1f2937' },
            burgundy: { name: 'Burgundy', color: '#5a1414', trim: '#ffb612' }
        },
        truck: {
            black: { name: 'Black', color: '#141417', trim: '#c9ced4' },
            silver: { name: 'Silver', color: '#a7adb5', trim: '#1f2937' },
            blue: { name: 'Blue', color: '#1d4fbf', trim: '#e2e8f0' },
            lavender: { name: 'Lavender', color: '#c4b5fd', trim: '#4c1d95' },
            white: { name: 'White', color: '#f1f2ee', trim: '#1f2937' },
            orange: { name: 'Orange', color: '#f0751a', trim: '#1f2937' }
        }
    };
    const defaults = { impala: 'red', truck: 'silver' };
    const randomStart = ['bike', 'scooter', 'ebike'];
    const paintable = id => Object.hasOwn(paints, id);
    const options = id => paintable(id) ? Object.entries(paints[id]).map(([paint, p]) => ({ id: paint, ...p })) : [];
    const valid = (id, paint) => paintable(id) && typeof paint === 'string' && Object.hasOwn(paints[id], paint);
    function initial(random = Math.random) {
        const result = { ...defaults };
        for (const id of randomStart) {
            const ids = Object.keys(paints[id]);
            result[id] = ids[Math.min(ids.length - 1, Math.floor(random() * ids.length))];
        }
        return result;
    }
    function restore(saved, random = Math.random) {
        const result = initial(random);
        if (saved && typeof saved === 'object')
            for (const id of Object.keys(paints)) if (valid(id, saved[id])) result[id] = saved[id];
        return result;
    }
    function look(id, paint) {
        if (!paintable(id)) return {};
        const p = paints[id][valid(id, paint) ? paint : defaults[id] || Object.keys(paints[id])[0]];
        return { color: p.color, trim: p.trim };
    }
    return { paints, defaults, randomStart, paintable, options, valid, initial, restore, look };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = VehiclePaints;
