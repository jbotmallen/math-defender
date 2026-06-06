import { defaultAudioSettings, type AudioSettings } from '../settings';

export class SoundSynth {
  private ctx: AudioContext | null = null;
  private settings: AudioSettings = defaultAudioSettings;

  constructor() {
    try {
      const Ctor =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) {
        this.ctx = new Ctor();
      }
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public setSettings(settings: AudioSettings) {
    this.settings = settings;
  }

  /** Release the AudioContext and its nodes. Call on scene/game teardown. */
  public close() {
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close();
    }
    this.ctx = null;
  }

  public playLaser() {
    if (!this.ctx) return;
    const volume = this.getChannelVolume('effects');
    if (volume <= 0) return;
    this.resume();
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    const now = this.ctx.currentTime;
    
    // Frequency sweep down
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
    
    // Volume envelope
    gain.gain.setValueAtTime(0.3 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playExplosion() {
    if (!this.ctx) return;
    const volume = this.getChannelVolume('effects');
    if (volume <= 0) return;
    this.resume();

    const bufferSize = this.ctx.sampleRate * 0.2; // 0.2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5 * volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noiseSource.start();
  }

  public playCardDraw() {
    if (!this.ctx) return;
    const volume = this.getChannelVolume('effects');
    if (volume <= 0) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const now = this.ctx.currentTime;

    // Arpeggio C5 -> E5 -> G5
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.05);
    osc.frequency.setValueAtTime(783.99, now + 0.1);

    gain.gain.setValueAtTime(0.1 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /** Bright two-note "ready to plant" ping (rising bell). */
  public playPing() {
    if (!this.ctx) return;
    const volume = this.getChannelVolume('effects');
    if (volume <= 0) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const now = this.ctx.currentTime;

    // Rising perfect-fifth chime: A5 -> E6
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.12);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18 * volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  public playError() {
    if (!this.ctx) return;
    const volume = this.getChannelVolume('alerts');
    if (volume <= 0) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const now = this.ctx.currentTime;

    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.3);

    gain.gain.setValueAtTime(0.2 * volume, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.3);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  private getChannelVolume(channel: 'effects' | 'alerts') {
    if (this.settings.muted) return 0;

    const channelVolume = channel === 'effects'
      ? this.settings.effectsVolume
      : this.settings.alertsVolume;

    return this.settings.masterVolume * channelVolume;
  }
}
