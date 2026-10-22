# Ember Build Log — Prompts

The prompts used to generate this build, in order. The whole game was made by
prompting an AI coding agent (Claude Code) with the requests below and iterating on
what it produced. Prompts are reproduced faithfully, including the original phrasing.

---

## Concept and core loop

1. lets do this: [pasted the competition Design Guidance — eligible genres, packaging rules, judging criteria, and the offline / portrait / single-player constraints]

2. sure lets do that the ember is fine [approving the "Ember" campfire concept]

3. the fire should decrease in power as we have less fire and it is dying, then increase once we increase the fire. also can we add better models, maybe find some free models to use. also are we using the three.js library as well?

4. i see, what would it look like if we use 3d

5. can turn to 3d then lets focus on the game loop then. polish the visual as well, and once you think the loop is ready let me test it.

6. better, but give the user avatar some animation when attacking

## UX and clarity

7. game loop is ok, let's make the ux more intuitive. hitting the trees is a bit wonky, unclear when I'm chopping it down and unclear when I hit enemies, and when the fire is dying the light should go down

8. the tree hitting should be more clear as well. sometimes I hit a tree and it seems nothing happens after a few hits

9. can we make progression more interesting and have drops of special abilities, and make it get harder too, and hitting trees should be more interactive, also make it so we can't walk over trees

10. make it more clear how much I'm carrying and when I hit the limit, and make the fire more clear what range/strength it's at (dim when weaker, brighter when stronger), plus a range around it where I can drop off the wood

11. I progressed in the game and trees stopped spawning that were reachable, and the backpack status should be on the player avatar, like above it, so I don't need to look around for it

## Retention, flow, and the submission package

12. review again and make better ux and flow and level-ups. make it a game people want to play over and over. strong visuals when they win a round, and make it feel bad when they lose

13. let's make this as well: [pasted the submission-package requirements — Design-Intent document and Build Log]

14. this is prio: prioritize for the judging criteria [pasted the full Design Guidance again], and make sure the core loop is playable start to finish before polish

15. lets keep making the game loop better, so give me the latest version

## Fixes and the economy rework

16. game is broken, trees not being auto-added, many trees not spawning. when dying and respawning the fire is broken and I can't see anything

17. adding wood is not making the fire stronger

18. we should have temp power-ups that one-shot trees, that are rare, and ability power-ups to upgrade the backpack to have more tools. the temp power-up for one-shotting a tree should be a chainsaw, to make it fun

19. we should be able to go outside of our fire range to reach all trees as well, only prevent the player from exiting the frame of the page

## Engagement, endless, and more powers

20. push everything and do one more pass to make sure the game is interactive, makes the user want to play, and rewards them constantly to keep them engaged

21. push everything to repo

22. so is it ready?

23. so it's ready? everything is playable. and let's make sure it goes for many levels, ideally endlessly

24. we should have a power-up called slingshot that will shoot stored wood at enemies, and enemies that reach the fire should decrease it as well

25. also more enemies at higher levels as well

26. also higher levels reached should make the fire start to turn a blue hue and look more animated and intense, and our super nova power-up should also make the fire blue temporarily

27. we should add one more power-up called super nova that lights the user on fire, that burns all trees instantly and enemies. also power-ups should appear as the user gets to higher levels, so gate some to higher levels only. and let's add some 8-bit music. review any requirements for our submission to make sure we're still in the green

28. we should make a human torch power-up that kills all enemies near the player, lights the player on fire, and burns all trees near them (instantly sent to burn the fireplace), but at the cost of all wood being held

## World, camera, and difficulty tuning

29. later levels: trees don't spawn near the fire as much. let's make it so it's not all trees close to the fire, spread them out more, and make power-ups show up far from the fire so it's risky. make it more clear when the user gets hurt — if they bump into enemies they should take damage or feel cold. and make it more clear when the user dies

30. trees too far. maybe move the fireplace down and put more trees above

31. move the fire down more, to the bottom of the screen, to give more room for trees to spawn above

32. (with screenshot) very few trees spawn

33. the camera should follow the player when it goes all the way up to the trees in the back, and spawn more trees as the game progresses. just make it so it's not all trees close to the fire, spread it out. it should still be bounded by the current boundary but follow the player. also some trees are not choppable at the very top, not sure why

34. the fire is too easy to keep alive, let it die quicker, and also make combos harder to keep

35. there should be some audio and animation to congratulate the user every time they survive a night. remember, we need to make the game reward the user and be interactive so users have fun and enjoy it

36. much better, but night two showed no enemies, or very few. it should be more and more enemies appearing to make the game harder but still possible

## First-run onboarding and finishing touches

37. let's also, the first time a player loads, guide them to choose a tree and take it to the fire — just for the first tree and first wood drop-off. from there it's all on their own

38. this is great, let's do some finishing touches [chose: sound & music toggle, low-fire danger cue, pause + quick help, title & logo polish]

39. polish everything once more and ensure we are compliant with the competition, then give me the design doc, the logs, and everything the competition requires

## Submission assets and copy

40. give me a PNG logo of the app and all the details for submission

41. logo spec: JPG, PNG or GIF, 5 MB max, best results at a 3:2 ratio

42. fill this out: Inspiration / What it does / How we built it / Challenges we ran into / Accomplishments that we're proud of / What we learned / What's next for Ember

43. remove em dashes and make it more human-like

44. make sure our design-intent doc and build log don't have any em dashes and feel human-like. and confirm the submission checklist is true, then give me all resources

45. make sure this is what we have: [pasted the submission form fields]
