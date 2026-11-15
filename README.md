# best-game-01-entry

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Wedspierre/best-game-01-entry/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Wedspierre/best-game-01-entry/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Ember Keep — an original tower defence game: hold the keep through 10 waves of ember-beasts.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser and play. No build step, no network: serve `game/` with any static server and play. All art is drawn in code and all sound is synthesised with WebAudio — there are no external assets.

## How to play

- **Goal:** stop every wave. A beast that reaches the keep costs lives.
  Lose all 20 lives and the keep falls. Clear wave 10 and the keep stands.
- **Build:** click a stone plot, then click a tower card (or press
  `1` / `2` / `3`). Towers cost gold; kills earn gold back.
- **Towers:**
  - **Arrow Spire** (60g) — fast shots, cheap, best against runners.
  - **Ember Cannon** (110g) — slow shells that splash a crowd.
  - **Frost Obelisk** (90g) — chills enemies to half speed.
- **Upgrade / sell:** click one of your towers, then `U` to upgrade
  (damage and range grow) or `X` to sell it back for 70% of what you spent.
- **Waves:** press `Space` (or the Start Wave button) to send the next
  wave. Clearing a wave pays a bonus. Difficulty, enemy count and health
  grow every wave; runners, brutes and the boss arrive in later waves.
- **Other keys:** `P` pause, `R` restart, `M` mute, `Esc` deselect.

## Repo

- Repository: `Wedspierre/best-game-01-entry`
- Owner: Wedspierre
- Referral: `ta01qs0h`
- License: MIT

---

<sub>Entered on [make.fun](https://make.fun/?ref=ta01qs0h&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
