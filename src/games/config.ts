import Phaser from 'phaser';
import SpaceGridScene from './SpaceGridScene';
import { type AudioSettings } from '../settings';

export interface GameOptions {
  level: number;
  audioSettings: AudioSettings;
  onWaveComplete: (options: string[]) => void;
  onGameOver: (stars: number) => void;
  onScoreUpdate: (score: number) => void;
}

export const createGameConfig = (parent: HTMLElement, options: GameOptions): Phaser.Types.Core.GameConfig => {
  return {
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    backgroundColor: '#05080f',
    scene: [new SpaceGridScene(options)]
  };
};
