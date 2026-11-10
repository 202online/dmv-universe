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

test('active time excludes intros, inactivity, hidden tabs/results and leaving settles once', () => {
    let end;
    const state = Campaign.initial(), host = hostStub(), paid = [];
    Minigames.register('tennis', env => {
        end = env.end;
        return { title: 'Time fixture', goal: 'Play', start() {}, update() {}, draw() {} };
    });
    const api = {
        campaign: {
            info: () => Campaign.info(state, 'tennis'),
            settle(level, win, seconds) {
                paid.push({ win, seconds });
                return Campaign.settleRound(state, 'tennis', level, win, seconds);
            }
        }, close() {}
    };
    const advance = n => { for (let i = 0; i < n; i++) Minigames._step(.03); };
    try {
        Minigames.open('tennis', host, api);
        advance(100);
        end({ win: true });
        assert.equal(paid.length, 0, 'intro cannot settle');
        assert.equal(Minigames._session().activeSeconds, 0);
        Minigames._pointer('down', 1, 180, 300, 0);
        advance(2000);
        const seconds = Minigames._session().activeSeconds;
        assert.ok(seconds > 29 && seconds <= 30, 'input grace expires after 30 seconds');
        global.document = { hidden: true, hasFocus: () => true };
        Minigames._pointer('move', 1, 185, 300, 61);
        advance(100);
        assert.equal(Minigames._session().activeSeconds, seconds);
        global.document = { hidden: false, hasFocus: () => false };
        advance(100);
        assert.equal(Minigames._session().activeSeconds, seconds);
        delete global.document;
        Minigames._pointer('move', 1, 190, 300, 65);
        advance(100);
        assert.ok(Minigames._session().activeSeconds > seconds);
        end({ win: false, head: 'Done', lines: [] });
        assert.equal(paid.length, 1);
        advance(100);
        end({ win: true });
        Minigames.stop();
        assert.equal(paid.length, 1, 'result and stop cannot pay the same time twice');
        Minigames.open('tennis', host, api);
        Minigames._pointer('down', 1, 180, 300, 0);
        advance(100);
        Minigames.stop();
        Minigames.stop();
        assert.equal(paid.length, 2);
        assert.equal(paid[1].win, false, 'leaving earns participation, not a win');
        assert.ok(paid[1].seconds > 2.9);
    } finally {
        delete global.document;
        Minigames.stop();
    }
});

test('engine settles each round once, saves unlocks and balance together, and preserves replay selection', () => {
    let finish, seenLevel, balance = 12, saved;
    const state = Campaign.initial(), host = hostStub();
    Minigames.register('soccer', env => {
        finish = result => {
            if (Minigames._session().phase === 'intro') Minigames._pointer('down', 1, 180, 300, 0);
            Minigames._session().activeSeconds = 60;
            env.end(result);
        };
        seenLevel = env.level;
        return { title: 'Soccer fixture', goal: 'Win fixture', intro: { head: 'Fixture', lines: [] },
            start() {}, update() {}, draw() {} };
    });
    const api = {
        overlay: { clientWidth: 390, clientHeight: 844, classList: { add() {}, remove() {} } },
        campaign: {
            info: () => Campaign.info(state, 'soccer'),
            settle(level, win, activeSeconds) {
                const payout = Campaign.settleRound(state, 'soccer', level, win, activeSeconds);
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
        assert.equal(balance, 14);
        assert.equal(Minigames._session().result.stars, 2);
        assert.equal(host.querySelector('#mg-next').hidden, true);
        host.querySelector('#mg-again').click();
        finish({ win: true, head: 'Win', lines: [], stars: 9999 });
        finish({ win: true, head: 'Duplicate', lines: [], stars: 9999 });
        assert.equal(balance, 18);
        assert.equal(state.cleared.soccer, 1);
        assert.deepEqual(JSON.parse(saved), { state, balance });
        assert.equal(host.querySelectorAll()[1].disabled, false);
        assert.equal(host.querySelector('#mg-next').hidden, false);
        host.querySelector('#mg-again').click();
        assert.equal(seenLevel, 1, 'replay does not silently advance');
        finish({ win: true, head: 'Replay', lines: [], stars: 9999 });
        assert.equal(balance, 21);
        assert.equal(Minigames._session().result.stars, 3);
        assert.doesNotMatch(Minigames._session().result.rewardMessage, /first-clear bonus/);
        host.querySelector('#mg-next').click();
        assert.equal(seenLevel, 2);
        finish({ win: true, head: 'Win', lines: [], stars: 9999 });
        assert.equal(balance, 25);
        Minigames.open('soccer', host, api);
        assert.equal(seenLevel, 3, 'returning opens the latest unlocked level');
        state.cleared.soccer = 1000;
        Minigames.open('soccer', host, api);
        assert.equal(seenLevel, 1001);
        assert.equal(host.querySelectorAll().length, 5, 'level picker remains constant size');
        assert.equal(host.querySelectorAll()[4].dataset.level, '1001');
        assert.match(host.querySelector('#mg-campaign-info').textContent, /12 stars/);
        finish({ win: true, head: 'Win', lines: [], stars: 9999 });
        assert.equal(balance, 29);
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
