'use strict';

// Career/trade study guides, quizzes and DC/MD/VA learner-permit practice tests.
// Progress (best quiz scores and practice permits) is optional save data validated by `valid`.
const Learning = (() => {
    const data = typeof LearningData !== 'undefined' ? LearningData : require('./learning-data.js');
    const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const JURISDICTIONS = ['DC', 'MD', 'VA'];
    const PERMIT_QUESTIONS = 10, PERMIT_PASS = 0.8;
    const initial = () => ({ quizBest: {}, permits: {} });
    function valid(state) {
        if (!state || typeof state !== 'object' || Array.isArray(state)) return false;
        const { quizBest, permits } = state;
        if (!quizBest || typeof quizBest !== 'object' || Array.isArray(quizBest)) return false;
        if (!permits || typeof permits !== 'object' || Array.isArray(permits)) return false;
        if (Object.keys(state).some(k => !['quizBest', 'permits'].includes(k))) return false;
        const tradeIds = new Set(data.trades.map(t => t.id));
        for (const [id, score] of Object.entries(quizBest))
            if (!tradeIds.has(id) || !Number.isInteger(score) || score < 0 || score > 100) return false;
        for (const [id, date] of Object.entries(permits))
            if (!JURISDICTIONS.includes(id) || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
        return true;
    }
    function shuffle(list, random = Math.random) {
        const out = [...list];
        for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
        return out;
    }
    function shuffleChoices(q, random = Math.random) {
        const order = shuffle(q.choices.map((_, i) => i), random);
        return { ...q, choices: order.map(i => q.choices[i]), answer: order.indexOf(q.answer) };
    }
    function permitTest(jurisdiction, random = Math.random) {
        if (!JURISDICTIONS.includes(jurisdiction)) throw new Error('Unknown jurisdiction');
        const own = data.permitQuestions.filter(q => q.jurisdiction === jurisdiction);
        const shared = data.permitQuestions.filter(q => q.jurisdiction !== jurisdiction && q.general);
        const picked = [...shuffle(own, random).slice(0, 7)];
        picked.push(...shuffle(shared, random).slice(0, PERMIT_QUESTIONS - picked.length));
        return shuffle(picked, random).slice(0, PERMIT_QUESTIONS).map(q => shuffleChoices(q, random));
    }
    const score = (questions, answers) => questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
    const percent = (right, total) => Math.round(100 * right / total);
    const passed = (right, total) => right / total >= PERMIT_PASS;
    function recordQuiz(state, tradeId, pct) {
        const next = { quizBest: { ...state.quizBest }, permits: { ...state.permits } };
        next.quizBest[tradeId] = Math.max(next.quizBest[tradeId] || 0, pct);
        return next;
    }
    function recordPermit(state, jurisdiction, date = new Date()) {
        const next = { quizBest: { ...state.quizBest }, permits: { ...state.permits } };
        if (!next.permits[jurisdiction]) next.permits[jurisdiction] = date.toISOString().slice(0, 10);
        return next;
    }

    // Generic multiple-choice runner: one question at a time with immediate explanation.
    function runQuiz(content, { title, intro, questions, onFinish, back, backLabel }) {
        let i = 0, right = 0;
        const answers = [];
        function ask() {
            const q = questions[i];
            content.innerHTML = `<div class="sports-game sportsbook library-reader"><h2>${escape(title)}</h2>
                <p class="book-muted">${i === 0 && intro ? escape(intro) + ' · ' : ''}Question ${i + 1} of ${questions.length} · Correct so far: ${right}</p>
                <fieldset class="book-quiz"><legend><strong>${escape(q.question)}</strong></legend>
                ${q.choices.map((c, n) => `<button type="button" data-answer="${n}">${String.fromCharCode(65 + n)}. ${escape(c)}</button>`).join('')}</fieldset>
                <div id="quiz-feedback" aria-live="polite"></div><button type="button" id="quiz-quit">${escape(backLabel || 'Quit')}</button></div>`;
            content.querySelectorAll('[data-answer]').forEach(b => b.addEventListener('click', () => {
                const pick = Number(b.dataset.answer), ok = pick === q.answer;
                answers[i] = pick;
                if (ok) right++;
                content.querySelectorAll('[data-answer]').forEach(x => {
                    x.disabled = true;
                    if (Number(x.dataset.answer) === q.answer) x.classList.add('quiz-right');
                    else if (x === b) x.classList.add('quiz-wrong');
                });
                content.querySelector('#quiz-feedback').innerHTML = `<p class="book-explainer"><strong>${ok ? '✅ Correct.' : '❌ Not quite.'}</strong> ${escape(q.explanation)}</p>
                    ${q.source ? `<p class="book-muted">Source: <a href="${escape(q.source)}" target="_blank" rel="noopener noreferrer">${escape(q.source)}</a></p>` : ''}
                    <button type="button" id="quiz-next" class="book-primary">${i + 1 < questions.length ? 'Next question' : 'See results'}</button>`;
                content.querySelector('#quiz-next').addEventListener('click', () => { i++; if (i < questions.length) ask(); else onFinish(right, questions.length, answers); });
                content.querySelector('#quiz-next').focus();
            }));
            content.querySelector('#quiz-quit').addEventListener('click', back);
        }
        ask();
    }

    function renderGuide(content, tradeId, back) {
        const t = data.trades.find(x => x.id === tradeId);
        if (!t) throw new Error('Unknown trade');
        content.innerHTML = `<article class="sports-game sportsbook library-reader"><h2 id="trade-title" tabindex="-1">${t.icon} ${escape(t.title)}</h2>
            <p class="book-muted">${escape(t.category)} · Study guide · ${t.facts.length} key ideas</p>
            <p class="book-explainer"><strong>Remember it:</strong> ${escape(t.mnemonic)}</p>
            <ol class="trade-facts">${t.facts.map(f => `<li class="library-paragraph">${escape(f.text)} <a class="book-muted" href="${escape(f.source)}" target="_blank" rel="noopener noreferrer">source</a></li>`).join('')}</ol>
            <p class="book-muted">Licensing, apprenticeship and pay rules vary in DC, Maryland and Virginia, and they change. Check the official board before you apply. Practice quizzes are on library and home computers.</p>
            <button type="button" id="trade-back">Back</button></article>`;
        content.querySelector('#trade-back').addEventListener('click', back);
        content.querySelector('#trade-title').focus();
    }

    function renderCareerShelf(content, back) {
        content.innerHTML = `<div class="sports-game sportsbook library-reader"><h2>🧰 Trades & Careers Shelf</h2>
            <p>Easy-to-remember study guides for in-demand careers. Each guide has a memory trick, key safety ideas, and the usual path in. Take the matching quiz on any computer.</p>
            ${data.trades.map(t => `<article class="book-card"><h3>${t.icon} ${escape(t.title)}</h3><p>${escape(t.category)} · ${t.facts.length} key ideas</p>
            <button type="button" data-trade="${t.id}">Read study guide</button></article>`).join('')}
            <button type="button" id="career-back">Back to library</button></div>`;
        content.querySelectorAll('[data-trade]').forEach(b => b.addEventListener('click', () => renderGuide(content, b.dataset.trade, () => renderCareerShelf(content, back))));
        content.querySelector('#career-back').addEventListener('click', back);
    }

    function renderQuizCenter(content, getState, setState, back) {
        const state = getState();
        content.innerHTML = `<div class="sports-game sportsbook library-reader"><h2>🎓 Skills Quiz Center</h2>
            <p>Five-question checks for each trade and career guide. Your best score is saved. Quizzes teach; they don’t pay stars.</p>
            ${data.trades.map(t => `<article class="book-card"><h3>${t.icon} ${escape(t.title)}</h3>
            <p>Best score: ${state.quizBest[t.id] === undefined ? 'not taken yet' : state.quizBest[t.id] + '%'}</p>
            <div class="sports-controls"><button type="button" data-quiz="${t.id}">Take quiz</button><button type="button" data-guide="${t.id}">Review guide</button></div></article>`).join('')}
            <button type="button" id="quizzes-back">Back</button></div>`;
        const again = () => renderQuizCenter(content, getState, setState, back);
        content.querySelectorAll('[data-guide]').forEach(b => b.addEventListener('click', () => renderGuide(content, b.dataset.guide, again)));
        content.querySelectorAll('[data-quiz]').forEach(b => b.addEventListener('click', () => {
            const t = data.trades.find(x => x.id === b.dataset.quiz);
            runQuiz(content, { title: `${t.icon} ${t.title} Quiz`, questions: shuffle(t.quiz).map(q => shuffleChoices(q)), back: again, backLabel: 'Quit quiz',
                onFinish: (right, total) => {
                    const pct = percent(right, total);
                    setState(recordQuiz(getState(), t.id, pct));
                    content.innerHTML = `<div class="sports-game sportsbook library-reader"><h2>${t.icon} Quiz results</h2>
                        <p class="book-explainer"><strong>${right}/${total} (${pct}%)</strong> ${pct === 100 ? 'Perfect — you know this guide.' : pct >= 60 ? 'Solid. Review the guide to close the gaps.' : 'Read the guide again, then retry.'}</p>
                        <div class="sports-controls"><button type="button" id="quiz-retry">Retry</button><button type="button" id="quiz-guide">Review guide</button><button type="button" id="quiz-done">All quizzes</button></div></div>`;
                    content.querySelector('#quiz-retry').addEventListener('click', () => b.click());
                    content.querySelector('#quiz-guide').addEventListener('click', () => renderGuide(content, t.id, again));
                    content.querySelector('#quiz-done').addEventListener('click', again);
                } });
        }));
        content.querySelector('#quizzes-back').addEventListener('click', back);
    }

    function renderDMV(content, getState, setState, back) {
        const state = getState(), names = { DC: 'District of Columbia', MD: 'Maryland', VA: 'Virginia' };
        content.innerHTML = `<div class="sports-game sportsbook library-reader"><h2>🚦 DMV Service Center</h2>
            <p>Take a practice learner-permit knowledge test. Questions are original, based on the official DC, Maryland and Virginia driver manuals. Pass with ${PERMIT_PASS * 100}% to earn an in-game practice permit.</p>
            <p class="book-muted">This is study practice, not the official exam. Real test formats, which are listed below, can change. Always study the current official manual.</p>
            ${JURISDICTIONS.map(j => { const f = data.testFormats[j]; return `<article class="book-card"><h3>${j} · ${names[j]}</h3>
            <p>${escape(f.summary)} <a class="book-muted" href="${escape(f.source)}" target="_blank" rel="noopener noreferrer">official info</a></p>
            <p>${state.permits[j] ? `🪪 Practice permit earned ${state.permits[j]}` : 'No practice permit yet'}</p>
            <button type="button" data-permit="${j}">Start ${j} practice test (${PERMIT_QUESTIONS} questions)</button></article>`; }).join('')}
            <button type="button" id="dmv-back">Leave DMV</button></div>`;
        const again = () => renderDMV(content, getState, setState, back);
        content.querySelectorAll('[data-permit]').forEach(b => b.addEventListener('click', () => {
            const j = b.dataset.permit, questions = permitTest(j);
            runQuiz(content, { title: `${j} Learner Permit Practice`, intro: `Pass mark ${PERMIT_PASS * 100}%`, questions, back: again, backLabel: 'Leave test',
                onFinish: (right, total) => {
                    const ok = passed(right, total), first = ok && !getState().permits[j];
                    if (ok) setState(recordPermit(getState(), j));
                    content.innerHTML = `<div class="sports-game sportsbook library-reader"><h2>${ok ? '🪪 You passed!' : '📘 Keep studying'}</h2>
                        <p class="book-explainer"><strong>${right}/${total} (${percent(right, total)}%)</strong> ${ok ? (first ? `Your ${j} practice permit is saved to your profile.` : 'Great refresher — your permit is already on file.') : `You need ${Math.ceil(total * PERMIT_PASS)} correct. Review the explanations and try again with new questions.`}</p>
                        <div class="sports-controls"><button type="button" id="permit-retry">Take another ${j} test</button><button type="button" id="permit-done">Back to counter</button></div></div>`;
                    content.querySelector('#permit-retry').addEventListener('click', () => b.click());
                    content.querySelector('#permit-done').addEventListener('click', again);
                } });
        }));
        content.querySelector('#dmv-back').addEventListener('click', back);
    }

    return { data, JURISDICTIONS, PERMIT_QUESTIONS, PERMIT_PASS, initial, valid, shuffleChoices, permitTest, score, percent, passed,
        recordQuiz, recordPermit, renderCareerShelf, renderGuide, renderQuizCenter, renderDMV };
})();

if (typeof module !== 'undefined') module.exports = Learning;
