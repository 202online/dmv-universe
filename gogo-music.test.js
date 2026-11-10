'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const GoGo = require('./gogo-music.js');

const bar = (b, cycle = 0) => Array.from({ length: GoGo.STEPS }, (_, s) => GoGo.events(b, s, cycle)).flat();

test('groove is a swung go-go pocket with congas, cowbell, roto-toms and call-and-response horns', () => {
    assert.ok(GoGo.BPM >= 88 && GoGo.BPM <= 110);
    assert.equal(GoGo.swingOffset(0), 0);
    assert.ok(GoGo.swingOffset(1) > 0);
    for (let b = 0; b < GoGo.BARS; b++) {
        const events = bar(b), has = inst => events.some(e => e.inst === inst);
        assert.ok(GoGo.events(b, 0).some(e => e.inst === 'kick'), 'downbeat kick');
        assert.ok(GoGo.events(b, 4).some(e => e.inst === 'snare') && GoGo.events(b, 12).some(e => e.inst === 'snare'), 'backbeat');
        for (const inst of ['conga', 'cowbell', 'bass']) assert.ok(has(inst), `${inst} in bar ${b}`);
        assert.ok(['high', 'slap', 'low'].every(k => events.some(e => e.kind === k)), 'conga tones');
    }
    assert.ok(bar(7).filter(e => e.inst === 'roto').length === 4, 'roto-tom fill');
    assert.ok(bar(3).some(e => e.inst === 'horn') && bar(7).some(e => e.inst === 'horn'), 'call and response');
    assert.notDeepEqual(bar(0).filter(e => e.inst === 'conga'), bar(1).filter(e => e.inst === 'conga'));
    assert.ok(Math.abs(GoGo.note('A4') - 440) < 1e-9);
    assert.throws(() => GoGo.events(8, 0), /Invalid/);
});

test('every fourth cycle drops to a percussion breakdown', () => {
    const breakdown = bar(0, 3);
    assert.ok(!breakdown.some(e => ['bass', 'keys', 'horn'].includes(e.inst)));
    assert.ok(breakdown.some(e => e.inst === 'conga') && breakdown.some(e => e.inst === 'cowbell'));
    assert.ok(bar(5, 3).some(e => e.inst === 'bass'));
});

test('licensed playlist accepts only local, credited and licensed tracks', () => {
    const ok = { title: 'Track', artist: 'Band', license: 'Written permission 2026', src: 'music/track.mp3' };
    assert.deepEqual(GoGo.validPlaylist({ tracks: [ok] }), [ok]);
    for (const bad of [{ ...ok, src: 'https://example.com/a.mp3' }, { ...ok, src: 'music/../a.mp3' }, { ...ok, license: '' }, { ...ok, artist: ' ' }, { ...ok, src: 'music/a.exe' }])
        assert.deepEqual(GoGo.validPlaylist({ tracks: [bad] }), []);
    assert.deepEqual(GoGo.validPlaylist(null), []);
    assert.deepEqual(GoGo.validPlaylist(JSON.parse(fs.readFileSync(`${__dirname}/music/playlist.json`, 'utf8'))), []);
    assert.equal(GoGo.state().playing, false);
    assert.throws(() => GoGo.setVolume(NaN), /Invalid volume/);
});

test('The 202 Venue autoplays go-go and leaving stops it', () => {
    const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
    assert.match(html, /setupGoGoPlayer\(type === 'venue'\)/);
    assert.match(html, /function closeModal\(\) \{\s+GoGoMusic\.stop\(\);/);
    assert.match(html, /DMVMedia\.stopAll\(\);\s+GoGoMusic\.stop\(\);/);
});
