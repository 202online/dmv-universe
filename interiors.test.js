'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function node() {
    return { children: [], dataset: {}, style: { setProperty() {} }, attributes: {},
        setAttribute(k, v) { this.attributes[k] = v; }, append(...items) { this.children.push(...items); },
        prepend(item) { this.children.unshift(item); } };
}
const context = { module: { exports: {} }, CityArt: require('./city-art.js'), document: { createElement: node } };
vm.runInNewContext(fs.readFileSync(`${__dirname}/interiors.js`, 'utf8'), context);
const Interiors = context.module.exports;

test('all building interiors reuse live buttons as keyboard-accessible illustrated objects', () => {
    for (const [type, room] of Object.entries(Interiors.rooms)) {
        const buttons = new Map(room.items.map(spec => [spec.selector, node()]));
        let activated = 0;
        for (const button of buttons.values()) button.click = () => activated++;
        const content = node(), overlay = node();
        content.querySelector = selector => buttons.get(selector);
        Interiors.mount(content, type, overlay);
        assert.equal(overlay.dataset.interior, type);
        const stage = content.children[0].children[2];
        assert.equal(stage.children.length, room.items.length + 1);
        for (const spec of room.items) {
            const button = buttons.get(spec.selector);
            assert.ok(stage.children.includes(button), 'Moves original button, preserving its handler');
            assert.equal(button.attributes['aria-label'], spec.label);
            assert.match(button.innerHTML, /<svg/);
            assert.match(button.innerHTML, /aria-hidden="true"/);
            button.click();
        }
        assert.equal(activated, room.items.length);
    }
    assert.throws(() => Interiors.illustration('missing'), /Unknown interior object/);
});

test('home, gym, carryout, club and arena expose their actual working activities', () => {
    const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
    for (const selector of ['#open-home-tv', '#open-personal-computer', '#open-library-gaming'])
        assert.match(html, new RegExp(`id="${selector.slice(1)}"`));
    assert.ok(Interiors.rooms.crib.items.some(i => i.art === 'tv'));
    assert.ok(Interiors.rooms.crib.items.some(i => i.art === 'computer'));
    assert.ok(Interiors.rooms.boxing.items.some(i => i.art === 'ring'));
    assert.ok(Interiors.rooms.carryout.items.some(i => i.art === 'fryer'));
    assert.ok(Interiors.rooms.venue.items.some(i => i.art === 'stage'));
    assert.ok(Interiors.rooms.arena.items.some(i => i.selector === '#open-sportsbook'));
    assert.match(html, /activeBuilding.type === 'boxing'\) openBuildingModal\('boxing'\)/);
});

test('model home tours show the same furnishings but disable every object', () => {
    const buttons = new Map(Interiors.rooms.crib.items.map(spec => [spec.selector, node()]));
    const content = node(), overlay = node();
    content.querySelector = selector => buttons.get(selector);
    Interiors.mount(content, 'crib', overlay, { preview: true });
    const scene = content.children[0];
    assert.match(scene.children[0].textContent, /view-only/);
    assert.match(scene.children[1].textContent, /display-only/);
    for (const spec of Interiors.rooms.crib.items) {
        const button = buttons.get(spec.selector);
        assert.equal(button.disabled, true);
        assert.match(button.innerHTML, /<svg/);
        assert.match(button.attributes.title, /Display only/);
    }
});

test('residential entry distinguishes the starter home, listed tours and private homes', () => {
    const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
    const owned = { type: 'crib' }, garage = { type: 'crib', garage: true };
    const env = {
        quadrants: { SW: { buildings: [owned, garage] }, NW: { buildings: [] } },
        ResidentialArt: { listing: b => b.listed ? 'AVAILABLE' : null }
    };
    vm.runInNewContext(html.slice(html.indexOf('function homeAccess('), html.indexOf('function checkInteraction(')) +
        ';globalThis.access=homeAccess;', env);
    assert.equal(env.access(owned), 'owned');
    assert.equal(env.access(garage), 'owned');
    assert.equal(env.access({ type: 'crib', listed: true }), 'preview');
    assert.equal(env.access({ type: 'crib', listed: false }), 'private');
    assert.equal(env.access({ type: 'library' }), 'venue');
    assert.match(html, /if \(homeAccess\(b\) === 'private'\) continue/);
    assert.match(html, /openBuildingModal\(activeBuilding.type, activeBuilding\)/);
    assert.match(html, /VenueInteriors.mount\(content, type, modalEl, \{ preview: true \}\);\s*return;/);
});

test('oval arena and detailed avatars render finite geometry for all saved appearance choices', () => {
    const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
    const canvas = new Proxy({}, { get: (target, key) => key in target ? target[key] : (...args) => {
        args.filter(a => typeof a === 'number').forEach(n => assert.ok(Number.isFinite(n), `${key}: ${n}`));
    } });
    let polygons = 0;
    const env = {
        ctx: canvas, P: (x, y, z = 0) => [x - y, (x + y) / 2 - z],
        poly(points) { polygons++; points.flat().forEach(n => assert.ok(Number.isFinite(n))); },
        shade: color => color, skinColors: { medium: '#a37654' }, hairColors: { black: '#23170f' },
        AvatarMotion: require('./avatar-motion.js'), performance: { now: () => 1234 }
    };
    const arena = html.slice(html.indexOf('function drawOvalArena('), html.indexOf('function drawBuilding('));
    const avatar = html.slice(html.indexOf('function drawAvatar('), html.indexOf('function drawPlayer('));
    const faces = html.slice(html.indexOf('const avatarExpressions'), html.indexOf('const defaultFeatures'));
    vm.runInNewContext(`${faces}\nglobalThis.moods = moods;\n${arena}\n${avatar}\nglobalThis.arena = drawOvalArena; globalThis.avatar = drawAvatar;`, env);
    env.arena({ x: 200, y: 100, w: 260, d: 170, h: 110, color: '#567', trim: '#abc' }, true, 1);
    assert.ok(polygons > 150, 'Arena uses curved rings and glass segments rather than a box');
    for (const hair of ['short', 'curly', 'long'])
        for (const facial of ['none', 'mustache', 'beard'])
            for (const appearance of ['boy', 'girl'])
                for (const [fx, fy] of [[0, 1], [1, 0], [0, -1]])
                    for (const motion of [undefined, { t: 3.12, walk: .6, phase: 1.3, blink: .9 }, { t: 7, walk: 1, phase: 4, blink: .3 }])
                        for (const mood of [undefined, ...env.moods])
                            env.avatar(canvas, 100, 100, appearance, { hair, facial, color: 'black', skin: 'medium', mood }, '#eee', .5, 2, fx, fy, motion);
    assert.deepEqual([...env.moods], ['happy', 'excited', 'calm', 'cool', 'surprised', 'sad', 'mad']);
    for (const mood of env.moods) assert.ok(html.includes(`<option value="${mood}">`), `creator offers ${mood}`);
});
