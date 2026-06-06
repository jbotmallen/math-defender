# Design Brief — Operator Synergy Grid

Phase 2 artifact. UI/UX, HUD, aesthetic, sprite spec. Derived from [SKILL_FILE.md](./SKILL_FILE.md).

## Aesthetic
Neon-glass / synthwave space. Dark navy base, cyan primary, magenta accent, glow everywhere.
Already encoded in `src/index.css` — **reuse, don't re-derive**:

| Token | Value | Use |
|-------|-------|-----|
| `--bg-color` | `#080b11` | app background |
| `--primary` | `hsl(195 100% 50%)` cyan | turrets, projectiles, buttons |
| `--accent` | `hsl(280 100% 60%)` magenta | modifiers, cards, grid lines |
| `--success` | `hsl(145 100% 45%)` | win, valid drop |
| `--danger` | `hsl(350 100% 60%)` | asteroids, deflect, damage |
| `--text-main` / `--text-muted` | `#e0f2fe` / `#94a3b8` | copy |

Component classes (reuse): `.glass-panel`, `.glow-text`, `.btn-primary`.

## Layout (portrait 540×960)
```
┌─────────────────────────┐
│ HUD bar: ★stars  score  base♥  Quit │  ~80px
├─────────────────────────┤
│                         │
│   PLAY GRID             │
│   cols = lanes          │  ~680px
│   asteroids fall ↓      │
│   projectiles rise ↑    │
│   modifier slots = cells│
│                         │
├─────────────────────────┤
│  Turret row (bottom)    │  ~100px
└─────────────────────────┘
  Draft modal overlays bottom between waves
```

## HUD requirements
- **Stars** ★ count (top-left) — current run + persisted total.
- **Score** (top-center), glow on increment.
- **Base HP** ♥ (top-right), pulses red on leak.
- **Quit** button (corner) → returns to Dashboard, tears down Phaser.
- **Draft modal** — 3 cards, bottom sheet, drag-to-place (currently click).
- **Deflected!** floating text on shield block (danger color, rises + fades).
- **Expression readout** — live `expr = value` trailing each projectile.

## Screens
1. **Dashboard** — star total, sector selector. *(MVP: single sector entry.)*
2. **Game** — canvas + HUD overlay + draft modal. **MVP core.**
3. *Deferred:* card catalog/binder — spend-stars-to-unlock (D5). Sector 1–3 lock states (D4).

## Sprites / visuals (runtime-generated, no binaries)
| Asset | How |
|-------|-----|
| Turret | cyan triangle `generateTexture` |
| Asteroid | grey circle + HP/shield label |
| Projectile | green dot + expr text |
| Grid tile | magenta stroked rect, low alpha |
| Modifier | text label `op+val`, accent color |
| Deflect / explosion | tween + particle FX |
| *Deferred:* mega-beam (D3) | particle/tween beam, success color |

## Interaction states
- Card hover: scale 1.1, lift, glow.
- Valid drop slot: success outline. Invalid: danger flash.
- Button: `.btn-primary` hover invert + glow, active scale-95.

## Accessibility / grade-3–5 fit
- Large tap targets (≥44px). High contrast text. Minimal reading.
- Math always visible (expr readout) — reinforces learning, no hidden state.
