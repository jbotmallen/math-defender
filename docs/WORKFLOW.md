# AI-Driven Game Development Workflow

Response to Sports Academy Games candidate brief. Defines a repeatable pipeline that
hits the **30-min/game, 5-games/day** velocity KPI, plus where this prototype (Operator
Synergy Grid) deviates and why.

---

## The pipeline (4 phases)

Mirrors the brief's structure, optimized for the tools actually in hand.

### Phase 1 — Skill File (game logic) · ~3 min
Proprietary Skill File for Claude defines: session length, math problem set + grade band,
core loop, win/lose conditions. One file = one game's brain.
→ See [SKILL_FILE.md](./SKILL_FILE.md) for this game's instance.

### Phase 2 — Design Brief (UI/UX/HUD/sprites) · ~3 min
Claude expands Skill File into a Design Brief: layout, HUD, aesthetic tokens, sprite list.
→ See [DESIGN_BRIEF.md](./DESIGN_BRIEF.md).

### Phase 3 — Asset generation · ~4 min
Brief specifies **Ludo AI** ($15 indie tier) for sprites/spritesheets/textures.

**Deviation (justified):** this game synthesizes all visuals + audio at runtime —
Phaser `generateTexture()` for sprites, Web Audio API for SFX. **Zero asset binaries.**
- Faster: no generation/download/load step in the loop.
- Smaller bundle, instant iteration, no API dependency or key cost.
- Trade-off: less art richness. For asset-heavy genres (bubble shooter, slicer), Ludo
  stays in the pipeline. Genre picks the asset strategy.

### Phase 4 — Assembly & deploy · ~20 min
Claude Code wires logic + assets into Phaser scene + React shell. Output: playable build,
`pnpm build` clean, deployable static bundle. This is where the budget concentrates —
P1–P3 are cheap Claude generation; P4 is the actual wiring + smoke test.

**Total: ~30 min.** MVP scope only — see [PLAN.md](./PLAN.md) for the shipped feature set
and the deferred second-pass backlog.

---

## Tooling stack
| Role | Tool |
|------|------|
| Logic + assembly | Claude Code (Opus) |
| Engine | Phaser 4 (canvas, physics, particles) |
| Shell / HUD | React 19 + Tailwind v4 |
| Assets (general genres) | Ludo AI |
| Assets (this game) | runtime synth — Phaser textures + Web Audio |
| Build | Vite + pnpm |

---

## Velocity model — how 30 min holds
Pipeline is **template-driven**. React shell, Phaser config, Sound synth, draft modal =
reusable scaffold across games. Per new game only Phase 1 (Skill File) + scene logic +
sprite list change. Scaffold reuse is what makes 5/day feasible.

This prototype **is** that 30-min cadence: MVP scope, one novel math hook (shield-factor
gate), deferred depth tracked as backlog in [PLAN.md](./PLAN.md). Not over-built — the
deferred list shows range without spending the budget on it.

---

## Native multiplayer (forward note)
Brief mandates native multiplayer for future games. Not in this prototype scope.
Architecture seam: scene state already event-driven (`card-drafted`, `GameOptions`
callbacks). A future authoritative-server layer would emit/consume those same events —
the React↔Phaser contract is the natural net boundary.
