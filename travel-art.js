'use strict';

// Original illustrated DMV culture cards shown on Metro trips and street billboards.
const TravelArt = (() => {
    const art = typeof CityArt !== 'undefined' ? CityArt : require('./city-art.js');
    const font = 'font-family="system-ui,sans-serif"';
    const sky = (top, bottom) => `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><path d="M0 0h320v180H0z" fill="url(#g)"/>`;
    const label = (text, color = '#ffe4a3') => `<text x="12" y="24" fill="${color}" ${font} font-weight="900" font-size="15">${text}</text>`;
    const portraits = (ids, y = 62, size = 62) => ids.map((id, i) => {
        const gap = 320 / ids.length, x = gap * i + (gap - size) / 2;
        return art.portrait(id).replace('<svg ', `<svg x="${x.toFixed(1)}" y="${y}" width="${size}" height="${Math.round(size * 1.125)}" `);
    }).join('');
    const rowhouses = (y, colors) => colors.map((c, i) =>
        `<path d="M${i * 40} ${y}h40v${180 - y}H${i * 40}z" fill="${c}"/><path d="M${i * 40 + 8} ${y + 12}h9v12h-9zm15 0h9v12h-9zm-15 22h9v12h-9zm15 0h9v12h-9z" fill="#f4cf7d"/><path d="M${i * 40} ${y}h40v-6H${i * 40}z" fill="#2b1d1a"/>`).join('');

    const cards = [
        { id: 'metro-vault', title: 'Underground Metro', caption: 'Metrorail opened in 1976. Its coffered concrete vaults make DC stations easy to recognize.',
            svg: () => sky('#1b1d22', '#3a3431') + Array.from({ length: 7 }, (_, i) => {
                const s = 1 - i * .12, w = 300 * s, h = 150 * s, x = 160 - w / 2, y = 150 - h;
                return `<path d="M${x} 150V${y + h * .45}Q160 ${y - 10} ${x + w} ${y + h * .45}V150" fill="none" stroke="#8b8174" stroke-width="${6 * s}"/>`;
            }).join('') + '<path d="M0 150h320v30H0z" fill="#2a2522"/><path d="M40 150l-25 30m265-30 25 30" stroke="#c9a24b" stroke-width="5"/>' +
                '<path d="M118 112h84q12 0 12 12v26h-108v-26q0-12 12-12z" fill="#c9c6bd"/><path d="M124 120h72v12h-72z" fill="#1c2a38"/><circle cx="128" cy="142" r="4" fill="#fff4b8"/><circle cx="192" cy="142" r="4" fill="#fff4b8"/>' +
                '<path d="M0 160h320" stroke="#e8c45a" stroke-width="3" stroke-dasharray="6 5"/>' + label('METRO', '#f4f0e6') },
        { id: 'capitol', title: 'Capitol & the Monument', caption: 'The National Mall links the U.S. Capitol, the Washington Monument and the Lincoln Memorial.',
            svg: () => sky('#29466b', '#e49a6b') + '<circle cx="250" cy="58" r="22" fill="#f6cf7a" opacity=".8"/>' +
                '<path d="M190 150V40l6-12 6 12v110z" fill="#e9e2d2"/><path d="M40 150v-30h110v30zM58 120v-16h74v16zM70 104q25-48 50 0z" fill="#f1ebdf"/><path d="M89 82h12v-8h-12z" fill="#f1ebdf"/><path d="M95 74v-10" stroke="#f1ebdf" stroke-width="3"/>' +
                '<path d="M46 124h98M52 132v18m12-18v18m12-18v18m12-18v18m12-18v18m12-18v18m12-18v18" stroke="#b7ab95" stroke-width="2"/>' +
                '<path d="M0 150h320v30H0z" fill="#3c6b46"/><path d="M0 160h320v8H0z" fill="#7aa0b7"/>' + label('THE NATIONAL MALL') },
        { id: 'chocolate-city', title: 'Chocolate City', caption: 'DC became known as Chocolate City in the 1970s, celebrating its Black majority, music, politics and neighborhoods.',
            svg: () => sky('#3d2219', '#a8643a') + rowhouses(86, ['#7c3b2a', '#b46a3e', '#5b3a5e', '#8a6a3b', '#3f6a6a', '#9c4a47', '#6d4a2f', '#4f5f86']) +
                `<text x="160" y="58" text-anchor="middle" fill="#f9dda0" ${font} font-weight="900" font-size="30">CHOCOLATE CITY</text>` +
                `<text x="160" y="76" text-anchor="middle" fill="#f1e2c6" ${font} font-size="11">Washington, DC &#183; 202</text>` },
        { id: 'go-go', title: 'Go-go: DC\'s Own Sound', caption: 'Congas, cowbell, roto-toms and the pocket beat with call-and-response. Chuck Brown laid the foundation; bands like BYB, TOB, CCB and New Impressions keep the DMV crankin\'. Go-go became DC\'s official music in 2020.',
            svg: () => sky('#1c0f2b', '#6d1f3f') + '<path d="M0 0l70 120h-30zM320 0l-70 120h30zM160 0l-20 120h40z" fill="#f6c45c" opacity=".1"/>' +
                '<path d="M0 132h320v48H0z" fill="#2a1a22"/><path d="M0 132h320v5H0z" fill="#c63838"/>' +
                // Conga line-up
                [[46, '#b34a3e'], [74, '#d79a3c'], [102, '#9c3d34']].map(([x, c], i) => `<path d="M${x - 13} ${96 + i * 4}h26l-5 42h-16z" fill="${c}"/><ellipse cx="${x}" cy="${96 + i * 4}" rx="13" ry="4.5" fill="#f2e3c4"/><path d="M${x - 11} ${112 + i * 4}h22" stroke="#e5c07a" stroke-width="2"/>`).join('') +
                // Roto-toms on a stand
                '<path d="M226 138V104m30 34V104" stroke="#9aa1ad" stroke-width="3"/>' + [[214, 96, 9], [234, 92, 11], [256, 96, 9], [276, 102, 8]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="3.5" fill="#e9edf2"/><path d="M${x - r} ${y}v6h${2 * r}v-6" fill="#c0c6cf"/>`).join('') +
                // Cowbell and timbales
                '<path d="M140 84l18-6 6 16-20 7z" fill="#d7d2c4"/><path d="M152 80l-10-14" stroke="#8a8f99" stroke-width="2"/><path d="M178 112h34v8h-34z" fill="#c9c6bd"/><ellipse cx="186" cy="112" rx="9" ry="3" fill="#f1ede2"/><ellipse cx="204" cy="112" rx="9" ry="3" fill="#f1ede2"/>' +
                // Crowd silhouettes with raised hands (call-and-response)
                Array.from({ length: 11 }, (_, i) => `<circle cx="${14 + i * 29}" cy="152" r="7" fill="#120a14"/><path d="M${4 + i * 29} 180v-18q10-6 20 0v18z" fill="#120a14"/>${i % 2 ? `<path d="M${20 + i * 29} 160l6-16" stroke="#120a14" stroke-width="4"/>` : ''}`).join('') +
                label('GO-GO &#183; CRANK IT', '#ffd36e') + `<text x="12" y="42" fill="#f2d7e0" ${font} font-size="11">Pocket beat &#183; call &amp; response</text>` },
        { id: 'u-street', title: 'U Street — Black Broadway', caption: 'U Street theaters and clubs earned the nickname Black Broadway. DC-born Duke Ellington started his career nearby.',
            svg: () => sky('#101a33', '#3b2350') + rowhouses(70, ['#40213a', '#522a33', '#2f3355', '#40213a', '#522a33', '#2f3355', '#40213a', '#522a33']) +
                '<path d="M86 42h148v34H86z" fill="#14101e" stroke="#ff6fae" stroke-width="3"/>' +
                `<text x="160" y="66" text-anchor="middle" fill="#ffd7ef" ${font} font-weight="900" font-size="19">U STREET</text>` +
                art.portrait('ellington').replace('<svg ', '<svg x="128" y="96" width="64" height="72" ') + '<path d="M0 168h320v12H0z" fill="#222"/>' },
        { id: 'mambo', title: 'Mambo Sauce Carryout', caption: 'Sweet, tangy red mambo sauce is a DC carryout classic on wings and fries.',
            svg: () => sky('#4c1e22', '#8f3a2b') + '<path d="M0 120h320v60H0z" fill="#5b3524"/><path d="M0 120h320v6H0z" fill="#c78b4a"/>' +
                '<path d="M140 50h40v10l10 14v52h-60V74l10-14z" fill="#d32f22"/><path d="M146 38h28v12h-28z" fill="#f2d16b"/><path d="M134 84h52v26h-52z" fill="#f7e4c0"/>' +
                `<text x="160" y="101" text-anchor="middle" fill="#a3251c" ${font} font-weight="900" font-size="11">MAMBO</text>` +
                '<path d="M40 120q30-40 70 0zM210 120q30-40 70 0z" fill="#f2efe6"/>' + [55, 72, 89, 225, 242, 259].map(x => `<ellipse cx="${x}" cy="106" rx="8" ry="6" fill="#c46a2b"/>`).join('') + label('CARRYOUT', '#ffe2b5') },
        { id: 'anacostia', title: 'Anacostia River', caption: 'The Frederick Douglass Memorial Bridge, opened in 2021, crosses the Anacostia River between Southeast and Southwest DC.',
            svg: () => sky('#2a4c6b', '#f0a46b') + '<path d="M0 120h320v60H0z" fill="#3d6f8a"/><path d="M0 132h320M0 148h320" stroke="#9cc3d6" stroke-dasharray="14 10"/>' +
                '<path d="M10 112h300v8H10z" fill="#d9d4c6"/>' + [70, 160, 250].map(x => `<path d="M${x - 40} 112Q${x} 60 ${x + 40} 112" fill="none" stroke="#f1ede2" stroke-width="5"/>` +
                    [-24, -12, 0, 12, 24].map(o => `<path d="M${x + o} ${112}V${80 + Math.abs(o) * .8}" stroke="#f1ede2"/>`).join('')).join('') + label('ANACOSTIA', '#fff0d0') },
        { id: 'blossoms', title: 'Cherry Blossoms', caption: 'Tokyo gave Washington its first Tidal Basin cherry trees in 1912. Spring blossoms still draw crowds.',
            svg: () => sky('#8bb7d8', '#f6d9e4') + '<path d="M0 130h320v50H0z" fill="#5d8fb2"/><path d="M110 130q50-50 100 0z" fill="#f1ede2"/><path d="M118 130v-14m14 14v-22m14 22v-26m14 26v-28m14 28v-26m14 26v-22m14 22v-14" stroke="#cbc4b4" stroke-width="3"/>' +
                [[30, 70], [70, 50], [260, 60], [295, 80], [40, 100]].map(([x, y]) => `<path d="M${x} 140V${y + 20}" stroke="#5a3a2c" stroke-width="5"/><circle cx="${x}" cy="${y}" r="26" fill="#f6b8cd"/><circle cx="${x + 14}" cy="${y + 10}" r="16" fill="#fbd3e0"/>`).join('') + label('TIDAL BASIN', '#5b2846') },
        { id: 'athletes', title: 'DMV Sports Legends', caption: 'Original tributes to Elvin Hayes, Darrell Green, Sugar Ray Leonard and Hyattsville\'s Frances Tiafoe.',
            svg: () => sky('#2c1a2e', '#1b2c4c') + '<path d="M0 0h320v12H0z" fill="#7b1f2b"/><path d="M0 12h320v6H0z" fill="#ffb612"/><path d="M0 168h320v12H0z" fill="#c8102e"/><path d="M0 162h320v6H0z" fill="#0b2a5b"/>' +
                portraits(['hayes', 'green', 'leonard', 'tiafoe'], 50, 66) + label('GAME DAY IN THE DMV', '#ffe4a3').replace('y="24"', 'y="40"') },
        { id: 'legends', title: 'Culture Makers', caption: 'Original tributes to Alma Thomas, Benjamin Banneker, and Ben and Virginia Ali of Ben\'s Chili Bowl, founded on U Street in 1958.',
            svg: () => sky('#20283c', '#4b3a2c') + portraits(['thomas', 'banneker', 'ben', 'virginia'], 48, 66) + label('LEGENDARY 202') },
        { id: 'howard', title: 'Howard University', caption: 'Founded in 1867, Howard University in Northwest DC is one of the nation\'s best-known HBCUs.',
            svg: () => sky('#1e3360', '#b6573f') + '<path d="M60 150V90h200v60z" fill="#a2533a"/><path d="M140 90V40h40v50z" fill="#b8613f"/><path d="M134 40l26-26 26 26z" fill="#e7e0cf"/><circle cx="160" cy="58" r="10" fill="#f1ebdf"/><path d="M160 58v-6m0 6h5" stroke="#2b2b2b" stroke-width="2"/>' +
                [80, 104, 200, 224].map(x => `<path d="M${x} 104h14v20h-14z" fill="#f4cf7d"/>`).join('') + '<path d="M0 150h320v30H0z" fill="#3f7a4a"/>' + label('THE MECCA', '#ffe9c2') },
        { id: 'dmv-map', title: 'One DMV', caption: 'DC, Maryland and Virginia move together: Prince George\'s, Montgomery, Arlington, Alexandria and more.',
            svg: () => sky('#14263b', '#1d3d4f') + '<path d="M160 30l60 60-60 60-60-60z" fill="#c8102e" opacity=".85"/><path d="M160 30l60 60-60 60-60-60z" fill="none" stroke="#fff" stroke-width="2"/>' +
                '<path d="M128 112q20-18 30 6t40 0" fill="none" stroke="#6fb3d6" stroke-width="5"/>' +
                `<text x="160" y="96" text-anchor="middle" fill="#fff" ${font} font-weight="900" font-size="20">DC</text>` +
                `<text x="60" y="64" text-anchor="middle" fill="#ffd36e" ${font} font-weight="800" font-size="16">MD</text><text x="262" y="132" text-anchor="middle" fill="#9fe3b0" ${font} font-weight="800" font-size="16">VA</text>` + label('THE DMV', '#f4f0e6') }
    ];
    const byId = Object.fromEntries(cards.map(c => [c.id, c]));
    const INTERVAL = 4000;
    const escape = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

    function svg(id) {
        const card = byId[id];
        if (!card) throw new Error(`Unknown travel art card: ${id}`);
        return `<svg viewBox="0 0 320 180" role="img" aria-label="Original illustration: ${escape(card.title)}" preserveAspectRatio="xMidYMid slice">${card.svg().replace('id="g"', `id="sky-${id}"`).replace('url(#g)', `url(#sky-${id})`)}</svg>`;
    }
    function startIndex(trip) {
        return [...`${trip.origin}${trip.destination}${trip.mode}`].reduce((n, ch) => n + ch.charCodeAt(0), 0) % cards.length;
    }
    // Deterministic per trip so a reload resumes on the same card.
    function cardAt(trip, now, interval = INTERVAL) {
        if (!trip || !Number.isFinite(trip.started) || !Number.isFinite(now) || !(interval > 0)) throw new Error('Invalid travel art time');
        const step = Math.floor(Math.max(0, now - trip.started) / interval);
        return cards[(startIndex(trip) + step) % cards.length];
    }
    const billboardSets = {
        NW: ['u-street', 'howard', 'go-go'], NE: ['chocolate-city', 'athletes', 'dmv-map'],
        SE: ['anacostia', 'mambo', 'legends'], SW: ['capitol', 'blossoms', 'metro-vault']
    };
    function billboards(quadrant) {
        const ids = billboardSets[quadrant];
        if (!ids) throw new Error(`Unknown quadrant: ${quadrant}`);
        return ids.map(id => byId[id]);
    }
    const images = {};
    function image(id) {
        if (!images[id] && typeof Image !== 'undefined') {
            const img = new Image();
            img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg(id).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" '))}`;
            images[id] = img;
        }
        return images[id];
    }
    function drawBillboard(ctx, id, sx, sy) {
        const img = image(id), w = 96, h = 54, top = sy - 92;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(sx + 3, sy + 1, 22, 6, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#3b3f48'; ctx.fillRect(sx - 18, top + h, 4, sy - top - h); ctx.fillRect(sx + 14, top + h, 4, sy - top - h);
        ctx.fillStyle = '#1b1e25'; ctx.fillRect(sx - w / 2 - 4, top - 4, w + 8, h + 8);
        if (img && img.complete && img.naturalWidth) ctx.drawImage(img, sx - w / 2, top, w, h);
        else { ctx.fillStyle = '#3d2219'; ctx.fillRect(sx - w / 2, top, w, h); }
        ctx.fillStyle = '#c9a24b'; ctx.fillRect(sx - w / 2 - 4, top + h + 4, w + 8, 3);
        ctx.restore();
    }
    return { cards, INTERVAL, svg, cardAt, billboards, image, drawBillboard };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = TravelArt;
