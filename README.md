# Ember Keep — Tower Defence

**Ember Keep** is an original tower defence game built for the make.fun
best-game-01 bounty. Ember-beasts march down a winding road toward your
keep. Build towers on the stone plots, earn gold for every beast you slay,
and hold the keep through all **10 waves** — the last one brings the
Emberlord himself.

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

## Run it

No build step, no network: serve `game/` with any static server
(`node serve.ts`, then open http://localhost:8080) and play in a desktop
browser. All art is drawn in code and all sound is synthesised with
WebAudio — there are no external assets.

## Repo

- Repository: `Wedspierre/best-game-01-entry`
- Owner: Wedspierre
- Referral: `ta01qs0h`
- License: MIT
