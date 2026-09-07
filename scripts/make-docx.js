// Generate the Design-Intent Document (.docx). Text only, <=500 words, four
// judge-facing sections: who the players are, what the game is, what the
// prototype contains, and the future-state vision.
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

const H = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 90 }, children: [new TextRun({ text: t })] });
const P = (t) => new Paragraph({ spacing: { after: 130 }, children: [new TextRun({ text: t, size: 22 })] });

const doc = new Document({
  creator: 'Ember',
  title: 'Ember Design-Intent Document',
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    children: [
      new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'EMBER Design-Intent Document' })] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Genre: Survival & Resource Management  ·  Single-player  ·  Portrait mobile', italics: true, size: 20, color: '7A5A3A' })] }),

      H('Who the players are'),
      P('Ember is for mobile players who want short, tense runs they can replay, the "one more go" crowd. Think fans of arcade survival and roguelites who play in portrait, one handed, and keep coming back to beat their best score. It needs no manual. You can read the rules off the first screen, and a full run lasts about three to five minutes.'),

      H('What the game is'),
      P('Your campfire is the only thing holding back the dark, and it is everything at once. It is your light, your warmth, your money, and your only weapon. You leave its safety to chop wood and carry it back. The wood feeds the fire directly, so it burns brighter, reaches farther, and keeps you alive. Upgrades cost the fire’s own strength, so every purchase is a real sacrifice. At night, shades crawl out of the dark to drain the fire. A well fed fire burns them, and you can swing your torch at any that get close. The whole gather, craft, and defend loop runs on that one resource, so every trade off is felt. It is built in 3D, so the fire is a real flickering light that casts moving shadows.'),

      H('What the prototype contains'),
      P('This is a complete, tuned core loop. You gather, feed or upgrade, and survive across five nights that keep getting harder, with clear win, lose, and restart screens. After that first win, an optional endless mode lets the nights keep going while your score climbs until you fall. Every action pays off on screen with floating numbers, and a momentum combo builds a bonus score that rewards aggressive play. The fire grows with fuel, and the meters, banners, and warnings keep everything readable. Progression runs on two layers. There are four permanent upgrades bought with the fire’s fuel, and a between nights pick where you choose one of three run boons. Eleven power ups unlock as the nights get deeper, from a slingshot that fires your wood to a screen wide Super Nova that torches everything. A tanky Brute and player hunting irregulars, which only the slingshot or the fire can kill, join the shades on later nights, and the fire burns hotter and bluer as you go. You roam the whole screen freely, so every tree is reachable, and leaving the fire is always your own gamble. It keeps a best score, gives a sunrise on a win and a fade to dark on a loss, and all its audio is synthesized, including a chiptune track. It runs fully offline from one readable index.html plus the Three.js library.'),

      H('Future-state vision'),
      P('The core is a strong base for a deeper survival roguelite. We would add more environments and longer runs, a wider set of enemies and boss nights, deeper boon trees with real build identity, meta progression between runs, and daily seeds with leaderboards. The one thing that stays fixed is the pillar. One fire that is your light, warmth, money, and weapon, with everything new making that single idea richer.')
    ]
  }]
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(__dirname, '..', 'DESIGN_INTENT.docx');
  fs.writeFileSync(out, buf);
  console.log('wrote', out, (buf.length / 1024).toFixed(1), 'KB');
});
