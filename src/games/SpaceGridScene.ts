import Phaser from 'phaser';
import { type GameOptions } from './config';
import { SoundSynth } from './SoundSynth';
import { type AudioSettings } from '../settings';

interface Modifier {
  op: '+' | '-' | '*' | '/';
  val: number;
  type: string; // e.g., 'ADD_3'
}

// Horizontal lane defense (PvZ-style). Base sits on the LEFT. Each row has a fixed
// launcher plant at column 0 that fires a base pea rightward. Drafted operator cards
// become "station plants" the player taps onto field tiles (cols 1..n); a pea crossing
// a plant's tile has that operator applied to its damage. Asteroids stream in from the
// RIGHT edge moving left; one reaching the base costs a life.
export default class SpaceGridScene extends Phaser.Scene {
  private options: GameOptions;
  private synth: SoundSynth;

  private rows: number;        // lanes (horizontal)
  private cols: number = 9;    // tile columns across the field (col 0 = launcher), PvZ-style

  private playLeft: number = 84;  // width of the left base zone
  private gridTop: number = 40;
  private tileW: number = 0;
  private tileH: number = 0;

  private launchers: Phaser.GameObjects.Sprite[] = [];
  private modifiers: Map<string, Modifier> = new Map();        // key: 'col,row'
  private tiles: Map<string, Phaser.GameObjects.Image> = new Map();
  private plantSprites: Map<string, Phaser.GameObjects.Image> = new Map(); // for activation ping
  // Definite-assignment: created in create(), which Phaser guarantees runs before update()/overlap callbacks.
  private projectiles!: Phaser.Physics.Arcade.Group;
  private asteroids!: Phaser.Physics.Arcade.Group;

  private score: number = 0;
  private baseHp: number = 5;
  private baseHpText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private isDrafting: boolean = false;
  private pending: Modifier | null = null; // card awaiting tile placement

  // Placement-mode visuals: glowing ring overlays + tile pulse while a card waits to be planted,
  // plus a translucent blueprint ghost that tracks the hovered tile.
  private placeRings: Phaser.GameObjects.Arc[] = [];
  private tilePulseTween?: Phaser.Tweens.Tween;
  private ringPulseTween?: Phaser.Tweens.Tween;
  private hoverGhost?: Phaser.GameObjects.Image;

  // PvZ-style wave system: 3 timed normal waves, then a final swarm that only
  // launches once the field is clear (hybrid). Clearing the final wave = win.
  private readonly normalWaves: number = 3;
  private wave: number = 0;            // current wave (1..normalWaves, then normalWaves+1 = final)
  private toSpawn: number = 0;         // asteroids left to spawn in the current wave
  private spawnEvent?: Phaser.Time.TimerEvent;
  private awaitingFinal: boolean = false; // wave 3 done; holding final until field clears
  private finalWave: boolean = false;
  private sectorCleared: boolean = false; // win latched
  private waveLabel!: Phaser.GameObjects.Text;
  private bannerText!: Phaser.GameObjects.Text;

  constructor(options: GameOptions) {
    super('SpaceGridScene');
    this.options = options;
    this.synth = new SoundSynth();
    this.rows = Math.min(5, options.level + 2); // L1=3 lanes, L2=4, L3=5 (PvZ-style)
  }

  preload() {
    // Authored SVG assets (public/assets). loadSVG rasterizes at the given size;
    // sizes are 2x the on-screen footprint for crisp retina scaling.
    this.load.image('turret', 'assets/sprites/turret.png');
    this.load.svg('projectile', 'assets/sprites/projectile.svg', { width: 28, height: 28 });
    this.load.svg('asteroid', 'assets/sprites/asteroid.svg', { width: 80, height: 80 });
    this.load.svg('asteroidShield', 'assets/sprites/asteroid-shield.svg', { width: 88, height: 88 });
    this.load.svg('gridTile', 'assets/sprites/grid-tile.svg', { width: 180, height: 160 });

    // Operator plant platforms (custom PNG art, one per operator family).
    this.load.image('plantAdd', 'assets/sprites/plant-add.png');
    this.load.image('plantSub', 'assets/sprites/plant-sub.png');
    this.load.image('plantMul', 'assets/sprites/plant-mul.png');
    this.load.image('plantDiv', 'assets/sprites/plant-div.png');
    this.load.svg('droneBarrier', 'assets/sprites/drone-barrier.svg', { width: 72, height: 72 });
  }

