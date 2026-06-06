# Asset Pipeline — SVG + AI raster prompts

Phase 3 of the [workflow](./WORKFLOW.md). Two tracks:

- **Track A — authored SVG** (shipped, in `public/assets/`). Scalable, tiny, version-controlled,
  no binaries, Phaser `loadSVG`-ready. This is the production set.
- **Track B — AI raster art** (prompts below). For hero/marketing-grade card + tower art when
  vector isn't rich enough. Gemini (Nano Banana / Imagen), ChatGPT (GPT-Image / DALL·E), or Ludo.

Palette (matches `src/index.css` tokens): bg `#080b11` · cyan `#22d3ee` · magenta `#c026ff`
· green `#00e676` · danger `#ff3b5c` · text `#e0f2fe` / muted `#94a3b8`.

---

## Asset inventory (Track A — shipped)

| File | Maps to scene texture | Notes |
|------|----------------------|-------|
| `sprites/turret-t1.svg` | `turret` | base cannon |
| `sprites/turret-t2.svg` | turret upgrade | twin barrel (star unlock) |
| `sprites/turret-t3.svg` | turret upgrade | charged tri-barrel |
| `sprites/projectile.svg` | `projectile` | green energy bolt |
| `sprites/asteroid.svg` | `asteroid` | unshielded rock |
| `sprites/asteroid-shield.svg` | shielded variant | red factor aura |
| `sprites/grid-tile.svg` | `gridTile` | magenta lane slot |
| `cards/card-add.svg` | `ADD_n` | cyan family |
| `cards/card-sub.svg` | `SUB_n` | cyan family |
| `cards/card-mul.svg` | `MUL_n` | magenta family (PEMDAS) |
| `cards/card-frac-half.svg` | `FRAC_HALF` | green (advanced unlock) |

---

## Wiring SVG into Phaser (Track A)

Replace the runtime `generateTexture` calls in `SpaceGridScene.preload()`:

```ts
preload() {
  this.load.svg('turret',     'assets/sprites/turret-t1.svg',      { width: 40, height: 40 });
  this.load.svg('projectile', 'assets/sprites/projectile.svg',     { width: 14, height: 14 });
  this.load.svg('asteroid',   'assets/sprites/asteroid.svg',       { width: 40, height: 40 });
  this.load.svg('asteroidShield','assets/sprites/asteroid-shield.svg',{ width: 44, height: 44 });
  this.load.svg('gridTile',   'assets/sprites/grid-tile.svg',      { width: 90, height: 80 });
}
```
- `loadSVG` rasterizes at the given size; bump `width/height` for retina.
- Pick `asteroid` vs `asteroidShield` by `shieldFactor > 1` in `spawnAsteroid`.
- Cards render in React (`CardDraftModal`) — `<img src="/assets/cards/card-mul.svg">` keyed off
  the card-ID family (`ADD_`/`SUB_`/`MUL_`/`FRAC_`), not the Phaser loader.

---

## Track B — AI raster prompts

Drop into Gemini / ChatGPT image gen. All share a **style preamble** — paste it before each:

> **STYLE:** Neon-glass synthwave space UI, dark navy `#080b11` background, volumetric glow,
> high contrast, crisp edges, mobile game asset, centered, transparent background (PNG),
> no text unless specified, no drop-shadow outside the subject. Square 1:1 unless noted.

### Cards (1:1 or 5:7 portrait, transparent)
- **ADD card:** `glowing cyan trading-card face, large "+3" numeral, sci-fi frame with corner pips, energy-boost motif, upward arrows, cyan #22d3ee glow`
- **MUL card:** `magenta #c026ff card face, large "×2" numeral, prismatic lens splitting a beam into two, PEMDAS badge top-right, premium rarity sheen`
- **FRACTION card (rare):** `emerald #00e676 card face, large "1/2" fraction glyph, crystalline split-orb shattering a shield, "mega-beam charge" energy meter at base, holographic foil`
- **DIV card (locked tier):** `magenta card, "÷2" numeral, beam passing through a splitter prism, locked-until-unlock padlock watermark`

### Towers / turret tiers (1:1, transparent, top-down-ish 3/4 view)
- **T1 base turret:** `single cyan crystal cannon on hex base, idle energy core, clean low-poly neon`
- **T2 upgrade:** `twin-barrel cyan turret, rotating energy ring, brighter core, more armor plating`
- **T3 charged:** `triple-barrel turret crowned with magenta charge orb, arcing electricity, mega-beam ready, elite tier glow`
- **Upgrade sequence sheet:** `same turret shown in 3 evolution stages left-to-right T1→T2→T3, consistent silhouette, increasing glow and barrels, horizontal spritesheet, transparent`

### Asteroids / enemies (1:1, transparent)
- **Plain asteroid:** `grey cracked space rock, subtle rim light, game enemy sprite`
- **Shielded asteroid:** `space rock wrapped in a red #ff3b5c hexagonal force field, "factor shield" energy lattice, hostile glow`
- **Boss asteroid:** `large armored asteroid fortress, multiple glowing factor cores, menacing, portrait composition`

### Backgrounds / HUD (9:16 portrait for the 540×960 canvas)
- **Play backdrop:** `deep space portrait background, faint hex grid floor receding upward, distant nebula in cyan and magenta, very dark so foreground sprites pop, subtle starfield`
- **Dashboard hero:** `synthwave space academy logo banner, neon grid horizon, math symbols orbiting a planet, portrait mobile menu background`

### Generation tips
- Ask for **transparent PNG**; if the tool can't, request a flat `#080b11` bg and key it out.
- Generate **variations ×4**, keep the most readable at thumbnail size (cards show ~100px wide).
- For spritesheets, demand "even spacing, identical canvas per frame, no overlap."
- Vectorize a favorite raster back to SVG via `vtracer` / Illustrator Image Trace to rejoin Track A.

---

## Why SVG over Ludo here (brief KPI note)
Brief Phase 3 names Ludo AI. For this vector-clean geometric style, authored SVG is **faster**
(no API key, no round-trip), **smaller** (KB text), and **infinitely scalable** across the
540×960→retina range — it hits the "100% AI-assisted, zero manual binary" intent via a better
path. Track B + Ludo stay available for asset-heavy genres (bubble shooter, slicer).
