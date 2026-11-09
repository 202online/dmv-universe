'use strict';

const MinigameProgression = (() => {
    const games = ['basketball', 'drive', 'football', 'soccer', 'tennis', 'golf', 'boxing', 'pool', 'airhockey', 'chess'];
    const rewards = [3, 5, 7, 9, 12];
    const reward = level => rewards[Math.min(level - 1, rewards.length - 1)];

    function initial() {
        return { cleared: Object.fromEntries(games.map(name => [name, 0])) };
    }

    function valid(state) {
        if (!state || !state.cleared) return false;
        return games.every(name => Number.isSafeInteger(state.cleared[name]) && state.cleared[name] >= 0 &&
            state.cleared[name] < Number.MAX_SAFE_INTEGER);
    }

    function info(state, name) {
        if (!games.includes(name)) throw new Error('Unknown minigame');
        const cleared = state.cleared[name];
        return { cleared, unlocked: cleared + 1, reward: reward(cleared + 1) };
    }

    function settle(state, name, level, win) {
        const status = info(state, name);
        if (!Number.isSafeInteger(level) || level < 1 || level > status.unlocked ||
            level >= Number.MAX_SAFE_INTEGER) throw new Error('Level is locked');
        if (win !== true) return { stars: 0, message: 'No stars for losses or draws. Retry free.', unlocked: false };
        if (level > status.cleared) {
            state.cleared[name] = level;
            return {
                stars: reward(level), unlocked: true,
                message: `First clear! Level ${level + 1} unlocked.`
            };
        }
        return { stars: 0, message: 'Already cleared. Practice only - no stars.', unlocked: false };
    }

    return { initial, valid, info, settle, games, rewards, reward };
})();

if (typeof module !== 'undefined') module.exports = MinigameProgression;
