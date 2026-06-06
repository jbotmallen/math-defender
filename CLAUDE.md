# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Math Tower Defense: Operator Synergy Grid** — a portrait, mobile-first tower-defense math game for **grades 3–5**. Phaser 4 runs the game canvas; React 19 owns the menu/HUD/modal shell around it. The README is the stock Vite template and does not describe this project.

The full design spec lives outside the repo at `c:\Users\USER\.gemini\antigravity-ide\brain\125c67dc-3616-42ab-bd60-070e83666306\implementation_plan.md` (with a portrait mockup PNG alongside it). Read it for target behavior — the code is a prototype that does not yet implement the whole spec (see divergences below).

The four pillars from the spec:
1. **Path-based modifiers** — drag drafted operator cards (`+3`, `x2`, fractions) onto slots along vertical lanes; projectiles evaluate them in real time bottom-to-top under **PEMDAS** order.
2. **Hard-gate shield deflection** — asteroids carry a factor shield; if projectile damage is a multiple of the factor it deals full damage, otherwise **0** and shows "Deflected!".
3. **Star progression** — stars from cleared levels are spent in a card catalog to permanently unlock advanced cards (fractions, new operators) into the draft pool.
4. **Web Audio synth** — all SFX synthesized at runtime, no asset binaries.

## Commands

Package manager is **pnpm** (see `pnpm-lock.yaml`).

- `pnpm dev` — Vite dev server with HMR
- `pnpm build` — type-check (`tsc -b`) then `vite build`
- `pnpm lint` — ESLint over the repo
- `pnpm preview` — serve the production build

No test runner is configured.

## Architecture

Two worlds joined at one component. Keep the boundary clean — don't reach across it except through the channels below.

**React side** (`src/App.tsx`, `src/components/`)
- `App.tsx` is the whole state machine: a `ViewState` of `'DASHBOARD' | 'GAME'`, plus `stars`, `selectedLevel`, and `unlockedCards`. There is no router and no global store — props drill down. **Spec target is React Context** for stars / unlocks / card binder; migrating off prop-drilling is expected work.
- `Dashboard.tsx` — level select (Sectors 1–3) and the unlocked-card binder.
- `GameContainer.tsx` — the bridge. Mounts the Phaser `Game` into a `ref` div inside a `useEffect`, and tears it down (`game.destroy(true)`) on unmount. Hosts React overlay UI (score, Quit button, draft modal) absolutely positioned over the canvas.

**Phaser side** (`src/games/`)
- `config.ts` — `createGameConfig(parent, options)` builds the `GameConfig`. Fixed 540×960 portrait, `Scale.FIT`, arcade physics with zero gravity. `GameOptions` defines the callbacks the scene fires back to React.
- `SpaceGridScene.ts` — the entire game. Textures are generated at runtime in `preload()` (no image assets). A `Map<"col,row", Modifier>` holds operator tiles on the grid. Projectiles carry a running `damage` value and an `expr` string; as a projectile crosses a grid cell it applies that cell's operator (`+ - * /`), rebuilding the visible expression. Asteroids have `hp` and a `shield` factor — **shield gate logic**: damage is deflected unless `damage % shield === 0` (this is the core "factor" puzzle in Sector 3). `level` maps directly to lane count.
- `SoundSynth.ts` — all SFX synthesized live via the Web Audio API (oscillators + noise buffers). No audio files. Call sites already invoke `resume()`.

**The React ↔ Phaser contract** (the only sanctioned cross-boundary channels):
- Phaser → React: the callbacks in `GameOptions` (`onWaveComplete`, `onGameOver`, `onScoreUpdate`) passed in via `createGameConfig`. The scene calls these to raise React UI (e.g. the draft modal).
- React → Phaser: `gameRef.current.events.emit('card-drafted', card)`. The scene listens with `this.game.events.on('card-drafted', ...)`. This is how a drafted card becomes a placed modifier.

When adding game→UI interactions, extend `GameOptions`; when adding UI→game, add a named game event. Do not mutate scene internals from React.

## Conventions

- **Tailwind v4** via the `@tailwindcss/vite` plugin (wired in `vite.config.ts`). CSS-first: `src/index.css` starts with `@import "tailwindcss";` — there is **no** `tailwind.config.js` or `postcss.config.js` (v4 auto-detects content; don't reintroduce the v3 `@tailwind` directives or the `tailwindcss` PostCSS plugin — that breaks the build). Three custom component classes live in `src/index.css`: `.glass-panel`, `.glow-text`, `.btn-primary`. Reuse these for the neon-glass aesthetic rather than re-deriving the shadows.
- Cards are bare string IDs with a parsed prefix grammar: `ADD_n` → `+n`, `SUB_n` → `-n`, `MUL_n` → `*n`, `FRAC_HALF` → `/2`. Parsing lives in `SpaceGridScene.handleCardDrafted`. Add new operators by extending both that parser and the draft `pool`.

## Prototype vs. spec — known gaps to build on

The code is an early prototype; several spec pillars are stubbed. Don't "fix" these silently — they are the intended build-out:
- **Modifier placement**: spec wants drag-and-drop onto lane slots. Current `handleCardDrafted` auto-places into the first empty slot. Starter modifiers are hard-coded for visual testing.
- **PEMDAS**: projectiles accumulate an `expr` string and wrap `*` in parens, but there is no real operator-precedence evaluator yet. Fraction / "mega-beam" charges from the spec are not implemented.
- **Star progression**: stars currently just accumulate in `App.tsx`; there is no card catalog / spend-to-unlock flow yet.
- **Grid scaffolding**: `create()` builds one grid, then a comment-flagged block **re-adjusts to portrait top-down** and rebuilds it — the second pass is authoritative. Draft triggers on `score % 50 === 0` as a placeholder.
- **Lifecycle**: `onGameOver` / base-damage is stubbed. Per the spec's verification plan, `SoundSynth` should **close/release its `AudioContext` on game exit** — it currently never does; wire this into `GameContainer`'s unmount cleanup.
