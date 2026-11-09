'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Minigames = require('./mg-core.js');
const Campaign = require('./mg-progression.js');

function hostStub() {
    const noop = () => {};
    const context = new Proxy({}, { get: (target, key) => key in target ? target[key] : noop });
    const element = () => ({
        style: {}, dataset: {}, hidden: true, disabled: false, textContent: '', listeners: {},
        setAttribute: noop,
        addEventListener(event, fn) { this.listeners[event] = fn; },
        getContext: () => context,
        click() { if (!this.disabled) this.listeners.click(); }
    });
    const nodes = {}, levels = [];
    return {
        set innerHTML(html) {
            for (const id of html.matchAll(/id="([^"]+)"/g)) nodes[`#${id[1]}`] = element();
            levels.length = 0;
            for (const match of html.matchAll(/data-level="(\d+)"/g)) {
                const button = element();
                button.dataset.level = match[1];
                levels.push(button);
            }
        },
        querySelector: key => nodes[key],
        querySelectorAll: () => levels
    };
}

test('engine settles each round once, saves unlocks and balance together, and preserves replay selection', () => {
    let finish, seenLevel, balance = 12, saved;
    const state = Campaign.initial(), host = hostStub();
    Minigames.register('soccer', env => {
        finish = env.end;
        seenLevel = env.level;
        return { title: 'Soccer fixture', goal: 'Win fixture', intro: { head: 'Fixture', lines: [] },
            start() {}, update() {}, draw() {} };
    });
    const api = {
        overlay: { clientWidth: 390, clientHeight: 844, classList: { add() {}, remove() {} } },
        campaign: {
            info: () => Campaign.info(state, 'soccer'),
            settle(level, win) {
                const payout = Campaign.settle(state, 'soccer', level, win);
                balance += payout.stars;
                saved = JSON.stringify({ state, balance });
                return payout;
            }
        },
        close() {},
        award() { assert.fail('campaign must not also use legacy awards'); }
    };
    try {
        Minigames.open('soccer', host, api);
        assert.equal(seenLevel, 1);
        assert.equal(host.querySelectorAll()[1].disabled, true);
        assert.throws(() => Minigames.open('soccer', host, api, 2), /locked/);
        Minigames.open('soccer', host, api);
        Minigames._pointer('down', 1, 180, 300, 0);
        finish({ win: false, head: 'Loss', lines: [], stars: 9999 });
        assert.equal(balance, 12);
        assert.equal(Minigames._session().result.stars, 0);
        assert.equal(host.querySelector('#mg-next').hidden, true);
        host.querySelector('#mg-again').click();
        finish({ win: true, head: 'Win', lines: [], stars: 9999 });
        finish({ win: true, head: 'Duplicate', lines: [], stars: 9999 });
        assert.equal(balance, 15);
        assert.equal(state.cleared.soccer, 1);
        assert.deepEqual(JSON.parse(saved), { state, balance });
        assert.equal(host.querySelectorAll()[1].disabled, false);
        assert.equal(host.querySelector('#mg-next').hidden, false);
        host.querySelector('#mg-again').click();
        assert.equal(seenLevel, 1, 'replay does not silently advance');
        finish({ win: true, head: 'Replay', lines: [], stars: 9999 });
        assert.equal(balance, 15);
        assert.equal(Minigames._session().result.stars, 0);
        assert.match(Minigames._session().result.rewardMessage, /Practice only/);
        host.querySelector('#mg-next').click();
        assert.equal(seenLevel, 2);
        finish({ win: true, head: 'Win', lines: [], stars: 9999 });
        assert.equal(balance, 20);
        Minigames.open('soccer', host, api);
        assert.equal(seenLevel, 3, 'returning opens the latest unlocked level');
    } finally {
        Minigames.stop();
    }
});
