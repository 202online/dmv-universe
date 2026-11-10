'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness() {
    let now = 0, nextTimer = 0;
    const intervals = new Map(), listeners = new Set(), spoken = [], utterances = [];
    class Element {
        constructor() { this.isConnected = true; this.disabled = false; this.style = {}; this.attributes = {}; this.events = {}; this.textContent = ''; }
        addEventListener(name, callback) { this.events[name] = callback; }
        setAttribute(name, value) { this.attributes[name] = value; }
        click() { if (!this.disabled) this.events.click?.(); }
    }
    const stage = new Element(), progress = new Element(), bar = new Element(), status = new Element(), title = new Element();
    bar.parentElement = progress;
    const buttons = Object.fromEntries(['prev', 'pause', 'next', 'voice'].map(action => {
        const element = new Element();
        element.dataset = { doc: action };
        return [action, element];
    }));
    const host = new Element();
    host.querySelector = selector => {
        if (selector === '.doc-stage') return stage;
        if (selector === '.doc-progress span') return bar;
        if (selector === '.doc-title') return title;
        if (selector === '[data-doc-status]') return status;
        return buttons[selector.match(/data-doc="(\w+)"/)[1]];
    };
    host.querySelectorAll = () => Object.values(buttons);
    const document = {
        hidden: false,
        addEventListener: (event, listener) => { assert.equal(event, 'visibilitychange'); listeners.add(listener); },
        removeEventListener: (event, listener) => listeners.delete(listener)
    };
    const module = { exports: {} };
    const context = {
        module, require, document,
        Date: class extends Date { static now() { return now; } },
        window: { speechSynthesis: { cancel() {}, speak: utterance => { spoken.push(utterance.text); utterances.push(utterance); } } },
        SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
        setInterval: callback => { intervals.set(++nextTimer, callback); return nextTimer; },
        clearInterval: id => intervals.delete(id)
    };
    vm.runInNewContext(fs.readFileSync(`${__dirname}/media.js`, 'utf8'), context);
    const media = module.exports;
    const scene = name => ({ title: name, era: '2000', narration: name, source: 'https://example.org/', seconds: 20 });
    const start = options => media.player(host, { scenes: [scene('First'), scene('Second')], title: 'Scene', icon: '', ...options });
    return { media, host, stage, bar, title, status, buttons, spoken, utterances, intervals, listeners, scene, start,
        tick(ms) { now += ms; for (const tick of [...intervals.values()]) tick(); },
        advance(ms) { now += ms; },
        visibility(hidden) { document.hidden = hidden; for (const listener of listeners) listener(); }
    };
}

test('scene navigation resets progress and its clock immediately', () => {
    const h = harness();
    h.start();
    assert.ok(h.buttons.prev.disabled);
    h.tick(5000);
    assert.equal(h.bar.style.width, '25%');
    h.advance(5000);
    h.buttons.next.click();
    assert.equal(h.bar.style.width, '0%');
    h.tick(1000);
    assert.ok(Math.abs(parseFloat(h.bar.style.width) - 5) < 0.001);
    h.buttons.prev.click();
    assert.equal(h.title.textContent, 'Scene · 1/2');
    assert.equal(h.bar.style.width, '0%');
    h.media.stopAll();
});

test('pause stops progress and resuming restarts enabled narration', () => {
    const h = harness();
    h.start();
    h.buttons.voice.click();
    assert.equal(h.spoken.length, 1);
    h.buttons.pause.click();
    h.tick(10000);
    assert.equal(h.bar.style.width, '0%');
    h.buttons.pause.click();
    assert.equal(h.spoken.length, 2);
    assert.equal(h.buttons.pause.attributes['aria-pressed'], 'false');
    h.tick(1000);
    assert.ok(parseFloat(h.bar.style.width) > 0);
    h.media.stopAll();
});

test('completion remains readable and offers a working replay', () => {
    const h = harness();
    h.start();
    h.tick(20000);
    h.tick(20000);
    assert.match(h.status.textContent, /Documentary complete/);
    assert.equal(h.bar.style.width, '100%');
    assert.equal(h.buttons.pause.textContent, '↻ Replay');
    assert.ok(h.buttons.next.disabled);
    h.buttons.pause.click();
    assert.equal(h.title.textContent, 'Scene · 1/2');
    assert.equal(h.bar.style.width, '0%');
    assert.ok(!h.buttons.next.disabled);
    h.media.stopAll();
});

test('TV back restores clip history and forward uses an existing clip before generating one', () => {
    const h = harness();
    let generated = 0;
    h.start({ scenes: [h.scene('First')], next: () => h.scene(`Generated ${++generated}`) });
    h.buttons.next.click();
    h.buttons.next.click();
    assert.equal(generated, 2);
    h.buttons.prev.click();
    assert.match(h.stage.innerHTML, /Generated 1/);
    h.buttons.next.click();
    assert.match(h.stage.innerHTML, /Generated 2/);
    assert.equal(generated, 2);
    h.media.stopAll();
});

test('backgrounding pauses the reading player until explicitly resumed', () => {
    const h = harness();
    h.start();
    h.tick(1000);
    const progress = h.bar.style.width;
    h.visibility(true);
    h.tick(100000);
    h.visibility(false);
    h.tick(1000);
    assert.equal(h.bar.style.width, progress);
    assert.equal(h.buttons.pause.textContent, '▶ Play');
    assert.match(h.status.textContent, /background/);
    h.buttons.pause.click();
    h.tick(1000);
    assert.notEqual(h.bar.style.width, progress);
    h.media.stopAll();
});

test('detaching a player or stopping it releases timers and visibility listeners', () => {
    for (const detach of [false, true]) {
        const h = harness();
        h.start();
        assert.equal(h.intervals.size, 1);
        assert.equal(h.listeners.size, 1);
        if (detach) { h.stage.isConnected = false; h.tick(250); }
        else h.media.stopAll();
        assert.equal(h.intervals.size, 0);
        assert.equal(h.listeners.size, 0);
    }
});

test('unavailable browser speech produces a visible error without breaking reading', () => {
    const h = harness();
    h.start();
    h.buttons.voice.click();
    h.utterances[0].onerror({ error: 'synthesis-unavailable' });
    assert.match(h.status.textContent, /narration is unavailable/);
    assert.equal(h.buttons.voice.attributes['aria-pressed'], 'false');
    h.buttons.next.click();
    assert.equal(h.title.textContent, 'Scene · 2/2');
    h.media.stopAll();
});
