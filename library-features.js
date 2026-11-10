'use strict';

const LibraryFeatures = (() => {
    const gaming = [
        { id: 'switch-two', title: 'A new console, a familiar question: will my games come along?', date: '2025-06-05',
            topic: 'Nintendo Switch 2 launch', source: 'https://en.wikipedia.org/wiki/Nintendo_Switch_2',
            paragraphs: [
                'Nintendo launched Switch 2 on June 5, 2025. Like the original Switch, it can be played as a handheld or connected to a television. Its launch illustrates a challenge every new console faces: offering something new without leaving a player’s existing collection behind.',
                'Backward compatibility means a newer device can run games made for an older one. It does not mean every game or accessory works without exceptions. Check the maker’s compatibility information for a particular title instead of assuming that a familiar logo guarantees support.',
                'Design takeaway: a platform is more than a faster processor. Screen choices, controls, software support and the games available all shape whether it fits a player. This is a launch-day snapshot, not a current buying guide.'
            ] },
        { id: 'astro-craft', title: 'Small robot, big design lesson', date: '2024-12-12',
            topic: 'Astro Bot wins Game of the Year', source: 'https://en.wikipedia.org/wiki/Astro_Bot',
            paragraphs: [
                'Astro Bot won Game of the Year at The Game Awards 2024. Team Asobi’s platform game builds levels around jumping, exploration and playful interactions. The award is a dated result from one event, not proof that everybody must like the same game.',
                'For a beginner designer, the useful lesson is how clearly a game teaches movement. A safe place to try an action can come before a harder obstacle. Sounds, animation and controller feedback can show what happened without stopping play for a page of instructions.',
                'Try thinking like a designer: choose one simple action, teach it, change the situation, then give the player a surprising use for it. You do not need a giant map to make a memorable challenge.'
            ] },
        { id: 'access-design', title: 'Controls should fit the player', date: '2024-08-21',
            topic: 'Xbox Adaptive Joystick announcement', source: 'https://en.wikipedia.org/wiki/Xbox_Adaptive_Joystick',
            paragraphs: [
                'Microsoft announced the Xbox Adaptive Joystick in August 2024, ahead of its 2025 release. It was designed as an accessibility-focused controller option. Accessibility hardware is not a single universal solution: different players need different arrangements.',
                'Game developers can help by supporting remapping, adjustable sensitivity, clear menus and alternatives to repeated button pressing. Captions, readable text and information that does not depend on color alone help too.',
                'The practical lesson is to ask what a game requires from someone’s hands, eyes, ears and attention. Offer more than one way to do important actions, and test with players who have different needs. This brief is about design, not medical advice or a promise that a specific device suits everyone.'
            ] },
        { id: 'zelda-systems', title: 'What happens when the player builds the solution?', date: '2023-05-12',
            topic: 'Tears of the Kingdom release', source: 'https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Tears_of_the_Kingdom',
            paragraphs: [
                'The Legend of Zelda: Tears of the Kingdom released in May 2023. Its building and object-combining abilities let players experiment with ways to travel and solve problems. That makes it a useful example of systems interacting rather than every solution being a separate scripted moment.',
                'A system is a set of rules. If objects can attach, move and respond to forces, combinations may produce solutions a designer did not explicitly write. The work is not just inventing abilities: developers must also communicate limits and handle unexpected combinations.',
                'A small prototype can explore the same idea. Give a player two objects and one clear goal, watch what they try, then improve feedback. The lesson is experimentation, not copying a commercial game’s characters, artwork or code.'
            ] }
    ];
    const gossip = [
        { id: 'air-fryer', title: 'AIR FRYER DENIES BEING “JUST A SMALL OVEN”', magazine: 'The Side-Eye Weekly',
            paragraphs: [
                'The fictional neighborhood appliance scene is in shambles after an air fryer demanded its own dressing room. “I have a brand,” it told our reporter, who was a spoon wearing a press badge.',
                'A toaster alleged that the fryer had been calling its basket a private suite. The fryer declined to comment, then released a twelve-slide statement titled My Journey, My Crunch. Slide seven was a photograph of one extremely confident potato.',
                'Neighbors say the drama started when someone introduced the microwave as “the one who actually feeds everybody.” The air fryer allegedly responded by preheating for emotional reasons. No food was harmed. Several egos required a nap.',
                'At press time, the refrigerator had offered to mediate, provided everyone stopped opening its door just to think. The freezer said it was staying out of the situation because it had already been described as cold.'
            ] },
        { id: 'raccoon', title: 'RACCOON SPOTTED LEAVING THREE DIFFERENT BRUNCHES', magazine: 'Unconfirmed & Unbothered',
            paragraphs: [
                'Sir Crumbsley, an entirely invented raccoon with no official job, was seen entering three brunches in one morning. His publicist called it a “multi-location networking experience.” His publicist is another raccoon in a smaller vest.',
                'Witnesses say he arrived with an empty tote bag and left with what one source described as “the emotional weight of fourteen biscuits.” A squirrel claimed Crumbsley had promised to keep things exclusive with a bagel. The bagel could not be reached because it had become lunch.',
                'Crumbsley addressed the rumors from the top of a recycling bin: “I never said I was seeing only one buffet.” He then asked whether the microphone was edible.',
                'The community brunch committee has introduced a new policy: one plate per guest, and a guest must not be four raccoons operating a trench coat. Committee members admit the second rule is harder to enforce than expected.'
            ] },
        { id: 'elevator', title: 'ELEVATOR CAUGHT TALKING TO ANOTHER FLOOR', magazine: 'The Lobby Lowdown',
            paragraphs: [
                'Tenants of the completely fictional Velvet Sock Apartments are demanding answers after their elevator described the seventh floor as “special.” The sixth floor says it has been supporting that elevator for years.',
                'Building management insists the relationship is professional. “It goes up and down,” said a spokesperson, accidentally making the situation worse. The stairs offered a statement, but nobody wanted to take all those steps.',
                'An anonymous doormat claims the elevator has changed. “It used to stop for us. Now it just says capacity reached and looks away.” The elevator says it is entitled to boundaries and that six grocery carts are not a personality.',
                'A reconciliation meeting is scheduled in the lobby. The elevator has agreed to attend if everyone stops pressing its buttons. The revolving door will moderate, though critics say it keeps bringing the conversation back around.'
            ] },
        { id: 'lemon', title: 'LEMON ANNOUNCES SOLO CAREER AFTER “CREATIVE DIFFERENCES”', magazine: 'Pulp Culture',
            paragraphs: [
                'Lemuel Zest has left the fictional group Citrus Situation. His statement thanked the fans, the orchard and “everybody who believed I could be more than a garnish.”',
                'The group’s orange says there is no bitterness, an allegation nobody believes. Their lime has unfollowed everyone and posted a black square captioned Growth. The grapefruit is giving a podcast interview that currently has no scheduled ending.',
                'Lemuel’s debut single, Squeezed But Not Defeated, will be available wherever imaginary fruit streams imaginary music. A deluxe edition includes sixteen voice notes and the sound of somebody putting ice in a cup.',
                'His first solo concert has already sold out the windowsill. Asked whether he misses the group, Lemuel said, “We made concentrate together.” His manager quietly asked him to stop giving reporters free headlines.'
            ] },
        { id: 'sneaker', title: 'LEFT SNEAKER DEMANDS CREDIT FOR CARRYING THE OUTFIT', magazine: 'Sole Confidential',
            paragraphs: [
                'A fictional left sneaker named Lace Witherspoon has accused its right-foot partner of doing “half the walking and all the posing.” The right sneaker says it cannot respond until it finds its tongue.',
                'Sources close to the shoe rack describe a tense atmosphere. The loafers are staying neutral. A hiking boot says the pair need perspective, but it has been telling everyone to touch grass since Tuesday.',
                'The dispute escalated when Left appeared at a photo shoot without Right. Fashion critics called the look bold. The owner called it being late for the bus.',
                'Negotiations continue over a shared cleaning schedule, equal shelf space and whether stepping in a puddle counts as a solo project. Their socks have requested privacy and a matching partner. At press time, one sock had disappeared in circumstances the washing machine called “outside my department.”'
            ] },
        { id: 'npc', title: 'NPC WITH ONE LINE SIGNS SIX-BOOK MEMOIR DEAL', magazine: 'Extremely Local Celebrity',
            paragraphs: [
                'Invented arcade resident Professor Button has landed a memoir deal despite having said only “Nice weather!” for fourteen consecutive years. His publisher calls him a fresh voice with an unusually consistent message.',
                'The first volume, Nice Weather: The Early Years, covers his controversial decision to stand beside a fountain. Volume two explores the time a player walked past him without pressing interact. “I had to find my own closure,” he said, before adding that the weather was nice.',
                'Critics are questioning whether six books are necessary. His agent says there is a rich inner life behind every repeated sentence, particularly when paid per volume. The fountain has retained its own lawyer.',
                'Professor Button will sign copies on Saturday. Fans are warned that the queue may repeat forever if nobody checks the exit condition. The professor promises a surprising announcement, which insiders strongly suspect will concern the weather.'
            ] }
    ];
    const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const words = article => article.paragraphs.join(' ').split(/\s+/).length;
    function weekly(list, date = new Date()) {
        if (!Number.isFinite(date.getTime())) throw new Error('Invalid magazine date');
        const week = Math.floor((date.getTime() - Date.UTC(2026, 0, 5)) / (7 * 86400000));
        const offset = (week % list.length + list.length) % list.length;
        return [list[offset], list[(offset + 1) % list.length]];
    }
    function render(content, back, mode, history) {
        const fiction = mode === 'gossip', list = fiction ? gossip : gaming;
        const notice = fiction ? 'COMPLETELY FICTIONAL COMEDY. All characters, publications and events are invented. No real gossip or real-person allegations.' :
            'Dated gaming briefs, not live news. These are original short summaries of 2023–2025 events, not copied articles. Source links are further reading; independent verification is pending. New live articles are not fetched.';
        function catalog() {
            const featured = weekly(list);
            content.innerHTML = `<div class="sports-game sportsbook library-reader"><h2>${fiction ? 'Fictional Gossip Magazine Rack' : 'Video Games Reading Room'}</h2>
                <p class="book-warning">${notice}</p>
                ${fiction ? '' : '<button type="button" id="gaming-history">History &amp; game development books</button>'}
                <h3>This week’s featured short reads</h3>${featured.map(a => card(a)).join('')}
                <details class="book-card"><summary>Browse all ${list.length} ${fiction ? 'magazines' : 'gaming briefs'}</summary>${list.map(a => card(a)).join('')}</details>
                <p class="book-muted">Featured picks rotate on Mondays (UTC) from this bundled catalog. Rotation does not create new reporting.</p>
                <button type="button" id="features-back">Back to library</button></div>`;
            content.querySelectorAll('[data-feature]').forEach(button => button.addEventListener('click', () => read(button.dataset.feature)));
            content.querySelector('#features-back').addEventListener('click', back);
            const books = content.querySelector('#gaming-history');
            if (books) books.addEventListener('click', history);
        }
        function card(a) {
            return `<article class="book-card"><h3>${escape(a.title)}</h3><p>${escape(a.magazine || a.topic)} · ${fiction ? 'Original fictional satire' : a.date} · ${words(a)} words · about 1 min</p>
                <button type="button" data-feature="${a.id}">Read ${fiction ? 'magazine story' : 'short brief'}</button></article>`;
        }
        function read(id) {
            const a = list.find(entry => entry.id === id);
            if (!a) throw new Error('Unknown library feature');
            content.innerHTML = `<article class="sports-game sportsbook library-reader"><h2 tabindex="-1">${escape(a.title)}</h2>
                <p class="book-warning">${notice}</p><p>${escape(a.magazine || `${a.topic} · ${a.date}`)} · ${words(a)} words</p>
                ${a.paragraphs.map(p => `<p class="library-paragraph">${escape(p)}</p>`).join('')}
                ${a.source ? `<p><a href="${a.source}" target="_blank" rel="noopener noreferrer">Source &amp; further reading</a></p>` : ''}
                <button type="button" id="feature-back">Back to ${fiction ? 'magazine rack' : 'gaming features'}</button></article>`;
            content.querySelector('#feature-back').addEventListener('click', catalog);
            content.querySelector('h2').focus();
        }
        catalog();
    }
    return { gaming, gossip, weekly, words,
        renderGaming: (content, back, history) => render(content, back, 'gaming', history),
        renderGossip: (content, back) => render(content, back, 'gossip') };
})();

if (typeof module !== 'undefined') module.exports = LibraryFeatures;
