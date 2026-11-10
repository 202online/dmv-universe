'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const Catalog = require('./clothing-catalog.js');

const colorIds = ['red', 'yellow', 'blue', 'green', 'black', 'pink', 'purple', 'orange'];

test('catalog has 8 tees, sweatpants, shoes, zip hoodies and fitted caps plus black jeans', () => {
    assert.deepStrictEqual(Object.keys(Catalog.colors), colorIds);
    const count = style => Catalog.items.filter(i => i.style === style).length;
    assert.strictEqual(count('tshirt'), 8);
    assert.strictEqual(count('sweatpants'), 8);
    assert.strictEqual(count('sneakers'), 8);
    assert.strictEqual(count('jeans'), 1);
    assert.strictEqual(Catalog.get('black-jeans').name, 'Generic Black Jeans');
    assert.strictEqual(count('hoodie'), 8);
    assert.strictEqual(count('fittedcap'), 8);
    assert.strictEqual(Catalog.items.length, 41);
    assert.strictEqual(Catalog.get('pink-hoodie').name, 'Generic Pink Zip Hoodie');
    assert.strictEqual(Catalog.get('blue-fittedcap').name, 'Generic Blue Fitted Cap');
    for (const style of ['tshirt', 'sweatpants', 'sneakers', 'hoodie', 'fittedcap'])
        assert.deepStrictEqual(Catalog.items.filter(i => i.style === style).map(i => i.color), colorIds);
});

test('items have unique ids, valid colors and correct slots', () => {
    assert.strictEqual(new Set(Catalog.items.map(i => i.id)).size, Catalog.items.length);
    for (const i of Catalog.items) {
        assert.match(i.hex, /^#[0-9a-f]{6}$/);
        assert.match(i.trim, /^#[0-9a-f]{6}$/);
        assert.strictEqual(i.slot, Catalog.styles[i.style].slot);
        assert.ok(Object.isFrozen(i));
    }
    assert.strictEqual(Catalog.bySlot('top').length, 8);
    assert.strictEqual(Catalog.bySlot('bottom').length, 9);
    assert.strictEqual(Catalog.bySlot('shoes').length, 8);
    assert.strictEqual(Catalog.bySlot('outerwear').length, 8);
    assert.strictEqual(Catalog.bySlot('hat').length, 8);
    assert.throws(() => Catalog.bySlot('gloves'));
    assert.throws(() => Catalog.get('gold-tshirt'));
});

test('all clothing is unpriced and not placed in any shop', () => {
    for (const i of Catalog.items) {
        assert.strictEqual(i.price, null);
        assert.strictEqual(i.listed, false);
    }
    assert.deepStrictEqual(Catalog.forSale(), []);
    const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
    assert.ok(!html.includes('clothing-catalog.js'));
    assert.ok(!html.includes('ClothingCatalog'));
});

test('every item has an SVG preview', () => {
    for (const i of Catalog.items) {
        const svg = Catalog.preview(i.id);
        assert.match(svg, /^<svg[^>]*viewBox="0 0 100 92"/);
        assert.ok(svg.includes(i.hex));
        assert.ok(svg.includes(`aria-label="${i.name}"`));
    }
});

test('hoodie previews show zip and hood states', () => {
    const zipped = Catalog.preview('red-hoodie'), open = Catalog.preview('red-hoodie', { zip: 0 }), up = Catalog.preview('red-hoodie', { hood: 1 });
    assert.notStrictEqual(zipped, open);
    assert.notStrictEqual(zipped, up);
    assert.match(open, /V84/);
    assert.match(zipped, /V22/);
});

test('zip and hood animate smoothly and can reverse mid-way', () => {
    const st = Catalog.wearState();
    assert.strictEqual(Catalog.amount(st, 'zip', 0), 1);
    assert.strictEqual(Catalog.amount(st, 'hood', 0), 0);
    Catalog.toggleWear(st, 'zip', 1000);
    Catalog.toggleWear(st, 'hood', 1000);
    assert.ok(Catalog.animating(st, 1100));
    const midZip = Catalog.amount(st, 'zip', 1000 + Catalog.ANIM_MS.zip / 2);
    assert.ok(midZip > .4 && midZip < .6);
    assert.strictEqual(Catalog.amount(st, 'zip', 1000 + Catalog.ANIM_MS.zip), 0);
    assert.strictEqual(Catalog.amount(st, 'hood', 1000 + Catalog.ANIM_MS.hood), 1);
    assert.ok(!Catalog.animating(st, 2000));
    Catalog.toggleWear(st, 'hood', 2000);
    const t = 2000 + Catalog.ANIM_MS.hood / 3, partial = Catalog.amount(st, 'hood', t);
    Catalog.toggleWear(st, 'hood', t);
    assert.ok(Math.abs(Catalog.amount(st, 'hood', t) - partial) < 1e-9, 'reversing starts from the current position');
    assert.strictEqual(Catalog.amount(st, 'hood', t + Catalog.ANIM_MS.hood), 1);
    assert.throws(() => Catalog.amount(st, 'sleeves', 0));
});

test('drawWorn renders hoodies and caps in every direction and rejects wrong items', () => {
    const calls = [];
    const ctx = new Proxy({}, { get: (t, k) => k in t ? t[k] : (...a) => calls.push([k, ...a]), set: (t, k, v) => (t[k] = v, true) });
    for (const [fx, fy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) for (const hood of [false, true]) for (const zipped of [false, true]) {
        const out = Catalog.drawWorn(ctx, { hoodie: 'green-hoodie', cap: 'black-fittedcap', state: Catalog.wearState({ zipped, hoodUp: hood }) },
            { sx: 50, sy: 80, fx, fy, now: 5000 });
        assert.deepStrictEqual(out, { zip: zipped ? 1 : 0, hood: hood ? 1 : 0 });
    }
    assert.ok(calls.some(c => c[0] === 'fill' && c[1] === 'evenodd'), 'hood shell keeps the face open');
    assert.throws(() => Catalog.drawWorn(ctx, { hoodie: 'red-fittedcap' }, { sx: 0, sy: 0 }), /not a hoodie/);
    assert.throws(() => Catalog.drawWorn(ctx, { cap: 'red-hoodie' }, { sx: 0, sy: 0 }), /not a fitted cap/);
});
