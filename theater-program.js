'use strict';

// Original illustrated previews reserve occasional slots for future performances.
const TheaterProgram = [
    { id: 'performance-block-party', afterFeature: 'feature-dmv-sports', kind: 'music',
        title: 'The Sidewalk Pocket: A Fictional Go-Go Showcase', icon: '\u266b',
        scenes: [
            { title: 'House lights down', seconds: 40,
                narration: 'Illustrated music preview, not a live feed or recording. An imaginary neighborhood band steps into the amber light. The drummer raises two sticks; the conga player answers with a grin. Tonight, even the folding chairs have rhythm.' },
            { title: 'Find the pocket', seconds: 45,
                narration: 'The fictional bandleader calls, "Who brought the groove?" A voice from the balcony answers, "My auntie, but she parked it around the corner!" The bass player holds a steady imaginary pulse while the percussionists trade playful gestures.' },
            { title: 'Everybody gets a solo', seconds: 45,
                narration: 'The keyboard player takes a bow before playing a note. The drummer points at a sign: SOLOS MUST FIT IN THE ELEVATOR. An original illustrated stage sketch celebrates listening, call-and-response and leaving room for the rest of the band.' },
            { title: 'One more bow', seconds: 35,
                narration: 'The lights warm to gold as the imaginary musicians line up for a final bow. This preview slot can later host an actual performance supplied for the rotating program. For now, the scene is original fiction with optional browser narration, not musical audio.' }
        ] },
    { id: 'performance-last-chair', afterFeature: 'feature-freedom', kind: 'play',
        title: 'The Last Folding Chair: An Original Mini-Play', icon: '\u2726',
        scenes: [
            { title: 'Act I: Reserved for somebody', seconds: 40,
                narration: 'Illustrated play preview, not a live feed or recording. Two fictional neighbors stand beside one folding chair. REN: "That seat is reserved." JO: "For who?" REN: "The person who remembers why we came to this meeting." Both look at the ceiling.' },
            { title: 'Act II: A very important agenda', seconds: 45,
                narration: 'JO unfolds a paper. "Item one: buy more chairs." REN nods. "Item two: stop having meetings about buying chairs." From the wings, a fictional stage manager whispers, "We spent the chair budget printing agendas." A spotlight settles on the empty seat.' },
            { title: 'Act III: Community seating', seconds: 45,
                narration: 'REN: "Maybe nobody needs to win the chair." JO: "Good, because it wobbles." They turn it into a tiny table and set the agenda on top. Their imaginary neighbors gather around. For the first time, everyone can see the plan.' },
            { title: 'Curtain call', seconds: 35,
                narration: 'The fictional cast bows beside its unusually successful furniture. This original comedy sketch is an illustrated placeholder for occasional future stage performances. No actors or audience members are connected live; browser narration is optional.' }
        ] }
];

if (typeof module !== 'undefined' && module.exports) module.exports = TheaterProgram;
