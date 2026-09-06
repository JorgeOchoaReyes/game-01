// Generate the Design-Intent Document (.docx) — text-only, <=500 words, four
// judge-facing sections: who the players are, what the game is, what the
// prototype contains, and the future-state vision.
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

const H = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 90 }, children: [new TextRun({ text: t })] });
const P = (t) => new Paragraph({ spacing: { after: 130 }, children: [new TextRun({ text: t, size: 22 })] });

const doc = new Document({
  creator: 'Ember',
  title: 'Ember — Design-Intent Document',
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    children: [
      new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'EMBER — Design-Intent Document' })] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Genre: Survival & Resource Management  ·  Single-player  ·  Portrait mobile', italics: true, size: 20, color: '7A5A3A' })] }),

      H('Who the players are'),
      P('Ember is for mobile players who want short, tense, replayable runs — the “one more go” crowd. Think fans of arcade survival and roguelites who play in portrait, one-handed, for a few minutes at a time, and come back to beat their best score. It assumes no manual: the rules read from the first screen, and a full run lasts three to five minutes.'),

      H('What the game is'),
      P('Your campfire is the only thing holding back the dark — and it is everything at once: your light, your warmth, your currency, and your only weapon. You leave its safety to chop wood, then feed the fire (a bigger fire means wider light, hotter burn, and survival) or spend that same wood on upgrades. At night, shades crawl from the dark to drain the fire; a well-fed fire burns them, and you can swing your torch to beat back any that slip through. The design collapses the survival genre’s gather–craft–defend loop onto a single resource, so every choice is immediate and every trade-off is felt. It is rendered in 3D so the fire is a real, flickering light that casts dynamic shadows.'),

      H('What the prototype contains'),
      P('A complete, tuned core loop — gather, bank, feed or upgrade, survive — across five escalating nights with clear win, lose, and restart states, and real-time feedback throughout (the fire visibly scales with fuel; meters, banners and warnings keep the state legible). Progression runs on two layers: four permanent wood-bought upgrades, and a between-nights “level up” where you choose one of three run boons. Ability drops fall from enemies and each dawn — Inferno, Swift, Ward, Harvest, and a screen-clearing Nova. A tanky Brute joins from night three. It has a persistent best score, a triumphant sunrise on a win and a bleak fade-to-dark on a loss, and fully synthesized audio. It runs entirely offline from one readable index.html plus the Three.js library.'),

      H('Future-state vision'),
      P('The core is a foundation for a deep survival roguelite: more environments and longer night arcs; a varied enemy roster with distinct behaviours and boss nights; deeper boon trees with synergies and build identity; meta-progression and unlocks between runs; daily seeds with leaderboards to fuel the score-chase; and more abilities, hazards, and cosmetics. The pillar stays fixed — one fire that is light, warmth, wealth, and weapon — with everything new deepening that single, legible tension.')
    ]
  }]
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(__dirname, '..', 'DESIGN_INTENT.docx');
  fs.writeFileSync(out, buf);
  console.log('wrote', out, (buf.length / 1024).toFixed(1), 'KB');
});
