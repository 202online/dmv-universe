'use strict';

const Pets = (() => {
    const settings = { adoptionOpen: true, prices: { fish: 5, turtle: 8, rabbit: 10, cat: 12, dog: 15 } };
    const homeSpecies = ['fish', 'turtle'], walkingSpecies = ['dog', 'cat', 'rabbit'];
    const items = {
        collar: { name: '202 collar', price: 2 },
        bandana: { name: 'Chocolate City bandana', price: 3 },
        ball: { name: 'Play ball', price: 4 },
        bed: { name: 'Cozy pet bed', price: 6 },
        treat: { name: 'Species-appropriate treat', price: 1 },
        plant: { name: 'Habitat plant', price: 2 },
        cave: { name: 'Habitat hideaway', price: 3 },
        decor: { name: 'Chocolate City habitat decor', price: 4 }
    };
    const initial = () => ({ pet: null, companion: null, active: 'home', owned: [], treats: 0 });
    const suitable = (species, id) => homeSpecies.includes(species) ?
        ['plant', 'cave', 'decor', 'treat'].includes(id) : ['collar', 'bandana', 'ball', 'bed', 'treat'].includes(id);
    const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    function valid(state) {
        if (!state || !Array.isArray(state.owned) || new Set(state.owned).size !== state.owned.length ||
            state.owned.some(id => !Object.hasOwn(items, id) || id === 'treat') ||
            !Number.isInteger(state.treats) || state.treats < 0 || state.treats > 99) return false;
        if (!['home', 'companion'].includes(state.active)) return false;
        const validPet = (p, species) => p === null || !!p && species.includes(p.species) && typeof p.name === 'string' &&
            p.name.trim().length >= 1 && p.name.length <= 24 &&
            ['food', 'fun', 'affection', 'energy'].every(key => Number.isFinite(p[key]) && p[key] >= 0 && p[key] <= 100) &&
            Number.isInteger(p.training) && p.training >= 0 && p.training <= 120 &&
            ['adoptedAt', 'updatedAt', 'lastCare'].every(key => Number.isSafeInteger(p[key]) && p[key] >= 0) &&
            Array.isArray(p.equipped) && new Set(p.equipped).size === p.equipped.length &&
            p.equipped.every(id => state.owned.includes(id) && suitable(p.species, id));
        return validPet(state.pet, homeSpecies) && validPet(state.companion, walkingSpecies);
    }
    function name(value) {
        if (typeof value !== 'string' || value.trim().length < 1 || value.trim().length > 24)
            throw new Error('Choose a pet name from 1 to 24 characters.');
        return value.trim();
    }
    function adopt(state, species, value, stars, now = Date.now()) {
        if (![...homeSpecies, ...walkingSpecies].includes(species)) throw new Error('Choose an available pet species.');
        if (walkingSpecies.includes(species) && !settings.adoptionOpen) throw new Error('Walking-pet adoption is not open yet. No stars were spent.');
        const slot = homeSpecies.includes(species) ? 'pet' : 'companion';
        if (!valid(state) || state[slot]) throw new Error('You already have a pet in this adoption group or the pet save is invalid.');
        const petName = name(value);
        const price = settings.prices[species];
        if (!Number.isSafeInteger(price) || price < 1) throw new Error('Adoption price is not configured for this species.');
        if (!Number.isSafeInteger(stars) || stars < price) throw new Error(`You need ${price} stars to adopt this pet.`);
        state[slot] = { species, name: petName, food: 75, fun: 75, affection: 75, energy: 90,
            training: 0, adoptedAt: now, updatedAt: now, lastCare: 0, equipped: [] };
        state.active = slot === 'pet' ? 'home' : 'companion';
        return stars - price;
    }
    function requirePet(state) {
        const p = state.active === 'companion' ? state.companion : state.pet;
        if (!valid(state) || !p) throw new Error('Choose or adopt an available pet to use pet care.');
        return p;
    }
    function refresh(state, now = Date.now()) {
        const p = requirePet(state);
        if (now <= p.updatedAt) return;
        const hours = Math.min(12, (now - p.updatedAt) / 3600000);
        p.food = Math.max(20, p.food - hours * 2); p.fun = Math.max(20, p.fun - hours * 1.5);
        p.energy = Math.min(100, p.energy + hours * 5);
        p.updatedAt = now;
    }
    function rename(state, value) { requirePet(state).name = name(value); }
    function care(state, action, now = Date.now()) {
        const p = requirePet(state);
        if (!['feed', 'play', 'pet', 'train', 'rest', 'treat'].includes(action)) throw new Error('Unknown pet-care action.');
        if (p.lastCare && now - p.lastCare < 10000) throw new Error('Give your companion a moment. Try again in a few seconds.');
        if (action === 'treat' && state.treats < 1) throw new Error('Buy a training treat first.');
        if (action === 'train' && p.training >= 120) throw new Error('All four tricks are learned! Play together or give a pet instead.');
        refresh(state, now);
        if (action === 'train' && p.energy < 15) throw new Error('Your pet needs a rest before training.');
        if (action === 'feed') { p.food += 25; p.energy += 5; }
        if (action === 'play') { p.fun += p.equipped.includes('ball') ? 35 : 25; p.energy -= 10; p.food -= 5; }
        if (action === 'pet') { p.affection += 25; p.energy += 3; }
        if (action === 'rest') p.energy += p.equipped.includes('bed') ? 40 : 25;
        if (action === 'train') { p.training = Math.min(120, p.training + 10); p.energy -= 15; p.affection += 5; }
        if (action === 'treat') { state.treats--; p.food += 10; p.affection += 10; }
        for (const key of ['food', 'fun', 'affection', 'energy']) p[key] = Math.max(0, Math.min(100, p[key]));
        p.lastCare = now;
        return `${p.name}: ${ { feed: 'enjoyed a meal', play: 'had fun with enrichment', pet: homeSpecies.includes(p.species) ? 'enjoyed your quiet company' : 'loved the attention',
            train: 'practiced a trick', rest: 'had a cozy rest', treat: 'enjoyed a treat' }[action]}!`;
    }
    function buy(state, id, stars) {
        const p = requirePet(state);
        const item = items[id];
        if (!item) throw new Error('Unknown pet-shop item.');
        if (!suitable(p.species, id))
            throw new Error('Choose an item made for this pet habitat.');
        if (!Number.isSafeInteger(stars) || stars < item.price) throw new Error('Not enough stars for this pet item.');
        if (id === 'treat') {
            if (state.treats >= 99) throw new Error('Your treat jar is full.');
            state.treats++;
        } else {
            if (state.owned.includes(id)) throw new Error('You already own this item.');
            state.owned.push(id);
        }
        return stars - item.price;
    }
    function equip(state, id) {
        const p = requirePet(state);
        if (!state.owned.includes(id)) throw new Error('Buy that pet item first.');
        if (!suitable(p.species, id)) throw new Error('Choose an item made for this pet habitat.');
        p.equipped = p.equipped.includes(id) ? p.equipped.filter(key => key !== id) : [...p.equipped, id];
    }
    function portrait(p) {
        if (homeSpecies.includes(p.species)) return `<svg class="pet-portrait" viewBox="0 0 220 180" role="img" aria-label="Original illustration of your home ${p.species} habitat">
            <path d="M0 0h220v180H0z" fill="#284855"/><rect x="14" y="22" width="192" height="133" rx="8" fill="#438eaa" stroke="#bfd7dc" stroke-width="6"/><path d="M18 127h184v24H18z" fill="#c6a575"/>
            ${p.species === 'fish' ? '<path d="M142 77l25-19v38z" fill="#eaba5e"/><ellipse cx="110" cy="79" rx="34" ry="21" fill="#df9451"/><circle cx="92" cy="74" r="4" fill="#1e3341"/><path d="M113 61l18 13-16 12" fill="#e9b55f"/><circle cx="72" cy="47" r="5" fill="none" stroke="#c1e6e9" stroke-width="2"/>' :
                '<path d="M130 94l44-24v46h-60z" fill="#a88a60"/><ellipse cx="105" cy="90" rx="32" ry="23" fill="#4a7252"/><path d="M79 91l26-17 26 17-26 16z" fill="none" stroke="#b2b375" stroke-width="3"/><ellipse cx="142" cy="87" rx="15" ry="10" fill="#96a16b"/><circle cx="149" cy="84" r="2" fill="#172c35"/><path d="M83 108l-14 8m53-8 13 8" stroke="#96a16b" stroke-width="8"/><path d="M167 35v23m-11-11h22" stroke="#edc773" stroke-width="4"/>'}
            ${p.equipped.includes('plant') ? '<path d="M42 136V88m0 22-13-15m13 4 14-17" stroke="#75b76c" stroke-width="6"/>' : ''}
            ${p.equipped.includes('cave') ? '<path d="M150 140q-3-47 38-28l8 28z" fill="#657477"/><path d="M163 140q1-27 21 0" fill="#203d4e"/>' : ''}
            ${p.equipped.includes('decor') ? '<rect x="23" y="112" width="34" height="27" fill="#9e684c"/><text x="40" y="131" text-anchor="middle" fill="#ffe5ab" font-size="12">202</text>' : ''}
            <path d="M18 40h184" stroke="#a8d7dc" stroke-width="3"/></svg>`;
        const cat = p.species === 'cat';
        return `<svg class="pet-portrait" viewBox="0 0 220 180" role="img" aria-label="Original illustration of your ${p.species}">
            <path d="M0 0h220v180H0z" fill="#284855"/><ellipse cx="110" cy="158" rx="72" ry="12" fill="#162f3c"/>
            <ellipse cx="111" cy="121" rx="42" ry="35" fill="${cat ? '#bcb1a1' : '#c89964'}"/>
            <path d="${p.species === 'rabbit' ? 'M77 62Q52-13 81 6l18 46m23 0 16-46q29-19 6 56' : cat ? 'M73 62L69 21 99 44m22 0 30-23-4 44' : 'M73 49Q32 37 53 102l22-21m72-32q41-12 20 53l-22-21'}" fill="${cat ? '#9b8e80' : '#795339'}"/>
            <ellipse cx="110" cy="74" rx="42" ry="36" fill="${cat ? '#c8bfb0' : '#dab483'}"/>
            <ellipse cx="110" cy="89" rx="23" ry="16" fill="#eee0bf"/><circle cx="95" cy="70" r="5" fill="#172836"/><circle cx="126" cy="70" r="5" fill="#172836"/>
            <path d="M104 84h12l-6 7z" fill="#593b36"/><path d="M110 91v7m-12 0q12 10 24 0" fill="none" stroke="#593b36" stroke-width="2"/>
            ${cat ? '<path d="M72 83l-28-5m28 12-29 3m105-10 28-5m-28 12 29 3" stroke="#ddd3c4" stroke-width="2"/>' : ''}
            ${p.equipped.includes('collar') ? '<path d="M78 104q32 16 64 0" fill="none" stroke="#68bac0" stroke-width="8"/><circle cx="110" cy="114" r="6" fill="#edc26c"/>' : ''}
            ${p.equipped.includes('bandana') ? '<path d="M78 108h64l-32 31z" fill="#963d4b"/><text x="110" y="124" text-anchor="middle" fill="#ffe2a5" font-size="9">202</text>' : ''}
            <ellipse cx="89" cy="151" rx="17" ry="9" fill="#e1c49d"/><ellipse cx="133" cy="151" rx="17" ry="9" fill="#e1c49d"/></svg>`;
    }
    function follow(position, target, blocked) {
        if (!position || position.quadrant !== target.quadrant || Math.hypot(position.x - target.x, position.y - target.y) > 250) {
            for (const [dx, dy] of [[-25, 0], [25, 0], [0, -25], [0, 25], [0, 0]])
                if (!blocked(target.x + dx, target.y + dy)) return { x: target.x + dx, y: target.y + dy, quadrant: target.quadrant };
            return null;
        }
        const dx = target.x - position.x, dy = target.y - position.y, distance = Math.hypot(dx, dy);
        const next = { ...position };
        if (distance > 35) {
            const step = Math.min(3, distance - 35);
            if (!blocked(next.x + dx / distance * step, next.y)) next.x += dx / distance * step;
            if (!blocked(next.x, next.y + dy / distance * step)) next.y += dy / distance * step;
        }
        return next;
    }
    function drawCompanion(c, species, x, y, t) {
        c.save(); c.translate(x, y);
        c.fillStyle = '#0005'; c.beginPath(); c.ellipse(0, 1, 13, 5, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = species === 'cat' ? '#bcb1a1' : species === 'rabbit' ? '#d6c6b0' : '#c89964';
        c.beginPath(); c.ellipse(0, -8, 11, 8, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(7, -16, 7, 7, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = c.fillStyle; c.lineWidth = 3; c.lineCap = 'round';
        c.beginPath(); c.moveTo(-9, -9); c.quadraticCurveTo(-20, -14 - Math.sin(t * 4) * 3, -15, -20); c.stroke();
        for (const foot of [-6, 6]) { c.fillRect(foot, -5, 3, 6); }
        c.beginPath();
        if (species === 'rabbit') { c.ellipse(3, -25, 2.5, 9, -.2, 0, Math.PI * 2); c.ellipse(11, -25, 2.5, 9, .2, 0, Math.PI * 2); }
        else if (species === 'cat') { c.moveTo(1, -19); c.lineTo(1, -27); c.lineTo(7, -21); c.lineTo(13, -27); c.lineTo(14, -18); }
        else { c.ellipse(2, -15, 3, 7, -.3, 0, Math.PI * 2); }
        c.fill(); c.fillStyle = '#1c2c38'; c.beginPath(); c.arc(10, -17, 1.2, 0, Math.PI * 2); c.fill();
        c.restore();
    }
    function render(content, state, getStars, spendStars, save, back) {
        function draw(message = '') {
            const p = state.active === 'companion' ? state.companion : state.pet;
            const home = p && homeSpecies.includes(p.species);
            if (p) refresh(state);
            content.innerHTML = `<div class="sports-game sportsbook library-reader pet-profile"><h2>Pet Companion</h2>
                <p id="pet-status" role="status">${escape(message)}</p>
                <div class="sports-controls"><button type="button" data-pet-slot="home">Home habitat</button><button type="button" data-pet-slot="companion">Walking companion ${settings.adoptionOpen ? '' : '(coming later)'}</button></div>
                ${!p ? `<h3>${state.active === 'home' || settings.adoptionOpen ? 'Choose a companion' : 'Walking pets coming later'}</h3>
                    <p>Keep one fish or turtle in your home habitat, plus one cat, dog or rabbit that follows you on foot and can relax at home. Adoption and accessories cost the displayed city stars. Prices are provisional while the economy is being tested.</p>
                    ${state.active === 'home' || settings.adoptionOpen ? `<label for="pet-species">Companion & adoption price</label><select id="pet-species" class="invest-input">${(state.active === 'home' ? homeSpecies : walkingSpecies).map(species => `<option value="${species}">${species} - ${settings.prices[species]} stars</option>`).join('')}</select><label for="pet-name">Pet name</label><input id="pet-name" class="invest-input" maxlength="24"><button type="button" id="pet-adopt">Adopt selected pet for its listed star price</button>` : ''}` :
                    `<section class="pet-card">${portrait(p)}<h3>${escape(p.name)}</h3><p>${p.species} companion - adopted ${escape(new Date(p.adoptedAt).toLocaleDateString())}</p>
                    <label for="pet-name">Name (1-24 characters)</label><input id="pet-name" class="invest-input" maxlength="24" value="${escape(p.name)}"><button type="button" id="pet-rename">Save pet name</button>
                    ${['food', 'fun', 'affection', 'energy'].map(key => `<label class="pet-meter">${key}: ${Math.round(p[key])}/100 <meter min="0" max="100" value="${p[key]}">${Math.round(p[key])}</meter></label>`).join('')}
                    <div class="sports-controls">${['feed', 'play', 'pet', 'train', 'rest', 'treat'].map(action => `<button type="button" data-pet-care="${action}">${action === 'treat' ? `Give treat (${state.treats})` : home && action === 'pet' ? 'Watch / bond' : home && action === 'train' ? 'Target practice' : action[0].toUpperCase() + action.slice(1)}</button>`).join('')}</div>
                    <p>${home ? 'Enrichment' : 'Training'}: ${p.training}/120. Learned: ${(home ? ['Follow target', 'Find feeding spot', 'Explore habitat', 'Come to target'] : ['Sit / touch', 'Stay', 'Spin', 'High five']).slice(0, Math.floor(p.training / 30)).join(', ') || 'Practice to learn your first activity.'}</p>
                    <p class="book-muted">Gentle pretend care only: no sickness, death or permanent penalties while away. Pets never produce stars.</p></section>`}
                <h3>Accessory shop ${!p ? '(preview - locked)' : `- ${getStars()} stars`}</h3>
                ${Object.entries(items).filter(([id]) => !p || home ? !['collar', 'bandana', 'ball', 'bed'].includes(id) : !['plant', 'cave', 'decor'].includes(id)).map(([id, item]) => `<p class="shop-row"><span>${item.name} - ${item.price} star${item.price === 1 ? '' : 's'}</span>
                    <button type="button" data-pet-buy="${id}" ${!p || state.owned.includes(id) ? 'disabled' : ''}>${state.owned.includes(id) ? 'Owned' : 'Buy'}</button>
                    ${p && state.owned.includes(id) ? `<button type="button" data-pet-equip="${id}">${p.equipped.includes(id) ? 'Put away' : 'Use / equip'}</button>` : ''}</p>`).join('')}
                <button type="button" id="pet-back">Back home</button></div>`;
            const run = fn => {
                try { const text = fn(); save(); draw(text || 'Pet profile saved.'); }
                catch (error) { console.error('Pet action failed:', error); draw(error.message); }
            };
            const adoption = content.querySelector('#pet-adopt');
            content.querySelectorAll('[data-pet-slot]').forEach(b => b.addEventListener('click', () => {
                state.active = b.dataset.petSlot; save(); draw();
            }));
            if (adoption) adoption.addEventListener('click', () => run(() => {
                spendStars(adopt(state, content.querySelector('#pet-species').value, content.querySelector('#pet-name').value, getStars()));
                return 'Pet adopted. Welcome home!';
            }));
            const renameButton = content.querySelector('#pet-rename');
            if (renameButton) renameButton.addEventListener('click', () => run(() => rename(state, content.querySelector('#pet-name').value)));
            content.querySelectorAll('[data-pet-care]').forEach(b => b.addEventListener('click', () => run(() => care(state, b.dataset.petCare))));
            content.querySelectorAll('[data-pet-buy]').forEach(b => b.addEventListener('click', () => run(() => {
                spendStars(buy(state, b.dataset.petBuy, getStars())); return 'Pet item purchased.';
            })));
            content.querySelectorAll('[data-pet-equip]').forEach(b => b.addEventListener('click', () => run(() => equip(state, b.dataset.petEquip))));
            content.querySelector('#pet-back').addEventListener('click', back);
        }
        draw();
    }
    return { settings, items, initial, valid, adopt, refresh, rename, care, buy, equip, portrait, follow, drawCompanion, render };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Pets;
