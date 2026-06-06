# Build Plan — Math Tower Defense: Operator Synergy Grid

**30-minute build.** This is the steady-state cadence the brief targets (5 games/day).
One game = one pass through the 4-phase pipeline ([WORKFLOW.md](./WORKFLOW.md)),
template scaffold reused, only game-specific logic written fresh.

Scope is **MVP-first**: ship the core hook (operator modifiers + shield gate), defer
depth. The deferred list is real backlog, not a promise — it shows where the game *could*
grow on a second pass, without padding the 30-min build.

---

## 30-min time budget

| Phase | Minutes | Output |
|-------|---------|--------|
| P1 — Skill File (logic) | 3 | [SKILL_FILE.md](./SKILL_FILE.md) |
| P2 — Design Brief (UI/HUD/sprites) | 3 | [DESIGN_BRIEF.md](./DESIGN_BRIEF.md) |
| P3 — Assets (runtime synth, no Ludo) | 4 | Phaser textures + Web Audio synth |
| P4 — Assembly (Claude Code) | 20 | playable build, `pnpm build` clean |
| **Total** | **30** | deployable static bundle |

Phases 1–3 are mostly Claude generation (cheap). Phase 4 is where the budget goes:
wire scaffold + scene logic, smoke-test, ship.

---

## MVP feature set (shipped in 30 min)

| # | Feature | Scope |
|---|---------|-------|
| M1 | Core loop | asteroids fall → turret auto-fires → projectile crosses cells → hit resolves |
| M2 | Operator modifiers | `ADD_n` / `SUB_n` / `MUL_n` mutate projectile damage along a lane |
| M3 | Shield gate (the hook) | `damage % factor === 0` → full, else 0 + "Deflected!" |
| M4 | Draft loop | wave clear → pick 1 of 3 cards → place → next wave |
| M5 | Live expression readout | `expr = value` trails each projectile — math stays visible |
| M6 | Web Audio synth SFX | laser / explosion / deflect / draft / click. No binaries |
| M7 | React shell | Dashboard ↔ Game, HUD (score / base HP / quit), Phaser teardown on exit |

That's the whole 30-min game: one genuinely novel math mechanic (shield = factors/multiples)
wrapped in a working tower-defense loop, mobile portrait, zero asset files.

---

## Deferred — second-pass backlog (NOT in 30-min scope)

Documented so range is visible; explicitly out of the 30-min build.

| # | Feature | Why deferred |
|---|---------|--------------|
| D1 | True PEMDAS evaluator | MVP uses left-to-right damage accrual; precedence eval is a depth feature |
| D2 | Drag-drop placement | MVP auto-places into first open slot; Phaser↔React DnD is the highest-risk UI cost |
| D3 | Fractions + mega-beam | extra card grammar + charge system, beyond core hook |
| D4 | 3-sector progression | MVP = single sector; multi-sector is content scaling |
| D5 | Star catalog (spend-to-unlock) | stars accumulate; catalog economy is a meta-layer |
| D6 | React Context refactor | prop-drill is fine at MVP size; Context pays off only as state grows |
| D7 | localStorage persistence | not needed to demo the loop |
| D8 | Native multiplayer | brief's *future* goal; architecture seam noted in WORKFLOW.md |

---

## MVP build order (within the 20-min assembly window)

1. **Scaffold** — React shell + Phaser config + single portrait grid. (~4 min, mostly reused)
2. **Loop** — spawn asteroids, auto-fire turret, collision, score, base HP, win/lose. (~6 min)
3. **Math hook** — modifier cells mutate damage; shield gate + "Deflected!". (~5 min)
4. **Draft** — wave-complete → 3-card modal → click-to-place → next wave. (~3 min)
5. **Juice + ship** — synth SFX hookup, expr readout, `pnpm build`/`lint` clean. (~2 min)

---

## Risk / fallback
- Tight budget → **shield gate is the must-ship hook**; cut juice before cutting it.
- Auto-place (not drag-drop) is the deliberate scope cut that keeps assembly under 20 min.
- Scaffold reuse is the lever for 5/day — see velocity model in [WORKFLOW.md](./WORKFLOW.md).
