'use strict';

// First wave of generic wearables. Intentionally unpriced and unlisted:
// shops must not sell these until a price and listing are added.
const ClothingCatalog = (() => {
    const colors = {
        red: { name: 'Red', hex: '#d62828', trim: '#8f1b1b' },
        yellow: { name: 'Yellow', hex: '#f6c90e', trim: '#b38f00' },
        blue: { name: 'Blue', hex: '#1f5fd1', trim: '#143f8c' },
        green: { name: 'Green', hex: '#2a9d4b', trim: '#1b6a32' },
        black: { name: 'Black', hex: '#1c1c1f', trim: '#4a4a52' },
        pink: { name: 'Pink', hex: '#f472b6', trim: '#b8417f' },
        purple: { name: 'Purple', hex: '#7e3fbf', trim: '#55288a' },
        orange: { name: 'Orange', hex: '#f17a1d', trim: '#ad5210' }
    };
    const slots = { top: 'Top', bottom: 'Bottom', shoes: 'Shoes' };
    const styles = {
        tshirt: { slot: 'top', label: 'T-shirt' },
        sweatpants: { slot: 'bottom', label: 'Sweatpants' },
        jeans: { slot: 'bottom', label: 'Jeans' },
        sneakers: { slot: 'shoes', label: 'Shoes' }
    };
    const item = (style, color, extra = {}) => Object.freeze({
        id: `${color}-${style}`, style, slot: styles[style].slot, color, wave: 1,
        name: `Generic ${colors[color].name} ${styles[style].label}`, hex: colors[color].hex, trim: colors[color].trim,
        price: null, listed: false, ...extra
    });
    const colorIds = Object.keys(colors);
    const items = Object.freeze([
        ...colorIds.map(c => item('tshirt', c)),
        item('jeans', 'black', { name: 'Generic Black Jeans', hex: '#202024', trim: '#5b5b66' }),
        ...colorIds.map(c => item('sweatpants', c)),
        ...colorIds.map(c => item('sneakers', c))
    ]);
    const byId = Object.freeze(Object.fromEntries(items.map(i => [i.id, i])));

    function get(id) {
        if (!Object.hasOwn(byId, id)) throw new Error(`Unknown clothing item: ${id}`);
        return byId[id];
    }
    const bySlot = slot => {
        if (!Object.hasOwn(slots, slot)) throw new Error(`Unknown clothing slot: ${slot}`);
        return items.filter(i => i.slot === slot);
    };
    // Only priced, listed items may be sold; wave 1 currently has none.
    const forSale = () => items.filter(i => i.listed && Number.isInteger(i.price) && i.price >= 0);

    function preview(id) {
        const i = get(id), c = i.hex, t = i.trim;
        const art = {
            tshirt: `<path d="M30 14l12-6q8 6 16 0l12 6 14 14-10 10-6-5v45H32V33l-6 5-10-10z" fill="${c}" stroke="${t}" stroke-width="2"/><path d="M42 8q8 8 16 0" fill="none" stroke="${t}" stroke-width="2"/>`,
            sweatpants: `<path d="M30 10h40l4 74H54L50 36l-4 48H26z" fill="${c}" stroke="${t}" stroke-width="2"/><path d="M30 16h40" stroke="${t}" stroke-width="3"/><path d="M48 16v8m4-8v8" stroke="#f3f4f6" stroke-width="1.5"/><path d="M27 76h18m10 0h18" stroke="${t}" stroke-width="5"/>`,
            jeans: `<path d="M30 10h40l4 76H55L50 36l-5 50H26z" fill="${c}" stroke="${t}" stroke-width="2"/><path d="M30 17h40" stroke="${t}" stroke-width="2"/><path d="M36 17q2 9 10 9m18-9q-2 9-10 9" fill="none" stroke="#a88d5a" stroke-width="1.2" stroke-dasharray="2 2"/><path d="M50 17v18" stroke="${t}"/>`,
            sneakers: `<path d="M14 60q0-16 14-18l16-6 12 12q14 4 26 6 8 2 8 10v6H14z" fill="${c}" stroke="${t}" stroke-width="2"/><path d="M14 66h76v8H14z" fill="#f3f4f6" stroke="${t}" stroke-width="1.5"/><path d="M36 44l6 6m-1-9l6 6m-1-9l6 6" stroke="#f3f4f6" stroke-width="2"/>`
        }[i.style];
        return `<svg viewBox="0 0 100 92" role="img" aria-label="${i.name}">${art}</svg>`;
    }
    return { colors, slots, styles, items, get, bySlot, forSale, preview };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ClothingCatalog;
