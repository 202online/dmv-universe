'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Minigames = require('./mg-core.js');
const Campaign = require('./mg-progression.js');

function hostStub() {
    const noop = () => {};
    const context = new Proxy({}, { get: (target, key) => key in target ? target[key] :
        key === 'createLinearGradient' ? () => ({ addColorStop: noop }) : noop });
    const element = () => ({
        style: {}, dataset: {}, hidden: true, disabled: false, textContent: '', listeners: {},
        setAttribute: noop,
        addEventListener(event, fn) { this.listeners[event] = fn; },
        getContext: () => context,
        click() { if (!this.disabled) this.listeners.click(); }
    });
    const nodes = {};
    return {
        set innerHTML(html) {
            for (const id of html.matchAll(/id="([^"]+)"/g)) nodes[`#${id[1]}`] = element();
            if (nodes['#mg-level-select'])
                nodes['#mg-level-select'].options = [...html.matchAll(/<option value="(\d+)"/g)].map(match => ({ value: match[1] }));
        },
        querySelector: key => nodes[key],
        querySelectorAll: () => []
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
        assert.equal(host.querySelector('#mg-level-select').options.length, 50);
        assert.equal(host.querySelector('#mg-level-select').options.at(-1).value, '50');
        assert.doesNotThrow(() => Minigames.open('soccer', host, api, 50));
        assert.equal(seenLevel, 50);
        assert.match(host.querySelector('#mg-campaign-info').textContent, /Testing access/);
        finish({ win: true, head: 'Test level', lines: [] });
        assert.equal(balance, 12, 'testing an unopened level does not reward stars');
        assert.equal(state.cleared.soccer, 0, 'testing an unopened level does not unlock progression');
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
        assert.equal(host.querySelector('#mg-next').hidden, false);
        host.querySelector('#mg-again').click();
        assert.equal(seenLevel, 1, 'replay does not silently advance');
        finish({ win: true, head: 'Replay', lines: [], stars: 9999 });
        assert.equal(balance, 15);
        assert.equal(Minigames._session().result.stars, 0);
        assert.match(Minigames._session().result.rewardMessage, /Already cleared/);
        host.querySelector('#mg-next').click();
        assert.equal(seenLevel, 2);
        finish({ win: true, head: 'Win', lines: [], stars: 9999 });
        assert.equal(balance, 20);
        Minigames.open('soccer', host, api);
        assert.equal(seenLevel, 3, 'returning opens the latest unlocked level');
        state.cleared.soccer = 1000;
        Minigames.open('soccer', host, api);
        assert.equal(seenLevel, 1001);
        assert.equal(host.querySelector('#mg-level-select').options.length, 51, 'picker remains bounded while retaining a high saved level');
        assert.equal(host.querySelector('#mg-level-select').options.at(-1).value, '1001');
        assert.match(host.querySelector('#mg-campaign-info').textContent, /12 stars/);
        finish({ win: true, head: 'Win', lines: [], stars: 9999 });
        assert.equal(balance, 32);
        assert.equal(host.querySelector('#mg-next').hidden, false);
        host.querySelector('#mg-next').click();
        assert.equal(seenLevel, 1002);
        host.querySelector('#mg-prev').click();
        assert.equal(seenLevel, 1001);
        host.querySelector('#mg-current').click();
        assert.equal(seenLevel, 1002);
    } finally {
        Minigames.stop();
    }
});
