'use strict';

// Continuous avatar motion: the walk eases in and out instead of snapping, the body
// breathes while idle, eyes blink on an irregular rhythm and hair trails the step.
const AvatarMotion = (() => {
    const STEP_RATE = 10, EASE_RATE = 9, BLINK_MS = 140;
    const BLINK_GAPS = [3.1, 4.4, 2.6, 5.2, 3.7];
    const create = () => ({ phase: 0, walk: 0 });

    function step(state, moving, dt) {
        const d = Math.max(0, Math.min(.1, Number.isFinite(dt) ? dt : 0));
        state.walk += ((moving ? 1 : 0) - state.walk) * (1 - Math.exp(-EASE_RATE * d));
        if (state.walk < .002 && !moving) state.walk = 0;
        // Keep stepping while easing out so the legs settle rather than freeze mid-stride.
        state.phase = (state.phase + d * STEP_RATE * Math.max(state.walk, moving ? 1 : 0)) % (Math.PI * 2);
        return state;
    }
    function blink(t) {
        const cycle = BLINK_GAPS.reduce((a, b) => a + b, 0);
        let at = ((t % cycle) + cycle) % cycle;
        for (const gap of BLINK_GAPS) {
            if (at < gap) {
                const into = (gap - at) * 1000;
                return into < BLINK_MS ? Math.sin(Math.PI * into / BLINK_MS) : 0;
            }
            at -= gap;
        }
        return 0;
    }
    function pose(state, t) {
        const walk = state.walk, phase = state.phase;
        const breathe = (1 - walk) * Math.sin(t * 2.1) * .35;
        return {
            t, walk, phase,
            bob: Math.abs(Math.sin(phase)) * 2 * walk + breathe,
            sw: Math.sin(phase) * 5 * walk,
            blink: blink(t)
        };
    }
    // Hair follows the body a beat behind the step, plus a slow idle drift.
    function hair(motion = {}) {
        const { t = 0, walk = 0, phase = 0, fx = 0 } = motion;
        return {
            swayX: Math.sin(phase - .9) * 1.1 * walk - fx * .9 * walk + Math.sin(t * 1.4) * .3 * (1 - walk),
            lift: Math.max(0, Math.sin(phase * 2 - 1.2)) * .9 * walk,
            bounce: Math.sin(phase * 2 - .9) * .7 * walk
        };
    }
    const still = t => ({ t, walk: 0, phase: 0, bob: 0, sw: 0, blink: blink(t) });
    return { STEP_RATE, BLINK_MS, create, step, pose, blink, hair, still };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = AvatarMotion;
