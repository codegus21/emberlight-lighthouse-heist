# emberlight-lighthouse-heist

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/codegus21/emberlight-lighthouse-heist/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/codegus21/emberlight-lighthouse-heist/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

EMBERLIGHT — The Lighthouse Heist: a top-down stealth game in three heists
(The Shore, The Stairwell, The Lamp Room). Cross the rotating lighthouse
beam, dodge keepers with vision cones and sweeping cameras, hide in fog banks
and bushes, and steal the treasure before slipping out unseen. Gadgets: throw
a shell to pull guards to a noise, drop smoke to blind every cone, douse a
lamp to carve a dark road. Finish a level unseen for the +500 ghost bonus.
Vanilla JavaScript and Canvas 2D, no libraries, no network — the whole game
is static files under game/, with synthesized WebAudio sound.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

## Play

- WASD / arrows — move
- SHIFT — sneak (slow, quiet, hides in bushes)
- SPACE — sprint (fast, loud)
- CLICK — throw a shell to distract a guard
- Q — smoke · R — douse the nearest lamp
- P — pause · M — mute

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies game/ and screenshots/ to the output directory and writes
dossier.json with the vendored make.fun library.

---

<sub>Entered on [make.fun](https://make.fun/?ref=jg0j15t7&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
