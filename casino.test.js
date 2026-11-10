'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Casino = require('./casino.js');
const Events = require('./casino-events.js');
const dice = (a, b) => { let i = 0; return () => ([a, b][i++] - .5) / 6; };
function hand(w, player, dealer, next = []) {
    const used = [...player, ...dealer, ...next];
    const deck = Array.from({ length: 52 }, (_, i) => i).filter(i => !used.includes(i)).concat([...next].reverse());
    w.balance -= 500;
    w.blackjack = { bet: 500, player, dealer, deck };
    assert.ok(Casino.validWallet(w));
}

test('casino wallets and unfinished rounds survive saves without touching city stars or sports credits', () => {
    const state = Casino.initial();
    assert.ok(Casino.valid(state));
    hand(state.practice, [9, 6], [8, 7]); // 17 vs 17
    const saved = JSON.parse(JSON.stringify(state));
    assert.equal(saved.practice.balance, 99500);
    assert.equal(Casino.blackjackAction(saved.practice, 'stand').text.includes('push'), true);
    assert.equal(saved.practice.balance, 100000);
    assert.equal(saved.practice.rounds, 1);
    assert.throws(() => Casino.blackjackAction(saved.practice, 'stand'), /No active/);
    assert.equal(saved.practice.balance, 100000);
});

test('blackjack handles soft aces, hits, busts, dealer draws and natural payouts', () => {
    assert.equal(Casino.total([0, 13, 9]), 12);
    const winning = Casino.wallet();
    hand(winning, [9, 8], [7, 6], [22]); // 19; dealer 15 + ten busts
    Casino.blackjackAction(winning, 'stand');
    assert.equal(winning.balance, 100500);
    const bust = Casino.wallet();
    hand(bust, [9, 8], [7, 6], [22]);
    Casino.blackjackAction(bust, 'hit');
    assert.equal(bust.balance, 99500);
    assert.ok(Casino.validWallet(bust));
    const soft = Casino.wallet();
    hand(soft, [0, 4], [12, 6], [13]); // 16 + ace = 17
    Casino.blackjackAction(soft, 'hit');
    assert.equal(Casino.total(soft.blackjack.player), 17);
    assert.ok(Casino.validWallet(soft));
    let sawNatural = false;
    for (let seed = 1; seed < 1000 && !sawNatural; seed++) {
        let n = seed;
        const w = Casino.wallet(), result = Casino.blackjackStart(w, 500, () => ((n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296));
        if (result.text.includes('natural blackjack')) {
            assert.equal(w.balance, 100750);
            sawNatural = true;
        }
        assert.ok(Casino.validWallet(w));
    }
    assert.ok(sawNatural);
});

test('craps pass line debits once and correctly handles every point and come-out result', () => {
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) {
        const w = Casino.wallet(), sum = a + b;
        Casino.crapsRoll(w, 500, dice(a, b));
        if ([7, 11].includes(sum)) assert.equal(w.balance, 100500);
        else if ([2, 3, 12].includes(sum)) assert.equal(w.balance, 99500);
        else {
            assert.equal(w.craps.point, sum);
            assert.equal(w.balance, 99500);
            const clone = JSON.parse(JSON.stringify(w));
            Casino.crapsRoll(w, 10000, dice(a, b));
            assert.equal(w.balance, 100500, 'point payout uses original stake');
            Casino.crapsRoll(clone, 10000, dice(3, 4));
            assert.equal(clone.balance, 99500, 'seven out does not deduct a second stake');
        }
        assert.ok(Casino.validWallet(w));
    }
});

test('roulette covers all 37 pockets and uses European payouts including losing zero on red/black', () => {
    for (let n = 0; n <= 36; n++) {
        const w = Casino.wallet();
        const result = Casino.roulette(w, 100, 'number', n, () => (n + .5) / 37);
        assert.equal(result.number, n);
        assert.equal(w.balance, 103500);
        assert.ok(Casino.validWallet(w));
    }
    for (const pick of ['red', 'black']) {
        const w = Casino.wallet();
        Casino.roulette(w, 500, pick, 0, () => 0);
        assert.equal(w.balance, 99500);
    }
});

