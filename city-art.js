'use strict';

const CityArt = (() => {
    const legends = {
        hayes: { name: 'Elvin Hayes', note: 'Washington basketball', skin: '#9a613e', hair: '#30231d', shirt: '#315b87', style: 'jersey', afro: true },
        green: { name: 'Darrell Green', note: 'Washington football', skin: '#8f5838', hair: '#251d19', shirt: '#802c40', style: 'jersey' },
        gibson: { name: 'Josh Gibson', note: 'Homestead Grays baseball in DC', skin: '#865335', hair: '#30231d', shirt: '#e4dfcb', style: 'cap' },
        krieger: { name: 'Ali Krieger', note: 'Northern Virginia soccer', skin: '#d8a580', hair: '#493124', shirt: '#356791', style: 'ponytail' },
        tiafoe: { name: 'Frances Tiafoe', note: 'Hyattsville tennis', skin: '#824b30', hair: '#251d19', shirt: '#61a4ab', style: 'headband' },
        elder: { name: 'Lee Elder', note: 'Washington golf', skin: '#945a3c', hair: '#e1d4b8', shirt: '#843746', style: 'cap', mustache: true },
        leonard: { name: 'Sugar Ray Leonard', note: 'Palmer Park boxing', skin: '#a66b43', hair: '#30231d', shirt: '#b64a45', style: 'boxing', afro: true },
        langway: { name: 'Rod Langway', note: 'Washington hockey', skin: '#d6a180', hair: '#6f4930', shirt: '#294e76', style: 'jersey', mustache: true },
        ellington: { name: 'Duke Ellington', note: 'DC-born jazz composer', skin: '#aa724d', hair: '#30231d', shirt: '#293b50', style: 'suit', mustache: true },
        brown: { name: 'Chuck Brown', note: 'DC go-go music', skin: '#975e3c', hair: '#c5b7a3', shirt: '#8b433d', style: 'cap', glasses: true, mustache: true },
        thomas: { name: 'Alma Thomas', note: 'Washington artist and educator', skin: '#986443', hair: '#b8afa2', shirt: '#9b5b79', style: 'art', glasses: true },
        virginia: { name: 'Virginia Ali', note: 'DC restaurant and community figure', skin: '#a87350', hair: '#d2c7b9', shirt: '#7b496a', style: 'art' },
        ben: { name: 'Ben Ali', note: "Co-founder of Ben's Chili Bowl", skin: '#b88258', hair: '#b8ad99', shirt: '#4e7169', style: 'suit', mustache: true },
        banneker: { name: 'Benjamin Banneker', note: 'Maryland astronomer and surveyor', skin: '#825031', hair: '#c5c0b4', shirt: '#555b6d', style: 'waistcoat' }
    };
    const themes = {
        basketball: ['District Hardwood', 'court', '#273f62', '#c49760', ['hayes', 'green']],
        football: ['Capital Gridiron', 'field', '#5b2938', '#376b43', ['green', 'hayes']],
        baseball: ['Community Diamond', 'diamond', '#23434d', '#367647', ['gibson', 'hayes']],
        soccer: ['Neighborhood Soccer Park', 'goal', '#245b59', '#39864f', ['krieger', 'tiafoe']],
        tennis: ['DMV Tennis Club', 'racket', '#254a67', '#327388', ['tiafoe', 'krieger']],
        golf: ['District Putting Club', 'golf', '#3c5143', '#3e8450', ['elder', 'banneker']],
        boxing: ['Palmer Park Fight Night', 'ring', '#5a3038', '#42597e', ['leonard', 'green']],
        drive: ['Chocolate City Night Drive', 'road', '#27395c', '#343947', ['banneker', 'brown']],
        pool: ['U Street Billiards', 'pool', '#443657', '#26705e', ['ellington', 'brown']],
        airhockey: ['Capital Ice Lounge', 'hockey', '#273f68', '#6095af', ['langway', 'hayes']],
        chess: ['Banneker Strategy Room', 'chess', '#444260', '#84704f', ['banneker', 'thomas']],
        lemonade: ['Neighborhood Lemonade Patio', 'counter', '#32656b', '#a88a3f', ['virginia', 'thomas']],
        subshop: ['Chocolate City Sandwich Counter', 'counter', '#41644c', '#986c47', ['ben', 'virginia']],
        carryout: ['Mambo Carryout Kitchen', 'counter', '#67333b', '#8e674b', ['ben', 'virginia']],
        resale: ['District Style Gallery', 'shop', '#513b6c', '#5c566b', ['thomas', 'brown']],
        courier: ['Chocolate City Dispatch', 'road', '#315369', '#3d5260', ['banneker', 'virginia']],
        casino: ['Chocolate City Casino', 'pool', '#46334f', '#346157', ['ellington', 'thomas']]
    };
    const venueThemes = { crib: 'chess', library: 'chess', venue: 'pool', gogo: 'pool', retail: 'resale',
        arena: 'basketball', sports: 'baseball', fashion: 'resale', theater: 'pool', dmv: 'drive' };
    const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    function theme(key) {
        const values = themes[venueThemes[key] || key];
        if (!values) throw new Error(`Unknown city-art theme: ${key}`);
        const [title, kind, wall, floor, people] = values;
        return { title, kind, wall, floor, people };
    }
    function portrait(id) {
        const p = legends[id];
        if (!p) throw new Error(`Unknown city-art legend: ${id}`);
        return `<svg viewBox="0 0 80 90" role="img" aria-label="Original stylized tribute portrait of ${escape(p.name)}">
            <path d="M0 0h80v90H0z" fill="#192b3d"/><circle cx="40" cy="33" r="27" fill="#d0a45f" opacity=".23"/>
            ${p.style === 'ponytail' ? `<ellipse cx="56" cy="32" rx="11" ry="20" fill="${p.hair}"/>` : ''}
            <path d="M12 90v-13q0-24 28-24t28 24v13" fill="${p.shirt}"/>
            <path d="M34 47v12q6 7 12 0V47" fill="${p.skin}"/>
            <ellipse cx="40" cy="32" rx="17" ry="22" fill="${p.skin}"/>
            <path d="M23 30v-9q1-18 17-18t17 18v9l-5-13q-12 6-24 0z" fill="${p.hair}"/>
            ${p.afro ? `<path d="M20 24Q13 4 29 3q11-10 22 0 18-1 10 23l-7-10H27z" fill="${p.hair}"/>` : ''}
            <path d="M29 30h7m8 0h7" stroke="#38271e" stroke-width="2"/>
            <circle cx="33" cy="34" r="1.7" fill="#201a19"/><circle cx="47" cy="34" r="1.7" fill="#201a19"/>
            <path d="M40 35l-2 7h4" fill="none" stroke="#69412f" stroke-width="1.2"/>
            <path d="M35 47q5 3 10 0" fill="none" stroke="#633829" stroke-width="1.4"/>
            ${p.mustache ? `<path d="M34 43q6-4 12 0" fill="none" stroke="${p.hair}" stroke-width="2.5"/>` : ''}
            ${p.glasses ? '<path d="M25 31h13v9H25zm17 0h13v9H42zm-4 3h4" fill="#192633" stroke="#c3a45c" stroke-width="1.5"/>' : ''}
            ${p.style === 'cap' ? `<path d="M21 19q1-18 19-18t19 18l7 6H21z" fill="${p.shirt}"/><path d="M22 22h42" stroke="#d8c591" stroke-width="2"/>` : ''}
            ${p.style === 'headband' ? '<path d="M23 20h34v6H23z" fill="#f3e7d0"/>' : ''}
            ${['suit', 'waistcoat'].includes(p.style) ? '<path d="M29 58l11 26 11-26-11 7z" fill="#f2e7d3"/><path d="M37 67h6l-3 15z" fill="#a96c45"/>' : ''}
            ${p.style === 'boxing' ? '<ellipse cx="20" cy="74" rx="11" ry="14" fill="#d24a4e"/><ellipse cx="60" cy="74" rx="11" ry="14" fill="#d24a4e"/>' : ''}
            ${p.style === 'art' ? [0, 1, 2, 3].map(i => `<path d="M${20 + i * 12} 68v16" stroke="${['#dfb855', '#8cb8c0', '#e5c4ba', '#9caa56'][i]}" stroke-width="5"/>`).join('') : ''}
            <path d="M4 86h72" stroke="#d0a45f" stroke-width="2"/></svg>`;
    }
    function skyline() {
        return '<path d="M0 150V80h30v70h8V67h34v83h8V90h38v60h12V65h22v85h12V110h65v40h15V70h30v80h16V85h40v65h15V55h30v95H0" fill="#142d40"/>' +
            '<path d="M150 135h70v15h-70zm12-12h46v12h-46zm7-10q16-31 32 0zM183 91v-12m-57 71 8-80 8 80z" fill="#d1c3a1"/>' +
            '<path d="M20 82l20-15 20 15m215 6 21-16 21 16" stroke="#ca8662" stroke-width="5"/>' +
            '<path d="M18 98h8v12h-8zm28 0h8v12h-8zm245 3h8v12h-8zm17 0h8v12h-8z" fill="#f1ca77"/>';
    }
    function mural(key) {
        const t = theme(key);
        return `<svg viewBox="0 0 360 160" aria-hidden="true" focusable="false"><path d="M0 0h360v160H0z" fill="${t.wall}"/>
            <circle cx="270" cy="38" r="27" fill="#e0b15d" opacity=".6"/>${skyline()}
            <path d="M0 154h360" stroke="#bc8b5d" stroke-width="8"/>
            <text x="12" y="30" fill="#f9dda0" font-family="system-ui,sans-serif" font-weight="800" font-size="16">CHOCOLATE CITY</text>
            <text x="12" y="49" fill="#e8d9c0" font-family="system-ui,sans-serif" font-size="10">Original neighborhood mural</text></svg>`;
    }
    function gallery(key) {
        const t = theme(key);
        return `<aside class="city-legend-gallery" aria-label="Legendary 202 tribute gallery">${t.people.map(id => {
            const p = legends[id];
            return `<figure>${portrait(id)}<figcaption><strong>${escape(p.name)}</strong><small>${escape(p.note)}</small></figcaption></figure>`;
        }).join('')}<small class="city-art-note">Original stylized tributes, not photos or endorsements.</small></aside>`;
    }
    function drawPortrait(c, p, x, y) {
        c.save(); c.translate(x, y);
        c.fillStyle = '#172739'; c.fillRect(-47, -8, 94, 126);
        c.strokeStyle = '#c9a769'; c.lineWidth = 2; c.strokeRect(-47, -8, 94, 126);
        c.fillStyle = p.shirt; c.beginPath(); c.roundRect(-29, 52, 58, 38, [16, 16, 0, 0]); c.fill();
        c.fillStyle = p.skin; c.fillRect(-7, 42, 14, 16);
        c.beginPath(); c.ellipse(0, 27, 21, 27, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = p.hair; c.beginPath(); c.ellipse(0, 8, p.afro ? 25 : 21, p.afro ? 18 : 13, 0, Math.PI, Math.PI * 2); c.fill();
        if (p.style === 'cap') { c.fillStyle = p.shirt; c.fillRect(-24, 2, 48, 9); c.fillRect(-24, 10, 55, 5); }
        if (p.style === 'headband') { c.fillStyle = '#efe3c9'; c.fillRect(-21, 9, 42, 6); }
        if (p.style === 'ponytail') { c.fillStyle = p.hair; c.beginPath(); c.ellipse(21, 27, 7, 26, 0, 0, Math.PI * 2); c.fill(); }
        c.fillStyle = '#201a19';
        for (const ex of [-8, 8]) { c.beginPath(); c.arc(ex, 25, 2, 0, Math.PI * 2); c.fill(); }
        c.strokeStyle = '#653c2d'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-5, 41); c.quadraticCurveTo(0, 44, 5, 41); c.stroke();
        if (p.mustache) { c.strokeStyle = p.hair; c.lineWidth = 3; c.beginPath(); c.moveTo(-7, 37); c.quadraticCurveTo(0, 33, 7, 37); c.stroke(); }
        if (p.glasses) { c.fillStyle = '#192633'; c.fillRect(-18, 19, 15, 11); c.fillRect(3, 19, 15, 11); }
        if (['suit', 'waistcoat'].includes(p.style)) {
            c.fillStyle = '#e9dfc9'; c.beginPath(); c.moveTo(-13, 55); c.lineTo(0, 81); c.lineTo(13, 55); c.closePath(); c.fill();
        }
        if (p.style === 'boxing') {
            c.fillStyle = '#d24a4e';
            for (const gx of [-22, 22]) { c.beginPath(); c.ellipse(gx, 70, 10, 13, 0, 0, Math.PI * 2); c.fill(); }
        }
        c.font = '700 10px system-ui'; c.fillStyle = '#ffe4a3'; c.textAlign = 'center';
        const words = p.name.split(' '), last = words.pop();
        c.fillText(words.join(' '), 0, 102); c.fillText(last, 0, 113);
        c.restore();
    }
    function drawLobby(c, key, U) {
        const t = theme(key);
        c.fillStyle = U.vgrad(c, 0, 560, [[0, t.wall], [.6, '#142438'], [1, t.floor]]);
        c.fillRect(0, 0, 360, 560);
        c.fillStyle = '#d9ac68'; c.beginPath(); c.arc(180, 51, 28, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#102b3c';
        for (let i = 0; i < 12; i++) c.fillRect(i * 32, 90 - i % 4 * 13, 26, 65 + i % 4 * 13);
        c.fillStyle = '#d9cfb7';
        c.beginPath(); c.moveTo(175, 151); c.lineTo(180, 51); c.lineTo(185, 151); c.closePath(); c.fill();
        c.fillRect(144, 126, 72, 25);
        c.beginPath(); c.arc(180, 125, 22, Math.PI, 0); c.fill();
        U.text(c, 'LEGENDARY 202', 180, 18, { size: 15, color: '#ffe1a0' });
        t.people.forEach((id, i) => drawPortrait(c, legends[id], i ? 286 : 74, 48));
        U.text(c, t.title, 180, 188, { size: 14, color: '#fff2d6' });
        c.fillStyle = t.floor; c.fillRect(0, 210, 360, 350);
        c.strokeStyle = '#e4d7b6'; c.lineWidth = 2;
        if (['court', 'field', 'goal', 'racket', 'hockey'].includes(t.kind)) {
            c.strokeRect(18, 238, 324, 302); c.beginPath(); c.moveTo(18, 389); c.lineTo(342, 389); c.stroke();
            c.beginPath(); c.ellipse(180, 389, 54, 38, 0, 0, Math.PI * 2); c.stroke();
            if (t.kind === 'goal') { c.strokeRect(114, 221, 132, 48); c.strokeRect(114, 492, 132, 48); }
            if (t.kind === 'court') { c.strokeRect(142, 239, 76, 65); c.strokeRect(142, 475, 76, 65); }
            if (t.kind === 'racket') { c.beginPath(); c.moveTo(18, 377); c.lineTo(342, 377); c.stroke(); }
        } else if (t.kind === 'road') {
            c.fillStyle = '#18232f'; c.beginPath(); c.moveTo(145, 210); c.lineTo(215, 210); c.lineTo(350, 560); c.lineTo(10, 560); c.closePath(); c.fill();
            c.fillStyle = '#f2cc71'; for (let y = 230; y < 560; y += 46) c.fillRect(177, y, 6, 24);
        } else if (t.kind === 'diamond') {
            c.fillStyle = '#b97e51'; c.beginPath(); c.moveTo(180, 540); c.lineTo(322, 389); c.lineTo(180, 238); c.lineTo(38, 389); c.closePath(); c.fill();
            c.stroke(); c.fillStyle = '#fff5db'; for (const [x, y] of [[180, 530], [308, 389], [180, 248], [52, 389]]) c.fillRect(x - 5, y - 5, 10, 10);
        } else if (t.kind === 'chess') {
            for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
                c.fillStyle = (x + y) % 2 ? '#4e4038' : '#cbb896'; c.fillRect(x * 45, 210 + y * 44, 45, 44);
            }
        } else if (t.kind === 'ring') {
            for (let y = 270; y <= 490; y += 55) c.strokeRect(20, y, 320, 22);
        } else if (t.kind === 'golf') {
            c.fillStyle = '#4d9b5c'; c.beginPath(); c.ellipse(180, 400, 150, 100, -.2, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.moveTo(210, 270); c.lineTo(210, 410); c.stroke();
            c.fillStyle = '#c94b53'; c.fillRect(211, 272, 42, 24);
        } else if (t.kind === 'pool') {
            c.fillStyle = '#1f6b52'; c.fillRect(26, 246, 308, 280); c.strokeRect(26, 246, 308, 280);
            c.fillStyle = '#0b1720'; for (const x of [30, 330]) for (const y of [250, 386, 522]) { c.beginPath(); c.arc(x, y, 10, 0, Math.PI * 2); c.fill(); }
        } else {
            for (let y = 230; y < 500; y += 38) { c.strokeStyle = '#b1aa8d66'; c.strokeRect(12, y, 336, 30); }
            c.fillStyle = '#a37c53'; c.fillRect(0, 480, 360, 20);
            c.fillStyle = '#203b48'; for (const x of [25, 140, 255]) c.fillRect(x, 245, 80, 60);
        }
        U.text(c, 'Original tribute art - no endorsement', 180, 552, { size: 10, color: '#ffe6ad' });
    }
    return { legends, themes, theme, portrait, mural, gallery, drawLobby };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = CityArt;
