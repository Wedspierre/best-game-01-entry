# Ember Keep

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Wedspierre/best-game-01-entry/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/Wedspierre/best-game-01-entry/reward.svg)](https://make.fun/bounty/best-game-01)

**Ember Keep** is a 2D canvas tower defence game that runs entirely offline in a
desktop browser. Waves of enemies march down a winding road toward the keep at the
east end of the map. You build towers on the stone plots beside the road, upgrade
them, and hold the keep through all 15 waves — if a single enemy gets through too
many times, the keep falls.

## What is in the game

- **7 tower types, 3 levels each** — every tower has its own role (cheap rapid
  fire, long-range sniping, splash damage, slowing, and more) and three upgrade
  tiers that change its stats and look.
- **10 enemy types + 2 bosses** — runners, brutes, armoured crawlers, healers
  and flyers, plus a mid-game boss and a final boss on the last wave.
- **15 waves with escalation** — each wave is bigger, faster and tougher than the
  last, and the wave preview panel shows what is coming before you commit.
- **Economy and combos** — enemies pay gold when they fall, and chained kills
  build a combo multiplier that pays out extra, so aggressive play is rewarded.
- **Juice** — screen shake on big hits, floating damage numbers, muzzle flashes
  and particle bursts on every kill.
- **Deterministic** — a fixed seed drives every wave, so the same seed always
  produces the same battle. Replays and screenshots are reproducible.

## How to play

- **Mouse** — click a stone plot to build a tower, click a tower to select it and
  upgrade or sell it.
- **Keyboard** — number keys pick a tower type, `Space` starts the next wave,
  `Esc` closes a panel.
- Build towers before the wave starts, then watch the road: hold the keep through
  all 15 waves to win. Lose all your lives and the keep burns.

## How to run it

The game is plain static files under `game/` — no build step, no dependencies,
no network requests.

```sh
node serve.ts
```

Then open <http://localhost:8080> in a desktop browser. Any static file server
pointed at `game/` works just as well.

## Entry

This repository is an entry for the make.fun **best-game-01** bounty. `main.ts`
(Node 22, standard library only) copies `game/` and `screenshots/` into the
output directory and writes `dossier.json`, the summary the judge reads:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).

Play more at https://make.fun/r/ta01qs0h
