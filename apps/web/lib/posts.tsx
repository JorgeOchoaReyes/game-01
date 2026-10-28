import Link from "next/link";
import type { ReactNode } from "react";

// The blog. Each post targets one search no guide targets, answers it in the
// first paragraph, and links to the guides and to the studio.
export type Post = { slug: string; title: string; description: string; keyword: string; date: string; minutes: number; lede: string; body: ReactNode };

export const POSTS: Post[] = [
  {
    slug: "make-a-video-game-without-coding",
    title: "How to Make a Video Game Without Coding",
    description: "You can make a playable video game without writing code: describe it to an AI, play each version as it's built, and change it in plain words. Here's how.",
    keyword: "make a video game without coding",
    date: "2026-10-28",
    minutes: 6,
    lede: "You can make a video game without coding by describing it to an AI game maker. The AI writes the code, you play each version as it appears, and you steer it in plain words until it's fun. Here's the whole process, from a one-line idea to a game your friends can play from a link.",
    body: (
      <>
        <h2>What do you actually need?</h2>
        <p>A browser and an idea. A no-code game maker like <Link href="/ai-game-maker">Polly Studio</Link> runs the game in a preview next to the chat, so there&apos;s no engine to install, no project to configure and no build step. The skill that matters is describing what you want, and getting specific as you play.</p>

        <h2>Step 1: Write the idea in one sentence</h2>
        <p>Start with the genre, the goal and one twist. Short is fine; vague isn&apos;t.</p>
        <ul>
          <li><b>Weak:</b> &ldquo;A fun space game.&rdquo;</li>
          <li><b>Strong:</b> &ldquo;A top-down space shooter where you survive waves of asteroids, and every fifth wave is a boss that splits in two.&rdquo;</li>
        </ul>
        <p>The strong version names the camera (top-down), the goal (survive waves) and something that makes it yours (the splitting boss).</p>

        <h2>Step 2: Pick where it will be played</h2>
        <p>Desktop games use keyboard and mouse in landscape. Mobile games are portrait, with drag-to-move and tap controls. Choose now: controls shape everything else. For phone games, see <Link href="/mobile-game-maker">how to make a mobile game with AI</Link>.</p>

        <h2>Step 3: Play the first version, then ask for one thing at a time</h2>
        <p>The first playable version usually arrives in a minute or two, because the AI starts from a working game close to your idea. Play it before you ask for anything. Then make one request per message:</p>
        <ol>
          <li>&ldquo;The ship feels slow. Make it faster and add a short dash on Space.&rdquo;</li>
          <li>&ldquo;Waves are too easy after wave 3. Ramp up the asteroid speed.&rdquo;</li>
          <li>&ldquo;Add a score that counts up and a best score that's saved.&rdquo;</li>
          <li>&ldquo;Make the boss flash red when it's hit.&rdquo;</li>
        </ol>
        <p>One change per message keeps each version easy to judge, and if something goes wrong you know exactly which request caused it.</p>

        <h2>Step 4: Describe feelings, not code</h2>
        <p>You don&apos;t need the word &ldquo;velocity&rdquo;. &ldquo;Jumping feels floaty&rdquo;, &ldquo;dying feels unfair&rdquo; and &ldquo;the screen is too busy&rdquo; are exactly the kind of feedback an AI collaborator can act on. It turns them into gravity, invincibility frames and fewer particles.</p>

        <h2>Step 5: Undo freely</h2>
        <p>Every save is a version. If a change makes things worse, restore the one before it from the history menu and try a different request. Nothing is lost, so it&apos;s safe to experiment.</p>

        <h2>Step 6: Share it</h2>
        <p>Publish the game to get a play page with its own link. Anyone can play it in their browser with no install, and they can remix it into their own version. You can also download it: the whole game is one HTML file that runs on any website.</p>

        <h2>How long does it take?</h2>
        <table>
          <thead><tr><th>Stage</th><th>Typical time</th></tr></thead>
          <tbody>
            <tr><td>First playable version</td><td>1 to 3 minutes</td></tr>
            <tr><td>Feels good to play</td><td>20 to 40 minutes of play-and-ask</td></tr>
            <tr><td>Polished, with a boss and juice</td><td>An afternoon</td></tr>
          </tbody>
        </table>
        <p>Need an idea to start with? Try one of <Link href="/blog/game-ideas-to-build-with-ai">these twelve game ideas</Link>, or open the <Link href="/studio">studio</Link> and describe your own.</p>
      </>
    ),
  },
  {
    slug: "game-ideas-to-build-with-ai",
    title: "12 Game Ideas You Can Build with AI in an Afternoon",
    description: "Twelve small, fun game ideas sized for an afternoon with an AI game maker, from a dragon snake game to a tower defense, with a first prompt for each.",
    keyword: "game ideas to make",
    date: "2026-10-28",
    minutes: 5,
    lede: "The best game ideas to build with AI are small, with one clear rule and one twist. Here are twelve sized for an afternoon, each with a first prompt you can paste straight into an AI game maker and the first change to ask for once it's running.",
    body: (
      <>
        <h2>Arcade and action</h2>
        <ol>
          <li><b>Dragon Snake.</b> &ldquo;A snake game where you're a dragon that grows by eating knights; knights in armor take two bites.&rdquo; Then: add fire breath on a cooldown.</li>
          <li><b>Slime Arena.</b> &ldquo;Top-down arena: WASD to move, mouse to aim, survive ten waves of slimes that split when hit.&rdquo; Then: a dash with a short trail.</li>
          <li><b>Asteroid Miner.</b> &ldquo;Fly with WASD, laser rocks for ore, spend ore on upgrades between runs.&rdquo; Then: a rare golden asteroid.</li>
          <li><b>Boss Breakout.</b> &ldquo;Breakout where the top row is a boss brick that moves and shoots back.&rdquo; Then: multiball power-ups.</li>
        </ol>

        <h2>Strategy and puzzles</h2>
        <ol start={5}>
          <li><b>Tiny Tower Defense.</b> &ldquo;Place cannons and frost towers along one winding path; ten waves.&rdquo; Then: tower upgrades on click.</li>
          <li><b>Lights Out Dungeon.</b> &ldquo;A dungeon that's dark except around you; find the key and the exit before your torch runs out.&rdquo; Then: torches to collect.</li>
          <li><b>Cozy Farm.</b> &ldquo;Plant, water and sell crops; the season ends after five minutes.&rdquo; Then: a crow that steals seeds.</li>
          <li><b>Daily Swipe.</b> &ldquo;A sliding-block puzzle with a new layout every day and a move counter.&rdquo; Then: a share button for your score.</li>
        </ol>

        <h2>Phone games</h2>
        <ol start={9}>
          <li><b>Tap Runner.</b> &ldquo;A portrait endless runner: tap to jump, it speeds up every ten seconds.&rdquo; Then: double jump.</li>
          <li><b>Star Catcher.</b> &ldquo;Drag a basket to catch falling stars and dodge meteors.&rdquo; Then: combos for catching in a row.</li>
        </ol>
        <p>Choose Mobile when you start these two; see <Link href="/mobile-game-maker">making mobile games with AI</Link>.</p>

        <h2>With friends</h2>
        <ol start={11}>
          <li><b>Couch Racer.</b> &ldquo;A top-down race for two players on one keyboard, WASD and arrows.&rdquo; Then: oil slicks.</li>
          <li><b>Coin Rush Online.</b> &ldquo;An online coin race with invite links; the first to 20 wins.&rdquo; Then: a shrinking arena.</li>
        </ol>

        <h2>What makes an idea afternoon-sized?</h2>
        <ul>
          <li><b>One rule you can say in a sentence.</b> Eat to grow. Survive the waves. Catch, don't touch.</li>
          <li><b>One twist.</b> The knights in armor, the splitting slimes, the boss brick.</li>
          <li><b>A clear end.</b> Ten waves, five minutes, first to 20, so it's easy to test and fun to replay.</li>
        </ul>
        <p>New to this? Read <Link href="/blog/make-a-video-game-without-coding">how to make a video game without coding</Link> first, then pick an idea and start it in the <Link href="/studio">studio</Link>.</p>
      </>
    ),
  },
  {
    slug: "make-animated-youtube-shorts-with-ai",
    title: "How to Make Animated YouTube Shorts with AI",
    description: "Make animated explainer YouTube Shorts with AI: pick a question, plan six scenes, write one-line captions, add a voiceover and export a 9:16 MP4.",
    keyword: "animated youtube shorts",
    date: "2026-10-28",
    minutes: 5,
    lede: "To make animated YouTube Shorts with AI, start from a question your audience asks, let the AI plan six to eight short scenes with one caption each, add a voiceover, and record a 9:16 MP4. Here's how to get one that holds attention to the end.",
    body: (
      <>
        <h2>Start with a question, not a topic</h2>
        <p>&ldquo;Volcanoes&rdquo; is a topic. &ldquo;Why do volcanoes erupt?&rdquo; is a short: it promises an answer, and people stay to get it. Good questions are concrete and a little surprising:</p>
        <ul>
          <li>How did the ancients cook food before kitchens?</li>
          <li>Why is the sky blue, and why is it red at sunset?</li>
          <li>How does a seed know which way is up?</li>
        </ul>

        <h2>The shape of a short that works</h2>
        <table>
          <thead><tr><th>Scene</th><th>Job</th><th>Length</th></tr></thead>
          <tbody>
            <tr><td>1</td><td>The hook: ask the question with a striking image</td><td>3 to 5 s</td></tr>
            <tr><td>2 to 6</td><td>One idea per scene, in order</td><td>5 to 8 s each</td></tr>
            <tr><td>Last</td><td>The payoff: one line that ties it together</td><td>4 to 6 s</td></tr>
          </tbody>
        </table>
        <p>That lands between 35 and 55 seconds, inside the Shorts limit, with room for a voiceover to breathe.</p>

        <h2>Write captions people can read in a second</h2>
        <p>One short sentence per scene, with the key words highlighted. The caption is also the voiceover script, so read it aloud: if you run out of breath, it's too long.</p>

        <h2>Making it in Polly Studio</h2>
        <ol>
          <li>Choose <b>Video</b> and <b>Short · 9:16</b>, then type the question.</li>
          <li>Frankie plans the scenes and builds them one at a time; each appears in the preview as it's saved.</li>
          <li>Ask for changes per scene: &ldquo;make scene 3 show the magma rising&rdquo;, &ldquo;shorter caption on scene 5&rdquo;.</li>
          <li>Turn on <b>Voiceover</b> (with your ElevenLabs key in Settings) to narrate each caption.</li>
          <li>Press <b>Record video</b> to download the MP4, captions and sound included.</li>
        </ol>
        <p>More on formats and voiceovers in the <Link href="/ai-video-maker">AI video maker guide</Link>.</p>

        <h2>Three mistakes that lose viewers</h2>
        <ul>
          <li><b>A slow first scene.</b> The hook has to land in the first three seconds.</li>
          <li><b>Two ideas in one scene.</b> Split it; scenes are cheap.</li>
          <li><b>Tiny subjects.</b> On a phone, the thing you're explaining should fill the middle of the frame.</li>
        </ul>
        <p>Ready? Open the <Link href="/studio">studio</Link>, pick Video, and ask your first question. Making games too? Start with <Link href="/blog/game-ideas-to-build-with-ai">these game ideas</Link>.</p>
      </>
    ),
  },
];

export const findPost = (slug: string) => POSTS.find((p) => p.slug === slug);
