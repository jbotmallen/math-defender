# Math Defenders

A landscape, mobile-friendly **math tower-defense** for grades 3–5. Plant operator "stations"
along horizontal lanes; your launchers fire peas that those operators mutate in real time, then the
math has to beat each drone's **factor shield** before it reaches your base.

Built as a rapid, AI-first prototype for the Sports Academy Games take-home challenge.

**▶ Play:** https://math-defender.pages.dev
**Repo:** https://github.com/jbotmallen/math-defender

---

## The hook (why it teaches math)

- **Launcher + operator chain** — a launcher plant on the left fires a base `5` pea. Each operator
  plant it crosses changes the damage: `+3 → ×2 → …`. Placement order = the puzzle.
- **Factor-shield gate** — shielded drones only take damage when it's an **exact multiple** of their
  factor (`damage % factor === 0`), else *Deflected!*. Teaches multiples/factors directly.
- **Subtract / divide debuff plants** — `−` and `÷` plants chip and visibly **shrink** drones as they
  pass (literal scale op), reinforcing the operation.
- **Live expression readout** trails every shot (`(5 + 3) × 2 = 16`) so the math is never hidden.

## Loop

Defend the **left base** from drones streaming in from the right across multiple lanes. Survive
**3 timed waves** then a **final swarm** (held until the field is clear) to clear the sector. Drafts
hand you new operator cards to plant. Base hits cost lives; clear the final wave to win + earn stars.

## Stack

| Layer | Tech |
|-------|------|
| Game canvas | Phaser 4 (arcade physics, runtime SVG/PNG textures) |
| Shell / HUD / menus | React 19 + Tailwind v4 |
| Audio | Web Audio API synth — all SFX generated live, no audio files |
| Build | Vite + pnpm |

React owns the menu/HUD/modal shell; Phaser owns the board. They talk over a narrow contract
(callbacks out, named events in) — see `src/components/GameContainer.tsx`.

## Run locally

```bash
pnpm install
pnpm dev      # http://localhost:5173
pnpm build    # type-check + production build to dist/
pnpm preview  # serve the build
```

## AI workflow (how it was built fast)

This prototype follows a 4-phase AI pipeline; the artifacts are in [`docs/`](./docs):

1. **[Skill File](./docs/SKILL_FILE.md)** — game logic, math domain, win/lose.
2. **[Design Brief](./docs/DESIGN_BRIEF.md)** — UI/HUD/aesthetic/sprite spec.
3. **[Assets](./docs/ASSETS.md)** — card + sprite art generated via Gemini / ChatGPT image models
   (plus authored SVG), with the exact generation prompts. *(Used in place of Ludo AI — faster, no
   key round-trip; same "100% AI-generated assets" intent.)*
4. **Assembly** — Claude Code wiring logic + assets into the Phaser scene + React shell.

See **[WORKFLOW.md](./docs/WORKFLOW.md)** for the pipeline and the ~30-min velocity model, and
**[PLAN.md](./docs/PLAN.md)** for the MVP scope vs. deferred backlog.

## Known rough edges (prototype)

- Drone **art body grew but the physics hitbox didn't** — collisions read slightly smaller than the
  sprite. Fix: `body.setSize()` on spawn.
- True **PEMDAS precedence** is simplified to left-to-right accumulation; a real evaluator is next.
- Multiplayer intentionally **out of scope** per the brief.
