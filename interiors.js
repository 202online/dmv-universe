'use strict';

const VenueInteriors = (() => {
    const cityArt = typeof CityArt !== 'undefined' ? CityArt : require('./city-art.js');
    const item = (selector, label, art) => ({ selector, label, art });
    const rooms = {
        crib: { title: 'Your living room', wall: '#48667b', floor: '#78553d', items: [
            item('#open-home-tv', 'Watch TV', 'tv'), item('#open-personal-computer', 'Use computer', 'computer'),
            item('#open-wardrobe', 'Open wardrobe', 'wardrobe'), item('#open-vehicle-garage', 'Enter garage', 'garage'),
            item('#open-pet-profile', 'Pet habitat & companion care', 'habitat')
        ] },
        library: { title: 'Library reading room', wall: '#4d7567', floor: '#826952', items: [
            item('#open-library-shelves', 'Bookshelves', 'books'), item('#open-personal-computer', 'Public computer', 'computer'),
            item('#open-library-docs', 'Movie room', 'tv'), item('#open-library-gaming', 'Video games shelf', 'controller')
        ] },
        venue: { title: 'The 202 club floor', wall: '#352354', floor: '#30223f', items: [
            item('[onclick="playGoGoBeat()"]', 'Go-go stage', 'stage'), item('[onclick*="pool"]', 'Play pool', 'pool'),
            item('[onclick*="airhockey"]', 'Air hockey', 'hockey'), item('[onclick*="chess"]', 'Chess table', 'chess')
        ] },
        retail: { title: 'Capital Centre shopping floor', wall: '#6f5346', floor: '#897d66', items: [
            item('[onclick*="resale"]', 'Resell Hub', 'sneaker'), item('#open-shirt-shop', 'Clothing shop', 'wardrobe'),
            item('[onclick*="courier"]', 'Courier dispatch', 'parcel'), item('#open-vehicle-shop', 'Vehicle shop', 'garage')
        ] },
        arena: { title: 'Arena concourse', wall: '#5d3544', floor: '#434b60', items: [
            item('#open-sportsbook', 'Betting Practice Lab', 'computer')
        ] },
        casino: { title: 'Chocolate City casino floor', wall: '#55354b', floor: '#315b50', items: [
            item('#open-sportsbook', 'Sports betting lab', 'computer'),
            item('[data-casino-game="blackjack"]', 'Blackjack table', 'cards'),
            item('[data-casino-game="craps"]', 'Craps table', 'dice'),
            item('[data-casino-game="slots"]', 'Slot machine', 'slots'),
            item('[data-casino-game="roulette"]', 'Roulette table', 'roulette')
        ] },
        sports: { title: 'Fan hub lounge', wall: '#663844', floor: '#4d5765', items: [] },
        boxing: { title: 'Boxing gym floor', wall: '#67534c', floor: '#4b5563', items: [
            item('[data-venue-play]', 'Step into the ring', 'ring')
        ] },
        carryout: { title: 'Carryout kitchen', wall: '#835340', floor: '#4f5055', items: [
            item('[data-venue-play]', 'Start a kitchen shift', 'fryer')
        ] },
        subshop: { title: 'Sub shop counter', wall: '#4f7053', floor: '#775a42', items: [
            item('[data-venue-play]', 'Build customer orders', 'sandwich')
        ] },
        lemonade: { title: 'Lemonade stand patio', wall: '#6197a0', floor: '#9b7c42', items: [
            item('[data-venue-play]', 'Open the stand', 'lemonade')
        ] },
        resale: { title: 'Resell Hub showroom', wall: '#513c77', floor: '#49445f', items: [
            item('[data-venue-play]', 'Inspect merchandise', 'sneaker')
        ] },
        courier: { title: 'Courier dispatch room', wall: '#365f77', floor: '#4c6267', items: [
            item('[data-venue-play]', 'Start delivery route', 'parcel')
        ] },
        fashion: { title: 'Uptown boutique', wall: '#77546b', floor: '#8f7561', items: [] },
        theater: { title: 'Picture house auditorium', wall: '#632f45', floor: '#332636', items: [] },
        dmv: { title: 'DMV service hall', wall: '#486077', floor: '#62717c', items: [] }
    };
    const aliases = { gogo: 'venue' };
    const art = {
        habitat: '<rect x="14" y="20" width="132" height="82" rx="7" fill="#4a8ba2" stroke="#bfd8dc" stroke-width="5"/><path d="M17 85h126v14H17z" fill="#caa36f"/><path d="M39 87V54m0 14-13-12m13 8 12-15" stroke="#7ab46b" stroke-width="5"/><ellipse cx="89" cy="61" rx="21" ry="13" fill="#e7ac5d"/><path d="M109 60l17-12v25z" fill="#e7ac5d"/><circle cx="79" cy="58" r="2" fill="#20354b"/><path d="M22 104h116v11H22z" fill="#805437"/>',
        tv: '<rect x="12" y="12" width="136" height="82" rx="8" fill="#121c30"/><rect x="20" y="20" width="120" height="64" rx="4" fill="#2388a0"/><path d="M25 75L60 38 90 60 120 30 140 70" fill="#86d5b5"/><path d="M70 94v12H42v7h76v-7H90V94" fill="#c6d1de"/><circle cx="80" cy="89" r="2" fill="#67e8f9"/>',
        computer: '<path d="M14 96h132v9H14zM22 105v18m116-18v18" stroke="#573c2b" stroke-width="8"/><rect x="28" y="14" width="104" height="69" rx="5" fill="#111827"/><rect x="34" y="20" width="92" height="56" fill="#386ab0"/><path d="M44 34h27v22H44zm37 0h35v4H81zm0 12h26v4H81z" fill="#91d8f0"/><path d="M74 83v10h16V83M45 94h70" stroke="#cbd5e1" stroke-width="5"/><rect x="135" y="63" width="15" height="31" rx="3" fill="#1e293b"/>',
        wardrobe: '<rect x="24" y="5" width="112" height="109" rx="4" fill="#8f6548" stroke="#e0b988" stroke-width="3"/><path d="M80 8v102M30 22h100" stroke="#513f36" stroke-width="3"/><path d="M47 29l-15 12 9 13 9-5v31h28V49l9 5 9-13-15-12-17 8z" fill="#8bbecb"/><path d="M100 45v20m-10-10h4" stroke="#f5d487" stroke-width="4"/><path d="M30 114v9m100-9v9" stroke="#302a28" stroke-width="6"/>',
        garage: '<path d="M12 38L80 4l68 34v80H12z" fill="#b9a78e" stroke="#ede2c9" stroke-width="3"/><path d="M24 42h112v76H24z" fill="#53616a"/><path d="M28 52h104M28 65h104M28 78h104" stroke="#9eacb4" stroke-width="3"/><circle cx="55" cy="105" r="14" fill="none" stroke="#111827" stroke-width="5"/><circle cx="108" cy="105" r="14" fill="none" stroke="#111827" stroke-width="5"/><path d="M55 105l25-29 28 29H55l15-34m30 7h15" stroke="#38bdf8" stroke-width="4" fill="none"/>',
        books: '<rect x="14" y="5" width="132" height="113" fill="#6d4933" stroke="#d6b58e" stroke-width="4"/><path d="M18 42h124M18 81h124" stroke="#d6b58e" stroke-width="5"/>' +
            [0, 1, 2].map(row => [0, 1, 2, 3, 4, 5].map(i => `<rect x="${23 + i * 19}" y="${10 + row * 38}" width="13" height="28" rx="1" fill="${['#86b4a1', '#b75546', '#d2ab5e', '#769ac4'][i % 4]}"/><path d="M${27 + i * 19} ${16 + row * 38}v16" stroke="#f4dcaf" stroke-width="2"/>`).join('')).join(''),
        controller: '<rect x="20" y="3" width="120" height="61" rx="6" fill="#19273c"/><rect x="28" y="11" width="104" height="45" fill="#5370a8"/><path d="M38 43l20-21 25 21 25-16 21 20" fill="#93c5b1"/><path d="M33 76Q43 63 60 71h40q18-8 29 5l15 30q4 21-14 14l-25-16H55l-25 16q-18 7-14-14z" fill="#ccd6e5" stroke="#66758c" stroke-width="3"/><path d="M44 78v23m-11-12h23" stroke="#172554" stroke-width="6"/><circle cx="116" cy="84" r="5" fill="#a855f7"/><circle cx="128" cy="96" r="5" fill="#0d9488"/>',
        stage: '<path d="M6 17h148v85H6z" fill="#1c1730"/><path d="M6 17q30 10 30 39v46H6zm148 0q-30 10-30 39v46h30z" fill="#9f3055"/><path d="M4 104h152v15H4z" fill="#70527e"/><path d="M84 33v65m-10 0h20" stroke="#b9c9dc" stroke-width="4"/><circle cx="84" cy="27" r="8" fill="#cbd5e1"/><ellipse cx="46" cy="78" rx="15" ry="8" fill="#f3cb8b"/><path d="M31 78v23h30V78" fill="#a66737"/><path d="M110 33l20 58H90z" fill="#f5d675" opacity=".3"/>',
        pool: '<path d="M22 96v24m116-24v24" stroke="#392c26" stroke-width="9"/><rect x="7" y="24" width="146" height="77" rx="16" fill="#76513b" stroke="#b38e61" stroke-width="5"/><rect x="17" y="34" width="126" height="56" rx="10" fill="#197754"/><circle cx="24" cy="41" r="6" fill="#15222a"/><circle cx="136" cy="83" r="6" fill="#15222a"/><circle cx="60" cy="65" r="5" fill="#fff"/><circle cx="98" cy="58" r="5" fill="#facc15"/><circle cx="109" cy="67" r="5" fill="#ef4444"/><path d="M30 110l80-72" stroke="#ebc592" stroke-width="3"/>',
        hockey: '<path d="M25 95v25m110-25v25" stroke="#24354c" stroke-width="9"/><rect x="8" y="21" width="144" height="81" rx="13" fill="#112d4e" stroke="#7dd3fc" stroke-width="4"/><path d="M80 27v69" stroke="#93c5fd" stroke-width="2"/><circle cx="80" cy="61" r="18" fill="none" stroke="#e879f9" stroke-width="2"/><ellipse cx="42" cy="67" rx="14" ry="10" fill="#38bdf8"/><ellipse cx="119" cy="48" rx="13" ry="10" fill="#e879f9"/><circle cx="91" cy="74" r="6" fill="#fde047"/>',
        chess: '<path d="M23 97v24m114-24v24" stroke="#644936" stroke-width="9"/><rect x="13" y="25" width="134" height="77" rx="7" fill="#8c7053"/>' +
            Array.from({ length: 16 }, (_, i) => `<rect x="${35 + i % 4 * 23}" y="${32 + Math.floor(i / 4) * 15}" width="23" height="15" fill="${(i % 4 + Math.floor(i / 4)) % 2 ? '#4d3b35' : '#ead7ab'}"/>`).join('') +
            '<path d="M64 45v22m-8 1h16m28-15v25m-8 1h16" stroke="#f5efe0" stroke-width="7"/>',
        fryer: '<rect x="12" y="54" width="136" height="64" rx="7" fill="#94a3b8"/><rect x="20" y="62" width="82" height="44" rx="5" fill="#49382a"/><path d="M29 70h64v25H29z" fill="#ba8536" stroke="#cbd5e1" stroke-width="3"/><path d="M60 71V41h40" stroke="#cbd5e1" stroke-width="5"/><circle cx="125" cy="76" r="10" fill="#1e293b"/><circle cx="124" cy="101" r="4" fill="#4ade80"/><path d="M32 46q-9-13 0-23m18 20q9-14 0-26" fill="none" stroke="#e9e1d3" stroke-width="3"/><path d="M102 39h28v15h-28z" fill="#dc6a33"/>',
        sandwich: '<ellipse cx="80" cy="93" rx="70" ry="19" fill="#f5ead7"/><path d="M17 76q63 24 126 0v15q-63 25-126 0z" fill="#c88130"/><path d="M20 74q60-18 120 0l-10 12-13-7-15 8-14-8-16 8-16-8-17 7z" fill="#5caa45"/><path d="M25 67h108v12H25" fill="#e5b292"/><path d="M23 63l26-4 30 8 24-9 29 7v7H23" fill="#f8d451"/><path d="M18 60q5-39 62-39t62 39z" fill="#e9ac51" stroke="#bf7c36" stroke-width="2"/><path d="M44 33l7 10m21-17 5 12m22-10 5 12" stroke="#fff0bd" stroke-width="4"/>',
        lemonade: '<path d="M29 29h77l-8 83H37z" fill="#f8e077" stroke="#e8f7ff" stroke-width="4"/><path d="M34 59h67l-5 49H39z" fill="#e9bd36"/><path d="M79 69L104 8h20" stroke="#fff5ec" stroke-width="6" fill="none"/><circle cx="34" cy="31" r="22" fill="#edc342" stroke="#fff0ae" stroke-width="4"/><path d="M34 12v38m-19-19h38m-32-13 27 27m-26 0 26-27" stroke="#fff1b1" stroke-width="2"/><path d="M47 68h16v16H47zm25 13h16v16H72" fill="#f7fcff" opacity=".7"/><ellipse cx="122" cy="103" rx="23" ry="15" fill="#eac545"/><path d="M126 85q16-14 22-4-10 11-22 4" fill="#4d8743"/>',
        sneaker: '<path d="M8 104h144v17H8z" fill="#b88859"/><path d="M13 105h134" stroke="#e8c99e" stroke-width="3"/><path d="M18 72l17-38 30 9 25 20 47 12 11 17H16z" fill="#a78bfa" stroke="#ddd4fe" stroke-width="3"/><path d="M16 87h132v13H16z" fill="#f1f5f9"/><path d="M26 93h112M43 40l-6 28m23-18-9 18m23-9-8 17m24-9-6 15" stroke="#fff" stroke-width="4"/><path d="M95 77l21-2" stroke="#4c1d95" stroke-width="5"/>',
        parcel: '<path d="M30 44l50-24 50 24v64l-50 17-50-17z" fill="#c08a50" stroke="#f4c98e" stroke-width="3"/><path d="M30 44l50 18 50-18M80 62v63M58 31l50 20" fill="none" stroke="#f4d396" stroke-width="7"/><rect x="92" y="70" width="25" height="20" fill="#f9f1d7"/><path d="M98 76h13m-13 6h13" stroke="#71604d" stroke-width="2"/>',
        ring: '<path d="M10 59l70-30 70 30v46l-70 20-70-20z" fill="#273c66"/><path d="M14 96l66-24 66 24-66 23z" fill="#6793b7"/><path d="M14 47v57m66-85v55m66-27v57m-66-36v53" stroke="#c9d6e5" stroke-width="5"/><path d="M14 50l66-26 66 26-66 24zM14 70l66-26 66 26-66 24z" stroke="#d34e5b" stroke-width="3" fill="none"/><path d="M14 60l66-26 66 26-66 24z" stroke="#f1f5f9" stroke-width="3" fill="none"/>',
        cards: '<ellipse cx="80" cy="85" rx="72" ry="33" fill="#297452" stroke="#d0aa61" stroke-width="6"/><rect x="37" y="20" width="38" height="62" rx="5" fill="#f3e8ce" transform="rotate(-12 56 50)"/><rect x="79" y="18" width="38" height="62" rx="5" fill="#f3e8ce" transform="rotate(10 98 50)"/><text x="44" y="49" fill="#9d273b" font-size="26">A</text><text x="89" y="48" fill="#22364d" font-size="24">K</text>',
        dice: '<rect x="10" y="32" width="140" height="76" rx="20" fill="#2b795a" stroke="#d0aa61" stroke-width="6"/><rect x="35" y="44" width="36" height="36" rx="6" fill="#fff1d8"/><rect x="86" y="54" width="36" height="36" rx="6" fill="#fff1d8"/><g fill="#a02b3c"><circle cx="44" cy="53" r="3"/><circle cx="61" cy="71" r="3"/><circle cx="53" cy="62" r="3"/><circle cx="94" cy="62" r="3"/><circle cx="114" cy="82" r="3"/></g>',
        slots: '<rect x="29" y="8" width="99" height="110" rx="9" fill="#9c444e" stroke="#e1b862" stroke-width="5"/><rect x="39" y="38" width="79" height="43" fill="#fff0d6"/><path d="M65 39v41m27-41v41" stroke="#514158" stroke-width="2"/><text x="44" y="67" fill="#a2293d" font-size="24">7 7 7</text><path d="M55 97h43m30-30h13V38" stroke="#e1b862" stroke-width="6"/><circle cx="141" cy="33" r="8" fill="#e1b862"/>',
        roulette: '<ellipse cx="80" cy="78" rx="72" ry="37" fill="#2b795a" stroke="#d0aa61" stroke-width="6"/><circle cx="80" cy="56" r="39" fill="#9a3e45" stroke="#e1b862" stroke-width="5"/><path d="M80 17v78M41 56h78M52 29l56 55m-56 0 56-55" stroke="#e1b862" stroke-width="3"/><circle cx="80" cy="56" r="22" fill="#614331" stroke="#e1b862" stroke-width="3"/><circle cx="80" cy="56" r="4" fill="#f6e8c6"/>'
    };
    function illustration(name) {
        if (!Object.hasOwn(art, name)) throw new Error(`Unknown interior object: ${name}`);
        return `<svg viewBox="0 0 160 128" aria-hidden="true" focusable="false">${art[name]}</svg>`;
    }
    function mount(content, type, overlay, { preview = false } = {}) {
        const key = aliases[type] || type, room = rooms[key];
        if (!room) throw new Error(`Unknown venue interior: ${type}`);
        overlay.dataset.interior = key;
        overlay.style.setProperty('--room-wall', room.wall);
        overlay.style.setProperty('--room-floor', room.floor);
        const scene = document.createElement('section');
        scene.className = 'venue-room';
        scene.setAttribute('aria-label', room.title);
        const title = document.createElement('h2');
        title.textContent = preview ? 'Model home - view-only tour' : room.title;
        const hint = document.createElement('p');
        hint.textContent = preview ? 'Computer, TV, closet, garage and pet space are display-only until this property is yours.' :
            'Tap an object to use it. More options are below.';
        const stage = document.createElement('div');
        stage.className = 'venue-room-stage';
        const decor = document.createElement('div');
        decor.className = 'venue-room-decor';
        decor.setAttribute('aria-hidden', 'true');
        const furnishings = key === 'arena' || key === 'sports' ? '<span class="room-scoreboard">DISTRICT ARENA</span><div class="room-court"></div><div class="room-seats"></div>' :
            key === 'crib' ? '<div class="room-window"></div><div class="room-sofa"></div><div class="room-rug"></div>' :
                key === 'theater' ? '<div class="room-film-screen">PICTURE HOUSE</div><div class="room-theater-seats"></div>' :
                    ['carryout', 'subshop'].includes(key) ? '<div class="room-tiles"></div><div class="room-vent"></div>' :
                        key === 'boxing' ? '<div class="room-lockers"></div><div class="room-punchbag"></div>' :
                            key === 'venue' ? '<div class="room-club-lights"></div><div class="room-rug"></div>' :
                                key === 'dmv' ? '<div class="room-service-desk">LEARNER PRACTICE</div><div class="room-theater-seats"></div>' :
                                    ['retail', 'resale', 'fashion'].includes(key) ? '<div class="room-display-shelves"></div>' :
                                        '<div class="room-window"></div><div class="room-rug"></div>';
        decor.innerHTML = furnishings + `<div class="room-city-mural">${cityArt.mural(key)}</div>`;
        stage.append(decor);
        for (const spec of room.items) {
            const button = content.querySelector(spec.selector);
            if (!button) throw new Error(`Missing ${type} interior action: ${spec.selector}`);
            if (preview) {
                button.disabled = true;
                button.setAttribute('title', 'Display only - available after buying or renting this home');
            }
            button.className = 'venue-object';
            button.setAttribute('aria-label', spec.label);
            button.innerHTML = illustration(spec.art) + `<span>${spec.label}</span>`;
            stage.append(button);
        }
        const gallery = document.createElement('div');
        gallery.className = 'room-legend-wall';
        gallery.innerHTML = cityArt.gallery(key);
        scene.append(title, hint, stage, gallery);
        content.prepend(scene);
    }
    return { rooms, illustration, mount };
})();

if (typeof module !== 'undefined') module.exports = VenueInteriors;
