'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const Catalog = require('./clothing-catalog.js');

const colorIds = ['red', 'yellow', 'blue', 'green', 'black', 'pink', 'purple', 'orange'];

test('wave 1 has 8 tees, 8 sweatpants, 8 shoes and black jeans', () => {
    assert.deepStrictEqual(Object.keys(Catalog.colors), colorIds);
    const count = style => Catalog.items.filter(i => i.style === style).length;
    assert.strictEqual(count('tshirt'), 8);
    assert.strictEqual(count('sweatpants'), 8);
    assert.strictEqual(count('sneakers'), 8);
    assert.strictEqual(count('jeans'), 1);
    assert.strictEqual(Catalog.get('black-jeans').name, 'Generic Black Jeans');
    assert.strictEqual(Catalog.items.length, 25);
    for (const style of ['tshirt', 'sweatpants', 'sneakers'])
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
    assert.throws(() => Catalog.bySlot('hat'));
    assert.throws(() => Catalog.get('gold-tshirt'));
});

test('wave 1 is unpriced and not placed in any shop', () => {
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