test('slots use the displayed paytable and never charge twice per spin', () => {
    for (const [i, payout] of [5, 8, 12, 25].entries()) {
        const w = Casino.wallet();
        Casino.slots(w, 500, () => (i + .5) / 4);
        assert.equal(w.balance, 100000 - 500 + payout * 500);
        assert.equal(w.rounds, 1);
    }
    const w = Casino.wallet(); let n = 0;
    Casino.slots(w, 500, () => [0, .3, .7][n++]);
    assert.equal(w.balance, 99500);
});

test('invalid bets and failed random draws never spend, and active rounds block other tables', () => {
    for (const bet of [0, -100, 1.5, 150, 10001, NaN, Infinity]) {
        const w = Casino.wallet(), before = JSON.stringify(w);
        assert.throws(() => Casino.slots(w, bet), /stake/);
        assert.equal(JSON.stringify(w), before);
    }
    const w = Casino.wallet();
    assert.throws(() => Casino.roulette(w, 100, 'number', 37), /Choose/);
    assert.throws(() => Casino.blackjackStart(w, 100, () => NaN), /Random/);
    assert.throws(() => Casino.crapsRoll(w, 100, () => 1), /Random/);
    assert.equal(w.balance, 100000);
    Casino.crapsRoll(w, 500, dice(2, 2));
    const before = JSON.stringify(w);
    assert.throws(() => Casino.slots(w, 500), /Finish/);
    assert.equal(JSON.stringify(w), before);
});

test('scheduled promos charge exactly five stars once, create isolated chips and enforce time boundaries', () => {
    assert.deepEqual(Events.schedule, []);
    const list = [{ id: 'test-night', title: 'Test Night', startsAt: '2026-12-01T18:00:00-05:00', endsAt: '2026-12-01T22:00:00-05:00' }];
    const start = Date.parse(list[0].startsAt), end = Date.parse(list[0].endsAt);
    const state = Casino.initial(), before = JSON.stringify(state);
    assert.throws(() => Casino.enterEvent(state, 'test-night', 12, start - 1, list), /not open/);
    assert.throws(() => Casino.enterEvent(state, 'test-night', 4, start, list), /5 city stars/);
    assert.equal(JSON.stringify(state), before);
    const stars = Casino.enterEvent(state, 'test-night', 12, start, list);
    assert.equal(stars, 7);
    assert.equal(state.events[0].wallet.balance, 100000);
    assert.equal(state.practice.balance, 100000);
    assert.throws(() => Casino.enterEvent(state, 'test-night', stars, start + 1, list), /already entered/);
    assert.ok(Casino.isActive(list[0], end - 1));
    assert.ok(!Casino.isActive(list[0], end));
    assert.ok(Casino.valid(JSON.parse(JSON.stringify(state))));
    assert.throws(() => Casino.events([...list, ...list]), /Invalid/);
    assert.throws(() => Casino.events([{ ...list[0], id: undefined }]), /Invalid/);
    assert.throws(() => Casino.events([{ ...list[0], startsAt: '2026-12-01T18:00:00' }]), /Invalid/);
});

test('malformed casino saves are rejected instead of silently refilling chips', () => {
    for (const change of [
        s => { s.practice.balance = -1; },
        s => { s.practice.craps = { point: 7, bet: 100 }; },
        s => { s.practice.blackjack = { bet: 100, player: [0, 0], dealer: [1, 2], deck: [] }; },
        s => { s.events = [{ id: '<script>', enteredAt: 0, wallet: Casino.wallet() }]; }
    ]) {
        const s = Casino.initial(); change(s); assert.equal(Casino.valid(s), false);
    }
});
