'use strict';

const MinigameProgression = (() => {
    const games = ['basketball', 'drive', 'football', 'soccer', 'tennis', 'golf', 'boxing', 'pool', 'airhockey', 'chess'];
    const rewards = [3, 5, 7, 9, 12];
    const replayCap = 3;
    const today = now => new Date(now).toISOString().slice(0, 10);

    function initial() {
        return { cleared: Object.fromEntries(games.map(name => [name, 0])), replay: { day: '', paid: 0 } };
    }

    function valid(state) {
        if (!state || !state.cleared || !state.replay) return false;
        const { day, paid } = state.replay;
        return games.every(name => Number.isInteger(state.cleared[name]) && state.cleared[name] >= 0 &&
            state.cleared[name] <= rewards.length) &&
            Number.isInteger(paid) && paid >= 0 && paid <= replayCap &&
            (day === '' ? paid === 0 : typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) &&
                Number.isFinite(Date.parse(day)) && today(Date.parse(day)) === day);
    }

    function info(state, name, now = Date.now()) {
        if (!games.includes(name)) throw new Error('Unknown minigame');
        const cleared = state.cleared[name];
        const remaining = today(now) > state.replay.day ? replayCap : replayCap - state.replay.paid;
        return { cleared, unlocked: Math.min(rewards.length, cleared + 1), rewards: [...rewards], remaining };
    }

    function settle(state, name, level, win, now = Date.now()) {
        const status = info(state, name, now);
        if (!Number.isInteger(level) || level < 1 || level > status.unlocked) throw new Error('Level is locked');
        if (win !== true) return { stars: 0, message: 'No stars for losses or draws. Retry free.', unlocked: false };
        if (level > status.cleared) {
            state.cleared[name] = level;
            return {
                stars: rewards[level - 1], unlocked: level < rewards.length,
                message: level < rewards.length ? `First clear! Level ${level + 1} unlocked.` : 'First clear! All 5 levels conquered.'
            };
        }
        const day = today(now);
        if (day > state.replay.day) state.replay = { day, paid: 0 };
        if (state.replay.paid >= replayCap) {
            return { stars: 0, message: 'Daily replay cap reached. Play for practice.', unlocked: false };
        }
        state.replay.paid++;
        return {
            stars: 1, unlocked: false,
            message: `Replay win! ${replayCap - state.replay.paid}/${replayCap} daily replay stars left.`
        };
    }

    return { initial, valid, info, settle, games, rewards, replayCap };
})();

if (typeof module !== 'undefined') module.exports = MinigameProgression;
