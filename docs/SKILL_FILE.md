# Skill File — Operator Synergy Grid

Phase 1 artifact. Core game parameters / logic spec for Claude.

## Identity
- **Title:** Math Tower Defense — Operator Synergy Grid
- **Genre:** Tower defense × math puzzle
- **Grade band:** 3–5
- **Orientation:** Portrait, mobile-first (540×960)
- **Math domain:** order of operations (PEMDAS), factors/multiples, fractions

## Session
- One *sector* = one play session. 3 waves, draft between waves.
- Target session length: 2–4 min.
- **MVP = single sector.** Sectors 2–3 are deferred content (see [PLAN.md](./PLAN.md) D4).

## Core loop
1. Asteroids fall down vertical lanes (top → bottom).
2. Bottom turret auto-fires projectiles upward (base damage 5).
3. Projectile crosses grid cells; each placed **modifier** card mutates its damage.
4. Projectile hits asteroid → damage resolves through **shield gate**.
5. Asteroid HP ≤ 0 → destroyed, score +10. Asteroid reaches base → base HP −1.
6. Wave clear → draft modal (pick 1 of 3 cards) → place card → next wave.
7. Sector clear → stars awarded → spend in catalog → unlock cards.

## Math mechanics
- **Shield gate (factors) — MVP core hook:** asteroid carries factor F. If `damage % F === 0`
  → full damage, else **0 damage** + "Deflected!". Teaches multiples/factors.
- **Operators:** `ADD_n` / `SUB_n` / `MUL_n` modifiers mutate damage along the lane.
  MVP accrues left-to-right; placement still matters for hitting the factor.
- *Deferred:* true PEMDAS precedence eval (D1), fractions + mega-beam (D3). See [PLAN.md](./PLAN.md).

## Cards (grammar)
`ADD_n`→`+n` · `SUB_n`→`-n` · `MUL_n`→`*n` · `FRAC_HALF`→`/2` · (extend: `DIV_n`, `FRAC_QUARTER`)

## Win / lose
- **Win:** clear all waves of a sector (last asteroid destroyed).
- **Lose:** base HP reaches 0 (too many leaks).
- **Stars (per sector, max 3):** clear · no asteroid leaked · clear under time/wave-speed bonus.

## Difficulty curve
**MVP = Sector 1 only.** Sectors 2–3 are the deferred content curve (D4).

| Sector | Lanes | HP | Shield | New math | Scope |
|--------|-------|----|--------|----------|-------|
| 1 | 2 | F×k (5–15) | 2–4 | +/−/× + shield gate | **MVP** |
| 2 | 2 | 10–40 | none | × + PEMDAS | deferred |
| 3 | 3 | F×k | 2–6 | factors + fractions | deferred |

## Audio (synth, no files)
laser (fire) · explosion (kill) · error (deflect/leak) · card-draw (draft) · UI click.
AudioContext **must close on game exit**.
