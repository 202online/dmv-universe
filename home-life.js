'use strict';

const HomeLife = (() => {
    const DAY = 24 * 60 * 60 * 1000;
    const features = {
        tv: { name: 'Living Room TV', price: null },
        computer: { name: 'Personal Computer', price: null },
        pets: { name: 'Pet Habitat & Companion Care', price: null }
    };
    const parking = { weeklyPrice: null, monthlyMultiplier: 1.6, weekDays: 7, monthDays: 30 };
    const quests = [];
    const initial = (quadrant = null, residence = null) => ({
        quadrant, residence, unlocked: [], parkingUntil: 0, completedTasks: []
    });
    const valid = state => !!state &&
        (state.quadrant === null && state.residence === null ||
            ['NW', 'NE', 'SE', 'SW'].includes(state.quadrant) && typeof state.residence === 'string' && state.residence.length > 0) &&
        Array.isArray(state.unlocked) && state.unlocked.every(id => Object.hasOwn(features, id)) &&
        new Set(state.unlocked).size === state.unlocked.length &&
        Number.isSafeInteger(state.parkingUntil) && state.parkingUntil >= 0 &&
        Array.isArray(state.completedTasks) && state.completedTasks.every(id => typeof id === 'string' && id.length > 0) &&
        new Set(state.completedTasks).size === state.completedTasks.length;
    function restore(state) {
        if (state === undefined) return initial('SE', 'The Crib (Apartment)');
        if (!valid(state)) throw new Error('Invalid home data');
        return { ...state, unlocked: [...state.unlocked], completedTasks: [...state.completedTasks] };
    }
    function hasParking(state, now = Date.now()) { return state.parkingUntil > now; }
    function passPrice(term) {
        if (!['week', 'month'].includes(term)) throw new Error('Unknown parking pass');
        return parking.weeklyPrice === null ? null :
            Math.round(parking.weeklyPrice * (term === 'month' ? parking.monthlyMultiplier : 1));
    }
    function purchase(state, id, stars, now = Date.now()) {
        if (!Number.isSafeInteger(stars) || stars < 0) throw new Error('Invalid star balance');
        const pass = ['week', 'month'].includes(id);
        if (!pass && !Object.hasOwn(features, id)) throw new Error('Unknown home feature');
        const price = pass ? passPrice(id) : features[id].price;
        if (price === null) throw new Error('Coming soon - price not set. This feature must be purchased before home use.');
        if (!Number.isSafeInteger(price) || price < 0) throw new Error('Invalid home price');
        if (!pass && state.unlocked.includes(id)) throw new Error('You already own this home feature.');
        if (stars < price) throw new Error(`You need ${price - stars} more stars.`);
        if (pass) state.parkingUntil = Math.max(now, state.parkingUntil) + DAY * (id === 'week' ? parking.weekDays : parking.monthDays);
        else state.unlocked.push(id);
        return stars - price;
    }
    function questStatus(quest, state, definitions = quests) {
        if (quest.tasks.length && quest.tasks.every(task => state.completedTasks.includes(task.id))) return 'completed';
        const ready = (quest.requires || []).every(id => {
            const prerequisite = definitions.find(q => q.id === id);
            return prerequisite && prerequisite.tasks.length &&
                prerequisite.tasks.every(task => state.completedTasks.includes(task.id));
        });
        return ready ? 'ongoing' : 'upcoming';
    }
    function completeTask(state, taskId, definitions = quests) {
        const quest = definitions.find(q => q.tasks.some(task => task.id === taskId));
        if (!quest) throw new Error('Unknown quest task');
        if (questStatus(quest, state, definitions) !== 'ongoing' || state.completedTasks.includes(taskId)) return false;
        state.completedTasks.push(taskId);
        return true;
    }
    return { features, parking, quests, initial, valid, restore, hasParking, passPrice, purchase, questStatus, completeTask };
})();
if (typeof module !== 'undefined') module.exports = HomeLife;
