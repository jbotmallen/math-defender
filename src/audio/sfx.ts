import { type AudioSettings } from '../settings';

// React-side UI sound effects (Kenney Interface Sounds, CC0). The Phaser scene
// keeps its own synthesized SFX via SoundSynth; this module covers menu / HUD /
// modal buttons that live outside the canvas.

export type SfxName = 'click' | 'hover' | 'confirm' | 'back' | 'error' | 'toggle';

const SFX_SRC: Record<SfxName, string> = {
  click: '/sfx/ui_click.ogg',
  hover: '/sfx/ui_hover.ogg',
  confirm: '/sfx/ui_confirm.ogg',
  back: '/sfx/ui_back.ogg',
  error: '/sfx/ui_error.ogg',
  toggle: '/sfx/ui_toggle.ogg',
};

const SFX_CEILING = 0.7; // base clips are loud; scale down before settings volume

// Module-level mirror of the user's audio settings, updated from React.
let settings: AudioSettings = {
  muted: false,
  masterVolume: 0.8,
  effectsVolume: 0.75,
  alertsVolume: 0.8,
};

export const setSfxSettings = (next: AudioSettings) => {
  settings = next;
};

// Preloaded base elements; cloned per play so rapid/overlapping clicks don't cut.
const pool: Partial<Record<SfxName, HTMLAudioElement>> = {};

const getBase = (name: SfxName): HTMLAudioElement => {
  let base = pool[name];
  if (!base) {
    base = new Audio(SFX_SRC[name]);
    base.preload = 'auto';
    pool[name] = base;
  }
  return base;
};

export const playSfx = (name: SfxName) => {
  if (settings.muted) return;
  const volume = SFX_CEILING * settings.effectsVolume * settings.masterVolume;
  if (volume <= 0) return;
  const node = getBase(name).cloneNode() as HTMLAudioElement;
  node.volume = Math.min(1, volume);
  // Autoplay can reject before the first user gesture; ignore — buttons are gestures.
  void node.play().catch(() => {});
};
