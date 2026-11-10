'use strict';

// Original go-go groove in the modern DMV bounce-beat style, built with Web Audio.
// Licensed recordings can replace it through music/playlist.json.
const GoGoMusic = (() => {
    const BPM = 96, STEPS = 16, BARS = 8, SWING = .16;
    const TITLE = 'Pocket at the 202 (original go-go groove)';
    const note = name => {
        const [, letter, sharp, octave] = /^([A-G])(#?)(\d)$/.exec(name);
        const semis = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter] + (sharp ? 1 : 0);
        return 440 * 2 ** ((semis + (Number(octave) + 1) * 12 - 69) / 12);
    };
    const bassE = [[0, 'E2', .45], [3, 'E2', .2], [6, 'G2', .4], [8, 'A2', .35], [10, 'B2', .2], [12, 'D3', .2], [14, 'B2', .25]];
    const bassA = [[0, 'A2', .45], [3, 'A2', .2], [6, 'C3', .4], [8, 'D3', .35], [10, 'E3', .2], [12, 'G2', .2], [14, 'E2', .25]];
    const congaA = { high: [2, 6, 11, 14], slap: [3, 8], low: [0, 10] };
    const congaB = { high: [2, 5, 8, 14], slap: [3, 11], low: [6, 10, 13] };
    const bellA = [0, 3, 6, 10, 12], bellB = [2, 4, 8, 11, 14];
    const hornCall = [[0, 'B4', .3], [2, 'D5', .3], [4, 'E5', .6]];
    const hornAnswer = [[0, 'E5', .3], [2, 'D5', .3], [4, 'B4', .3], [6, 'A4', .6]];

    // Every fourth cycle is a percussion breakdown: congas, cowbell, roto-toms and drums only.
    function events(bar, step, cycle = 0) {
        if (![bar, step, cycle].every(Number.isInteger) || bar < 0 || bar >= BARS || step < 0 || step >= STEPS || cycle < 0)
            throw new Error('Invalid go-go step');
        const out = [], breakdown = cycle % 4 === 3 && bar < 4, b = bar % 2 ? 'B' : 'A';
        if ([0, 7, 10].includes(step)) out.push({ inst: 'kick', vel: step ? .75 : 1 });
        if (step === 4 || step === 12) out.push({ inst: 'snare', vel: 1 });
        if (step === 9 || step === 15) out.push({ inst: 'snare', vel: .22 });
        if (bar !== 7 || step < 12) out.push({ inst: 'hat', vel: step % 2 ? .18 : .45, open: bar % 2 === 1 && step === 14 });
        const conga = b === 'A' ? congaA : congaB;
        for (const kind of ['high', 'slap', 'low']) if (conga[kind].includes(step)) out.push({ inst: 'conga', kind, vel: kind === 'slap' ? .7 : .85 });
        if ((b === 'A' ? bellA : bellB).includes(step)) out.push({ inst: 'cowbell', vel: step === (b === 'A' ? 0 : 2) ? .9 : .6 });
        if (bar === 7 && step >= 12) out.push({ inst: 'roto', pitch: [320, 260, 210, 165][step - 12], vel: .9 });
        if (bar === 3 && step === 15) out.push({ inst: 'timbale', vel: .8 });
        if (!breakdown) {
            for (const [s, n, len] of bar >= 6 ? bassA : bassE) if (s === step) out.push({ inst: 'bass', freq: note(n), len, vel: .8 });
            if (step === 6 || step === 14) out.push({ inst: 'keys', chord: (bar >= 6 ? ['A3', 'C#4', 'E4', 'G4', 'B4'] : ['E3', 'G3', 'B3', 'D4', 'F#4']).map(note), vel: .5 });
            const horn = bar === 3 ? hornCall : bar === 7 ? hornAnswer : [];
            for (const [s, n, len] of horn) if (s === step) out.push({ inst: 'horn', freq: note(n), len, vel: .55 });
        }
        return out;
    }
    const stepDuration = () => 60 / BPM / 4;
    const swingOffset = step => step % 2 ? SWING * stepDuration() : 0;

    function validPlaylist(data) {
        if (!data || !Array.isArray(data.tracks)) return [];
        return data.tracks.filter(t => t && typeof t.title === 'string' && t.title.trim() && typeof t.artist === 'string' && t.artist.trim() &&
            typeof t.license === 'string' && t.license.trim() && typeof t.src === 'string' && /^music\/[\w\-. ]+\.(mp3|m4a|ogg|wav)$/i.test(t.src) && !t.src.includes('..'));
    }

    let ctx = null, master = null, noise = null, timer = null, playing = false, volume = .55;
    let nextTime = 0, position = 0, playlist = null, trackIndex = 0, audio = null;
    const listeners = new Set();
    const emit = () => listeners.forEach(fn => { try { fn(state()); } catch (e) { console.error(e); } });
    function state() {
        const track = playlist?.length ? playlist[trackIndex % playlist.length] : null;
        return { playing, volume, title: track ? track.title : TITLE, artist: track ? track.artist : 'DMV Universe house band', licensed: !!track };
    }
    function context() {
        const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
        if (!AC) throw new Error('Audio is not supported in this browser');
        if (!ctx) {
            ctx = new AC();
            master = ctx.createGain(); master.gain.value = volume * .5;
            const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
            noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
            const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }
    function env(gain, t, peak, decay) {
        gain.gain.setValueAtTime(.0001, t); gain.gain.exponentialRampToValueAtTime(peak, t + .004);
        gain.gain.exponentialRampToValueAtTime(.0001, t + decay);
    }
    function osc(type, freq, t, peak, decay, endFreq, filter) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t);
        if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + decay * .6);
        env(g, t, peak, decay);
        let node = o;
        if (filter) { const f = ctx.createBiquadFilter(); f.type = filter[0]; f.frequency.value = filter[1]; if (filter[2]) f.Q.value = filter[2]; o.connect(f); node = f; }
        node.connect(g); g.connect(master); o.start(t); o.stop(t + decay + .05);
    }
    function hiss(t, peak, decay, type, freq, q) {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = noise; f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
        env(g, t, peak, decay); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + decay + .05);
    }
    function play(e, t) {
        const v = e.vel;
        switch (e.inst) {
            case 'kick': osc('sine', 130, t, .9 * v, .3, 42); break;
            case 'snare': hiss(t, .45 * v, .16, 'highpass', 1500); osc('triangle', 210, t, .25 * v, .09, 160); break;
            case 'hat': hiss(t, .16 * v, e.open ? .22 : .04, 'highpass', 7500); break;
            case 'conga':
                if (e.kind === 'slap') { hiss(t, .28 * v, .05, 'bandpass', 2200, 1.5); osc('sine', 420, t, .25 * v, .06, 380); }
                else osc('sine', e.kind === 'high' ? 340 : 225, t, .55 * v, e.kind === 'high' ? .2 : .28, e.kind === 'high' ? 315 : 205);
                break;
            case 'cowbell': osc('square', 545, t, .12 * v, .22, 0, ['bandpass', 800, 3]); osc('square', 815, t, .1 * v, .22, 0, ['bandpass', 800, 3]); break;
            case 'roto': osc('sine', e.pitch, t, .55 * v, .22, e.pitch * .7); hiss(t, .1 * v, .03, 'bandpass', 3000); break;
            case 'timbale': osc('triangle', 620, t, .35 * v, .3, 560); hiss(t, .25 * v, .08, 'highpass', 3000); break;
            case 'bass': osc('sawtooth', e.freq, t, .38 * v, e.len, 0, ['lowpass', 520, 4]); osc('sine', e.freq, t, .4 * v, e.len); break;
            case 'keys': e.chord.forEach(f => osc('square', f, t, .045 * v, .18, 0, ['lowpass', 1800])); break;
            case 'horn': osc('sawtooth', e.freq, t, .13 * v, e.len, 0, ['lowpass', 2400, 2]); osc('sawtooth', e.freq * 1.005, t, .1 * v, e.len, 0, ['lowpass', 2400, 2]); break;
        }
    }
    function schedule() {
        while (nextTime < ctx.currentTime + .15) {
            const step = position % STEPS, bar = Math.floor(position / STEPS) % BARS, cycle = Math.floor(position / (STEPS * BARS));
            for (const e of events(bar, step, cycle)) play(e, nextTime + swingOffset(step));
            nextTime += stepDuration(); position++;
        }
    }
    function playTrack() {
        const track = playlist[trackIndex % playlist.length];
        audio = audio || new Audio();
        audio.src = track.src; audio.volume = volume;
        audio.onended = () => { trackIndex++; if (playing) playTrack(); emit(); };
        audio.onerror = () => { console.error('Licensed go-go track failed; using the original groove.'); playlist = []; audio = null; if (playing) { playing = false; start(); } };
        audio.play().catch(error => console.error('Unable to start go-go track:', error));
    }
    async function loadPlaylist() {
        if (playlist !== null) return playlist;
        try {
            const response = await fetch('music/playlist.json', { cache: 'no-cache' });
            playlist = response.ok ? validPlaylist(await response.json()) : [];
        } catch (error) { playlist = []; }
        return playlist;
    }
    function start() {
        if (playing) return state();
        playing = true;
        if (playlist?.length) playTrack();
        else {
            const c = context();
            nextTime = c.currentTime + .08; position = 0;
            master.gain.cancelScheduledValues(c.currentTime); master.gain.setValueAtTime(volume * .5, c.currentTime);
            schedule(); timer = setInterval(schedule, 25);
        }
        emit(); return state();
    }
    function stop() {
        if (!playing) return state();
        playing = false;
        clearInterval(timer); timer = null;
        if (audio) audio.pause();
        if (ctx && master) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(.0001, ctx.currentTime, .05); }
        emit(); return state();
    }
    function setVolume(v) {
        if (!Number.isFinite(v)) throw new Error('Invalid volume');
        volume = Math.max(0, Math.min(1, v));
        if (audio) audio.volume = volume;
        if (ctx && master && playing) master.gain.setTargetAtTime(Math.max(.0001, volume * .5), ctx.currentTime, .05);
        emit(); return state();
    }
    const onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
    return { BPM, STEPS, BARS, SWING, TITLE, note, events, swingOffset, validPlaylist, loadPlaylist, start, stop, setVolume, state, onChange };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = GoGoMusic;