  create() {
    this.synth.setSettings(this.options.audioSettings);

    const W = this.scale.width;
    const H = this.scale.height;
    this.tileW = (W - this.playLeft) / this.cols;
    this.tileH = (H - this.gridTop - 10) / this.rows;

    // Moving galaxy backdrop (drifting nebula + parallax starfield). Renders behind all play pieces.
    this.createGalaxyBackground(W, H);

    // Left base zone
    this.add.rectangle(this.playLeft / 2, H / 2, this.playLeft - 12, H - 20, 0x22d3ee, 0.06)
      .setStrokeStyle(2, 0x22d3ee, 0.5);
    this.add.text(this.playLeft / 2, 14, 'BASE', { fontSize: '14px', color: '#22d3ee', fontStyle: 'bold' })
      .setOrigin(0.5, 0);
    this.baseHpText = this.add.text(this.playLeft / 2, H / 2, `♥ ${this.baseHp}`,
      { fontSize: '22px', color: '#ff3b5c', fontStyle: 'bold' }).setOrigin(0.5);

    // Grid tiles + launcher plants (col 0)
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = this.cellX(c);
        const y = this.cellY(r);
        const cell = Math.min(this.tileW, this.tileH) * 0.94;
        const tile = this.add.image(x, y, 'gridTile')
          .setDisplaySize(cell, cell)
          .setAlpha(0.18)
          .setDepth(-5);
        this.tiles.set(`${c},${r}`, tile);

        if (c === 0) {
          this.addLauncher(r, x, y);
        } else {
          // Field tile: tappable target for placing a drafted plant.
          tile.setInteractive();
          tile.on('pointerdown', () => this.tryPlace(c, r));
          tile.on('pointerover', () => this.showHoverGhost(c, r));
          tile.on('pointerout', () => this.hideHoverGhost());
        }
      }
    }

    // Lane decoration: drone-barrier gates at each lane's ends + flowing air streaks along the lane.
    this.createLaneDecor(W);

    this.projectiles = this.physics.add.group();
    this.asteroids = this.physics.add.group();
    this.physics.add.overlap(this.projectiles, this.asteroids, this.handleHit, undefined, this);

    this.hintText = this.add.text(W / 2, H - 12, '', { fontSize: '16px', color: '#00e676', fontStyle: 'bold' })
      .setOrigin(0.5, 1).setVisible(false);

    // Wave HUD: persistent progress label (top center) + transient announce banner.
    this.waveLabel = this.add.text(W / 2, 12, '', { fontSize: '16px', color: '#22d3ee', fontStyle: 'bold' })
      .setOrigin(0.5, 0);
    this.bannerText = this.add.text(W / 2, H * 0.4, '', { fontSize: '46px', color: '#22d3ee', fontStyle: 'bold' })
      .setOrigin(0.5).setAlpha(0).setDepth(100);

    // Listen to React UI events
    this.game.events.on('card-drafted', this.handleCardDrafted, this);
    this.game.events.on('audio-settings-changed', this.handleAudioSettingsChanged, this);

    // Release resources on scene shutdown: detach the global listener and close the
    // AudioContext (spec verification requires Web Audio nodes be released on exit).
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('card-drafted', this.handleCardDrafted, this);
      this.game.events.off('audio-settings-changed', this.handleAudioSettingsChanged, this);
      this.synth.close();
    });

    // Starter plants in row 0 for visual demo: 5 -> +3 -> *2.
    this.addModifier(1, 0, { op: '+', val: 3, type: 'ADD_3' });
    this.addModifier(2, 0, { op: '*', val: 2, type: 'MUL_2' });

    // Launch the first wave after a brief beat so the player can read the board.
    this.time.delayedCall(1200, () => this.startWave(1));
  }

  // --- Wave system ----------------------------------------------------------
  private waveConfig(n: number): { count: number; interval: number } {
    if (n <= this.normalWaves) return { count: 3 + n, interval: 1700 }; // w1=4, w2=5, w3=6
    return { count: 8 + this.options.level * 2, interval: 800 };        // final swarm
  }

  private startWave(n: number) {
    this.wave = n;
    this.finalWave = n > this.normalWaves;
    const cfg = this.waveConfig(n);
    this.toSpawn = cfg.count;

    this.waveLabel.setText(this.finalWave ? 'FINAL WAVE' : `Wave ${n} / ${this.normalWaves}`)
      .setColor(this.finalWave ? '#ff3b5c' : '#22d3ee');
    this.announce(this.finalWave ? 'FINAL WAVE!' : `Wave ${n}`, this.finalWave ? '#ff3b5c' : '#22d3ee');
    this.finalWave ? this.synth.playError() : this.synth.playCardDraw();

    this.spawnEvent?.remove();
    this.spawnEvent = this.time.addEvent({ delay: cfg.interval, loop: true, callback: this.waveTick, callbackScope: this });
  }

  private waveTick() {
    if (this.isDrafting) return; // clock is paused during draft, but guard anyway
    if (this.toSpawn <= 0) {
      this.spawnEvent?.remove();
      this.spawnEvent = undefined;
      this.onWaveSpawned();
      return;
    }
    this.spawnAsteroid();
    this.toSpawn--;
  }

  private onWaveSpawned() {
    if (this.wave < this.normalWaves) {
      // Timed: next normal wave arrives after a short breather.
      this.time.delayedCall(4000, () => this.startWave(this.wave + 1));
    } else if (this.wave === this.normalWaves) {
      // Hybrid: hold the final wave until the field is clear (checked in update()).
      this.awaitingFinal = true;
    }
    // Final wave: win is detected in update() once everything is cleared.
  }

  private announce(text: string, color: string) {
    this.bannerText.setText(text).setColor(color).setAlpha(1).setScale(0.6);
    this.tweens.add({ targets: this.bannerText, scale: 1, duration: 300, ease: 'Back.out' });
    this.tweens.add({ targets: this.bannerText, alpha: 0, delay: 1100, duration: 600 });
  }

  private winSector() {
    this.isDrafting = true;
    this.physics.pause();
    this.spawnEvent?.remove();
    const stars = this.baseHp >= 5 ? 3 : this.baseHp >= 3 ? 2 : 1;
    this.announce('SECTOR CLEAR!', '#00e676');
    this.synth.playCardDraw();
    this.time.delayedCall(1600, () => this.options.onGameOver(stars));
  }

  private cellX(col: number): number {
    return this.playLeft + col * this.tileW + this.tileW / 2;
  }
  private cellY(row: number): number {
    return this.gridTop + row * this.tileH + this.tileH / 2;
  }

  // --- Galaxy backdrop: drifting nebula clouds + two parallax star particle layers. ---
  private createGalaxyBackground(W: number, H: number) {
    // Deep-space fill behind everything.
    this.add.rectangle(W / 2, H / 2, W, H, 0x05060f).setDepth(-25);

    // Soft radial nebula textures (generated once on a canvas), tinted and slowly drifting.
    this.makeNebulaTexture('nebulaA', '125, 249, 255');   // cyan
    this.makeNebulaTexture('nebulaB', '192, 38, 255');    // magenta
    const blobs: Array<[string, number, number, number, number]> = [
      ['nebulaB', W * 0.25, H * 0.22, 2.4, 0.18],
      ['nebulaA', W * 0.8, H * 0.45, 2.8, 0.16],
      ['nebulaB', W * 0.55, H * 0.8, 3.0, 0.14],
    ];
    for (const [key, bx, by, scale, alpha] of blobs) {
      const neb = this.add.image(bx, by, key)
        .setScale(scale).setAlpha(alpha).setBlendMode(Phaser.BlendModes.ADD).setDepth(-20);
      // Lazy drift + breathe so the galaxy feels alive.
      this.tweens.add({
        targets: neb, x: bx + Phaser.Math.Between(-30, 30), y: by + Phaser.Math.Between(-40, 40),
        scale: scale * 1.12, duration: Phaser.Math.Between(9000, 14000),
        yoyo: true, repeat: -1, ease: 'Sine.inOut'
      });
    }

    // Star sprite texture (tiny soft dot).
    if (!this.textures.exists('starDot')) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1).fillCircle(4, 4, 2.2);
      g.fillStyle(0xffffff, 0.35).fillCircle(4, 4, 4);
      g.generateTexture('starDot', 8, 8);
      g.destroy();
    }

    // Ambient floating layer: dim stars scattered everywhere, slow drift + twinkle (fade in/out).
    this.add.particles(0, 0, 'starDot', {
      x: { min: 0, max: W }, y: { min: 0, max: H },
      lifespan: { min: 3000, max: 6000 }, frequency: 120, quantity: 1,
      scale: { min: 0.3, max: 0.9 },
      alpha: { start: 0.9, end: 0 },
      speedX: { min: -4, max: 4 }, speedY: { min: -4, max: 4 },
      blendMode: 'ADD',
    }).setDepth(-18);

    // Flying parallax layer: brighter stars streaking right -> left for a sense of travel.
    this.add.particles(W + 10, 0, 'starDot', {
      x: W + 10, y: { min: 0, max: H },
      lifespan: 5200, frequency: 140, quantity: 1,
      scale: { min: 0.5, max: 1.3 },
      alpha: { start: 1, end: 0.2 },
      speedX: { min: -160, max: -90 },
      blendMode: 'ADD',
    }).setDepth(-17);
  }

  // Build a radial-gradient nebula blob on a canvas texture (no asset binary).
  private makeNebulaTexture(key: string, rgb: string) {
    if (this.textures.exists(key)) return;
    const size = 256;
    const tex = this.textures.createCanvas(key, size, size);
    if (!tex) return;
    const ctx = tex.getContext();
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `rgba(${rgb}, 0.9)`);
    grad.addColorStop(0.4, `rgba(${rgb}, 0.35)`);
    grad.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  // --- Lane decoration: drone gates at each end + semi-transparent flowing air streaks. ---
  private createLaneDecor(W: number) {
    // Streak texture: a soft horizontal capsule.
    if (!this.textures.exists('flowStreak')) {
      const g = this.add.graphics();
      g.fillStyle(0x7df9ff, 1).fillRoundedRect(0, 0, 44, 2, 1);
      g.generateTexture('flowStreak', 44, 2);
      g.destroy();
    }

    for (let r = 0; r < this.rows; r++) {
      const y = this.cellY(r);

      // Semi-transparent air-flow band tinting the lane.
      this.add.rectangle(this.playLeft + (W - this.playLeft) / 2, y, W - this.playLeft, this.tileH * 0.7, 0x22d3ee, 0.05)
        .setDepth(-6);

      // Flowing streaks travelling right -> left (toward base), matching incoming asteroid flow.
      this.add.particles(0, 0, 'flowStreak', {
        x: W - 4, y: { min: y - this.tileH * 0.28, max: y + this.tileH * 0.28 },
        lifespan: 4200, frequency: 900, quantity: 1,
        speedX: { min: -150, max: -100 },
        scaleX: { min: 0.5, max: 1.1 }, scaleY: { min: 0.5, max: 1 },
        alpha: { start: 0.12, end: 0 },
        blendMode: 'ADD',
      }).setDepth(-3);

      // Drone-barrier gate at the lane's left (base side) only. Right side is the asteroid entry. Decorative.
      const leftDrone = this.add.image(this.playLeft + 6, y, 'droneBarrier')
        .setDisplaySize(this.tileH * 0.5, this.tileH * 0.5).setAlpha(0.85).setDepth(-4);
      // Gentle hover bob so the drone reads as airborne.
      this.tweens.add({
        targets: leftDrone, y: y + Phaser.Math.Between(4, 8),
        duration: Phaser.Math.Between(1100, 1700), yoyo: true, repeat: -1, ease: 'Sine.inOut'
      });
    }
  }

  private addLauncher(row: number, x: number, y: number) {
    // turret.png art should already face right (down the lane). If yours points
    // up, add .setAngle(90); if it points left, .setAngle(180).
    const size = Math.min(this.tileW, this.tileH) * 0.8;
    const s = this.add.sprite(x, y, 'turret').setDisplaySize(size, size);
    this.breathe(s, 0.04, 1600); // idle breathing
    this.launchers.push(s);
    this.time.addEvent({ delay: 2000, loop: true, callback: () => this.fireProjectile(row, x, y) });
  }

  private plantTexture(op: Modifier['op']): string {
    return op === '+' ? 'plantAdd' : op === '-' ? 'plantSub' : op === '*' ? 'plantMul' : 'plantDiv';
  }

  // Continuous subtle "breathing": a slow scale yoyo around the object's base scale.
  private breathe(obj: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image, amp = 0.035, dur = 1500) {
    const bx = obj.scaleX;
    const by = obj.scaleY;
    obj.setData('bScale', { bx, by });
    const t = this.tweens.add({
      targets: obj, scaleX: bx * (1 + amp), scaleY: by * (1 + amp),
      duration: dur, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    obj.setData('idleTween', t);
  }

  // One-shot "ping": squish (wide + short) + white brightness flash, then ease back.
  // Pauses the idle breathe so the two don't fight over scale.
  private ping(obj: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image) {
    const base = obj.getData('bScale') as { bx: number; by: number } | undefined;
    if (!base || obj.getData('pinging')) return;
    obj.setData('pinging', true);
    const idle = obj.getData('idleTween') as Phaser.Tweens.Tween | undefined;
    idle?.pause();
    obj.setScale(base.bx * 1.14, base.by * 0.88);
    obj.setTint(0xffffff);
    obj.setTintFill(); // Phaser 4: enable fill-tint mode (color comes from setTint above)
    this.time.delayedCall(60, () => obj.clearTint());
    this.tweens.add({
      targets: obj, scaleX: base.bx, scaleY: base.by,
      duration: 200, ease: 'Back.out',
      onComplete: () => { idle?.resume(); obj.setData('pinging', false); },
    });
  }

  private addModifier(col: number, row: number, mod: Modifier) {
    this.modifiers.set(`${col},${row}`, mod);
    const x = this.cellX(col);
    const y = this.cellY(row);
    // Custom platform art per operator; square so the PNG never stretches.
    const plantSize = Math.min(this.tileW, this.tileH) * 0.9;
    const plant = this.add.image(x, y, this.plantTexture(mod.op))
      .setDisplaySize(plantSize, plantSize)
      .setDepth(-2);
    this.plantSprites.set(`${col},${row}`, plant);
    this.breathe(plant, 0.03, 1800); // idle pulse
    // Operator + value label so the magnitude (e.g. +3, x2) stays readable over the art.
    this.add.text(x, y + this.tileH * 0.2, `${mod.op}${mod.val}`,
      { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5).setDepth(-1)
      .setShadow(0, 0, '#000000', 4, true, true);
  }

  // Spin rate climbs with damage so a heavily-buffed pea visibly whirls faster.
  private peaSpin(dmg: number): number {
    return Phaser.Math.Clamp(120 + dmg * 12, 120, 600);
  }

  fireProjectile(row: number, x: number, y: number) {
    if (this.isDrafting) return;

    // Spawn at the muzzle: the cannon's barrels sit above the lane center.
    const spawnY = y - this.tileH * 0.12;
    const proj = this.projectiles.create(x + 20, spawnY, 'projectile') as Phaser.Physics.Arcade.Sprite;
    proj.setDisplaySize(16, 16);
    proj.setVelocityX(180); // fire rightward toward incoming asteroids
    proj.setAngularVelocity(this.peaSpin(5)); // spins; faster as it gets buffed
    proj.setData('damage', 5); // base damage
    proj.setData('row', row);
    proj.setData('lastCol', 0);
    proj.setData('expr', '5');
    proj.setData('baseSX', proj.scaleX);
    proj.setData('baseSY', proj.scaleY);
    proj.setData('pScale', 1); // grows +18% per buff, capped

    const text = this.add.text(x + 20, spawnY - 18, '5', { fontSize: '13px', color: '#00e676' }).setOrigin(0.5);
    proj.setData('text', text);

    this.synth.playLaser();
    this.ping(this.launchers[row]); // fire-recoil squish + brightness ping
  }

  spawnAsteroid() {
    if (this.isDrafting) return;

    const row = Phaser.Math.Between(0, this.rows - 1);
    const y = this.cellY(row);
    const x = this.scale.width - 20;

    const ast = this.asteroids.create(x, y, 'asteroid') as Phaser.Physics.Arcade.Sprite;
    // Slow drift toward base; the final swarm comes in a touch faster for tension.
    ast.setVelocityX(this.finalWave ? -28 : -20);
    // Lazy spin: random direction + rate per drone.
    ast.setAngularVelocity(Phaser.Math.Between(8, 20) * (Phaser.Math.Between(0, 1) ? 1 : -1));

    let hp = 10;
    let shieldFactor = 1;
    if (this.options.level === 1) {
      hp = Phaser.Math.Between(5, 10);
    } else if (this.options.level === 2) {
      hp = Phaser.Math.Between(10, 30);
    } else if (this.options.level === 3) {
      shieldFactor = Phaser.Math.Between(2, 4);
      hp = shieldFactor * Phaser.Math.Between(2, 6); // ensure it's a multiple
    }

    // Basic (non-shielded) opponents: +200% HP (x3).
    if (shieldFactor === 1) hp *= 3;

    ast.setTexture(shieldFactor > 1 ? 'asteroidShield' : 'asteroid');
    // Spawn as big as the lane itself; SUB/DIV plants literally shrink this scale.
    const droneSize = this.tileH * 0.92;
    ast.setDisplaySize(droneSize, droneSize);
    ast.setData('baseSize', droneSize);
    ast.setData('scaleF', 1);
    ast.setData('hp', hp);
    ast.setData('shield', shieldFactor);
    ast.setData('row', row);
    ast.setData('lastCol', this.cols); // for -/ tower pass-through tracking

    const txtStr = shieldFactor > 1 ? `[x${shieldFactor}] ${hp}` : `${hp}`;
    const text = this.add.text(x, y - 28, txtStr, { fontSize: '15px', color: '#ff3b5c', fontStyle: 'bold' })
      .setOrigin(0.5);
    ast.setData('text', text);
  }

  update() {
    // Hybrid wave gate: launch the final swarm only once the field is clear.
    if (this.awaitingFinal && !this.isDrafting && this.asteroids.countActive(true) === 0) {
      this.awaitingFinal = false;
      this.time.delayedCall(900, () => this.startWave(this.normalWaves + 1));
    }
    // Win: final wave fully spawned and every asteroid cleared.
    if (this.finalWave && !this.sectorCleared && !this.isDrafting
        && !this.spawnEvent && this.toSpawn <= 0
        && this.asteroids.countActive(true) === 0) {
      this.sectorCleared = true;
      this.winSector();
    }

    // Projectiles travel left->right; apply each plant's operator as the pea enters its column.
    for (const p of this.projectiles.getChildren()) {
      const proj = p as Phaser.Physics.Arcade.Sprite;
      const text = proj.getData('text') as Phaser.GameObjects.Text;
      text.setPosition(proj.x, proj.y - 18);

      const row = proj.getData('row') as number;
      const col = Math.floor((proj.x - this.playLeft) / this.tileW);
      const lastCol = proj.getData('lastCol') as number;

      if (col > lastCol && col < this.cols) {
        proj.setData('lastCol', col);
        const mod = this.modifiers.get(`${col},${row}`);
        // Only +/* towers buff turret bullets. -/ are "debuff" towers that act on
        // asteroids as they pass through (see asteroid loop below), not on bullets.
        if (mod && (mod.op === '+' || mod.op === '*')) {
          let dmg = proj.getData('damage') as number;
          let expr = proj.getData('expr') as string;

          if (mod.op === '+') dmg += mod.val;
          if (mod.op === '*') { dmg *= mod.val; expr = `(${expr})`; }

          expr += ` ${mod.op} ${mod.val}`;
          proj.setData('damage', dmg);
          proj.setData('expr', expr);
          text.setText(`${expr} = ${dmg}`);

          // Pea grows (capped) and spins faster the bigger its damage gets.
          const pScale = Math.min((proj.getData('pScale') as number) * 1.18, 2.4);
          proj.setData('pScale', pScale);
          const bsx = proj.getData('baseSX') as number;
          const bsy = proj.getData('baseSY') as number;
          this.tweens.add({ targets: proj, scaleX: bsx * pScale, scaleY: bsy * pScale, duration: 150, ease: 'Back.out' });
          proj.setAngularVelocity(this.peaSpin(dmg));

          const ps = this.plantSprites.get(`${col},${row}`);
          if (ps) this.ping(ps); // platform reacts as the pea activates it
        }
      }

      if (proj.x > this.scale.width) {
        text.destroy();
        proj.destroy();
      }
    }

    // Asteroids drift left; reaching the base costs a life.
    for (const a of this.asteroids.getChildren()) {
      const ast = a as Phaser.Physics.Arcade.Sprite;
      const text = ast.getData('text') as Phaser.GameObjects.Text;
      text.setPosition(ast.x, ast.y - 28);

      // Asteroid moves right->left; -/ towers chip its HP as it enters each new column.
      const aRow = ast.getData('row') as number;
      const aCol = Math.floor((ast.x - this.playLeft) / this.tileW);
      const aLastCol = ast.getData('lastCol') as number;
      if (aCol < aLastCol && aCol >= 1 && aCol < this.cols) {
        ast.setData('lastCol', aCol);
        const mod = this.modifiers.get(`${aCol},${aRow}`);
        if (mod && (mod.op === '-' || mod.op === '/')) {
          let hp = ast.getData('hp') as number;
          if (mod.op === '-') hp -= mod.val;
          if (mod.op === '/') hp = Math.floor(hp / mod.val);
          this.synth.playExplosion();
          const ps = this.plantSprites.get(`${aCol},${aRow}`);
          if (ps) this.ping(ps); // debuff platform reacts as the drone passes
          if (hp <= 0) {
            text.destroy();
            ast.destroy();
            this.score += 10;
            this.options.onScoreUpdate(this.score);
            if (this.score % 50 === 0) this.triggerDraft();
            continue;
          }
          ast.setData('hp', hp);
          // Literal scale op: DIV divides the sprite scale, SUB shrinks it a fixed step.
          let sf = ast.getData('scaleF') as number;
          if (mod.op === '/') sf = sf / mod.val;
          if (mod.op === '-') sf = sf - mod.val * 0.12;
          sf = Phaser.Math.Clamp(sf, 0.25, 1);
          ast.setData('scaleF', sf);
          const base = ast.getData('baseSize') as number;
          ast.setDisplaySize(base * sf, base * sf);
          const shield = ast.getData('shield') as number;
          text.setText(shield > 1 ? `[x${shield}] ${hp}` : `${hp}`);
        }
      }

      if (ast.x < this.playLeft) {
        text.destroy();
        ast.destroy();
        this.synth.playError();
        this.damageBase();
      }
    }
  }

  private damageBase() {
    this.baseHp--;
    this.baseHpText.setText(`♥ ${Math.max(0, this.baseHp)}`);
    this.tweens.add({ targets: this.baseHpText, scale: 1.6, duration: 120, yoyo: true });
    if (this.baseHp <= 0) this.gameOver();
  }

  private gameOver() {
    this.isDrafting = true;
    this.physics.pause();
    this.time.paused = true;
    this.announce('BASE DOWN', '#ff3b5c');
    const stars = this.score >= 100 ? 3 : this.score >= 50 ? 2 : 1;
    this.options.onGameOver(stars);
  }

  // Arrow field so it matches Phaser 4's ArcadePhysicsCallback signature (object params are a
  // Body | StaticBody | GameObjectWithBody | Tile union) while keeping `this` bound to the scene.
  private handleHit: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (projectile, asteroid) => {
    const proj = projectile as Phaser.Physics.Arcade.Sprite;
    const ast = asteroid as Phaser.Physics.Arcade.Sprite;

    const dmg = proj.getData('damage') as number;
    const shield = ast.getData('shield') as number;
    let hp = ast.getData('hp') as number;

    // Shield gate: damage must be a multiple of the factor, else fully deflected.
    if (shield > 1 && dmg % shield !== 0) {
      this.synth.playError();
      const defText = this.add.text(ast.x, ast.y, 'Deflected!', { color: '#ff3b5c', fontSize: '18px' }).setOrigin(0.5);
      this.tweens.add({ targets: defText, y: ast.y - 50, alpha: 0, duration: 1000, onComplete: () => defText.destroy() });

      const pText = proj.getData('text') as Phaser.GameObjects.Text;
      pText.destroy();
      proj.destroy();
      return;
    }

    hp -= dmg;
    this.synth.playExplosion();

    const pText = proj.getData('text') as Phaser.GameObjects.Text;
    pText.destroy();
    proj.destroy();

    if (hp <= 0) {
      const aText = ast.getData('text') as Phaser.GameObjects.Text;
      aText.destroy();
      ast.destroy();
      this.score += 10;
      this.options.onScoreUpdate(this.score);

      // Wave-complete placeholder: every 50 score, draft a new plant.
      if (this.score % 50 === 0) {
        this.triggerDraft();
      }
    } else {
      ast.setData('hp', hp);
      const aText = ast.getData('text') as Phaser.GameObjects.Text;
      const txtStr = shield > 1 ? `[x${shield}] ${hp}` : `${hp}`;
      aText.setText(txtStr);
    }
  };

  triggerDraft() {
    this.isDrafting = true;
    this.physics.pause();
    this.time.paused = true; // freezes wave spawn + launcher timers during draft
    this.synth.playCardDraw();

    const pool = ['ADD_2', 'MUL_3', 'SUB_1', 'FRAC_HALF'];
    const options = [
      pool[Phaser.Math.Between(0, pool.length - 1)],
      pool[Phaser.Math.Between(0, pool.length - 1)],
      pool[Phaser.Math.Between(0, pool.length - 1)]
    ];
    this.options.onWaveComplete(options);
  }

  // A card was picked in the React draft modal. Parse it and enter placement mode:
  // the scene stays paused until the player taps an empty field tile (tryPlace).
  handleCardDrafted(card: string) {
    let op: '+' | '-' | '*' | '/' = '+';
    let val = 1;
    if (card.startsWith('ADD_')) { op = '+'; val = parseInt(card.split('_')[1]); }
    if (card.startsWith('MUL_')) { op = '*'; val = parseInt(card.split('_')[1]); }
    if (card.startsWith('SUB_')) { op = '-'; val = parseInt(card.split('_')[1]); }
    if (card.startsWith('DIV_')) { op = '/'; val = parseInt(card.split('_')[1]); }
    if (card === 'FRAC_HALF') { op = '/'; val = 2; }

    this.pending = { op, val, type: card };
    this.hintText.setText(`Tap a tile to plant  ${op}${val}`).setVisible(true);
    this.enterPlacementMode();
  }

  // Highlight every empty placeable tile: spawn a glowing ring overlay + pulse the tiles,
  // and fire a one-shot "ping" (synth chime + ring pop) so the player knows it's planting time.
  private enterPlacementMode() {
    this.exitPlacementMode(); // clear any prior state

    const emptyTiles: Phaser.GameObjects.Image[] = [];
    const ringR = Math.min(this.tileW, this.tileH) * 0.42;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 1; c < this.cols; c++) {
        if (this.modifiers.has(`${c},${r}`)) continue;
        const tile = this.tiles.get(`${c},${r}`);
        if (tile) emptyTiles.push(tile);
        const ring = this.add.circle(this.cellX(c), this.cellY(r), ringR)
          .setStrokeStyle(2, 0x00e676, 0.9)
          .setDepth(-3)
          .setScale(0.5); // pops in via the ping tween below
        this.placeRings.push(ring);
      }
    }

    if (this.placeRings.length === 0) return;

    // Tile glow pulse.
    this.tilePulseTween = this.tweens.add({
      targets: emptyTiles, alpha: 0.5,
      duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    // Ring "ping" pop-in, then a continuous breathing pulse.
    this.tweens.add({
      targets: this.placeRings, scale: 1, duration: 280, ease: 'Back.out',
      onComplete: () => {
        this.ringPulseTween = this.tweens.add({
          targets: this.placeRings, scale: 1.12, alpha: 0.45,
          duration: 760, yoyo: true, repeat: -1, ease: 'Sine.inOut',
        });
      },
    });
    this.synth.playPing();
  }

  // Tear down placement visuals (rings, pulse tweens, ghost) and reset tile alpha.
  private exitPlacementMode() {
    this.tilePulseTween?.stop();
    this.tilePulseTween = undefined;
    this.ringPulseTween?.stop();
    this.ringPulseTween = undefined;
    this.placeRings.forEach((ring) => ring.destroy());
    this.placeRings = [];
    this.hideHoverGhost();
    // Reset every field tile to its idle alpha.
    this.tiles.forEach((t) => t.setAlpha(0.18));
  }

  // Translucent blueprint preview of the pending plant, tinted blue, tracking the hovered tile.
  private showHoverGhost(col: number, row: number) {
    if (!this.pending) return;
    if (this.modifiers.has(`${col},${row}`)) return; // occupied
    const x = this.cellX(col);
    const y = this.cellY(row);
    const size = Math.min(this.tileW, this.tileH) * 0.9;
    if (!this.hoverGhost) {
      this.hoverGhost = this.add.image(x, y, this.plantTexture(this.pending.op))
        .setDepth(-1).setAlpha(0.55).setTint(0x22d3ee);
    } else {
      this.hoverGhost.setTexture(this.plantTexture(this.pending.op)).setVisible(true);
    }
    this.hoverGhost.setDisplaySize(size, size).setPosition(x, y);
  }

  private hideHoverGhost() {
    this.hoverGhost?.setVisible(false);
  }

  private handleAudioSettingsChanged(settings: AudioSettings) {
    this.synth.setSettings(settings);
  }

  private tryPlace(col: number, row: number) {
    if (!this.pending) return;
    if (this.modifiers.has(`${col},${row}`)) return; // occupied

    this.addModifier(col, row, this.pending);
    this.pending = null;
    this.hintText.setVisible(false);
    this.exitPlacementMode();
    this.synth.playCardDraw();

    // Resume the wave now that the plant is placed.
    this.isDrafting = false;
    this.physics.resume();
    this.time.paused = false;
  }
}
