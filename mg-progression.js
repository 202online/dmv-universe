'use strict';

const MinigameProgression = (() => {
    const originalGames = ['basketball', 'drive', 'football', 'soccer', 'tennis', 'golf', 'boxing', 'pool', 'airhockey', 'chess'];
    const additions = ['lemonade', 'subshop', 'carryout', 'resale', 'courier', 'baseball'];
    const games = [...originalGames, ...additions];
    const rewards = [3, 5, 7, 9, 12];
    const reward = level => rewards[Math.min(level - 1, rewards.length - 1)];

    function initial() {
        return { cleared: Object.fromEntries(games.map(name => [name, 0])) };
    }

    function valid(state) {
        if (!state || typeof state !== 'object' || Array.isArray(state) || !state.cleared ||
            typeof state.cleared !== 'object' || Array.isArray(state.cleared)) return false;
        if (state.rewardRemainder !== undefined &&
            (!Number.isSafeInteger(state.rewardRemainder) || state.rewardRemainder < 0 || state.rewardRemainder >= 120000)) return false;
        return games.every(name => (!Object.hasOwn(state.cleared, name) && additions.includes(name)) ||
            (Number.isSafeInteger(state.cleared[name]) && state.cleared[name] >= 0 &&
            state.cleared[name] < Number.MAX_SAFE_INTEGER));
    }

    function restore(state) {
        if (!valid(state)) throw new Error('Invalid minigame progress');
        return { ...state, cleared: { ...initial().cleared, ...state.cleared } };
    }

    function info(state, name) {
        if (!games.includes(name)) throw new Error('Unknown minigame');
        const cleared = state.cleared[name] ?? 0;
        return { cleared, unlocked: cleared + 1, reward: reward(cleared + 1) };
    }

    // Computes first-clear eligibility and its bonus cap. Currency uses settleRound.
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

    function settleRound(state, name, level, win, activeSeconds) {
        if (!Number.isFinite(activeSeconds) || activeSeconds < 0 || activeSeconds > 86400)
            throw new Error('Invalid active play time');
        const payout = settle(state, name, level, win);
        const ms = Math.floor(activeSeconds * 1000);
        // Integer units preserve fractional earnings across rounds, games and reloads.
        const play = ms * 4, skill = win === true ? ms * 3 : 0;
        const clear = payout.unlocked ? Math.min(ms, payout.stars * 120000) : 0;
        const units = (state.rewardRemainder || 0) + play + skill + clear;
        state.rewardRemainder = units % 120000;
        return {
            ...payout, stars: Math.floor(units / 120000),
            message: `${Math.floor(activeSeconds)}s active play + ${win === true ? 'win' : 'participation'} earnings${payout.unlocked ? ' + first-clear bonus' : ''}. Fractional stars saved.`
        };
    }

    return { initial, valid, restore, info, settle, settleRound, games, rewards, reward };
})();

if (typeof module !== 'undefined') module.exports = MinigameProgression;
