export interface AudioSettings {
  muted: boolean;
  masterVolume: number;
  effectsVolume: number;
  alertsVolume: number;
}

export const defaultAudioSettings: AudioSettings = {
  muted: false,
  masterVolume: 0.8,
  effectsVolume: 0.75,
  alertsVolume: 0.8,
};
