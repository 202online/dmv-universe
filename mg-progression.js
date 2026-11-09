'use strict';

const MinigameProgression = (() => {
    const games = ['basketball', 'drive', 'football', 'soccer', 'tennis', 'golf', 'boxing', 'pool', 'airhockey', 'chess'];
    const rewards = [3, 5, 7, 9, 12];

    function initial() {
        return { cleared: Object.fromEntries(games.map(name => [name, 0])) };
    }

    function valid(state) {
        if (!state || !state.cleared) return false;
        return games.every(name => Number.isInteger(state.cleared[name]) && state.cleared[name] >= 0 &&
            state.cleared[name] <= rewards.length);
    }

    function info(state, name) {
        if (!games.includes(name)) throw new Error('Unknown minigame');
        const cleared = state.cleared[name];
        return { cleared, unlocked: Math.min(rewards.length, cleared + 1), rewards: [...rewards] };
    }

    function settle(state, name, level, win) {
        const status = info(state, name);
        if (!Number.isInteger(level) || level < 1 || level > status.unlocked) throw new Error('Level is locked');
        if (win !== true) return { stars: 0, message: 'No stars for losses or draws. Retry free.', unlocked: false };
        if (level > status.cleared) {
            state.cleared[name] = level;
            return {
                stars: rewards[level - 1], unlocked: level < rewards.length,
                message: level < rewards.length ? `First clear! Level ${level + 1} unlocked.` : 'First clear! All 5 levels conquered.'
            };
        }
        return { stars: 0, message: 'Already cleared. Practice only - no stars.', unlocked: false };
    }

    return { initial, valid, info, settle, games, rewards };
})();

if (typeof module !== 'undefined') module.exports = MinigameProgression;
