import React, { useEffect, useRef, useState } from 'react';
import { Game } from 'phaser';
import { RotateCcw } from 'lucide-react';
import { createGameConfig } from '../games/config';
import { type AudioSettings } from '../settings';
import CardDraftModal from './CardDraftModal';

interface GameContainerProps {
  level: number;
  unlockedCards: string[];
  audioSettings: AudioSettings;
  onReturnToHub: (earnedStars: number) => void;
}

// `unlockedCards` is accepted but not yet consumed by the scene (draft pool is still hard-coded).
const GameContainer: React.FC<GameContainerProps> = ({ level, audioSettings, onReturnToHub }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const audioSettingsRef = useRef(audioSettings);
  
  // State for overlay UI driven by Phaser events
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftOptions, setDraftOptions] = useState<string[]>([]);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Phaser Game
    const config = createGameConfig(containerRef.current, {
      level,
      audioSettings: audioSettingsRef.current,
      onWaveComplete: (options: string[]) => {
        setDraftOptions(options);
        setShowDraftModal(true);
      },
      onGameOver: (stars: number) => {
        onReturnToHub(stars);
      },
      onScoreUpdate: (newScore: number) => {
        setScore(newScore);
      }
    });

    gameRef.current = new Game(config);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [level, onReturnToHub]);

  useEffect(() => {
    audioSettingsRef.current = audioSettings;
    gameRef.current?.events.emit('audio-settings-changed', audioSettings);
  }, [audioSettings]);

  const handleCardSelected = (card: string) => {
    setShowDraftModal(false);
    // Send event back to phaser
    if (gameRef.current) {
        // We will emit an event on the global game registry or event emitter
        gameRef.current.events.emit('card-drafted', card);
    }
  };

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      {/* Phaser Canvas Container — Scale.FIT keeps the landscape board centered at any size */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Rotate prompt: the board is landscape, so on small portrait screens ask the
          player to turn the device. Hidden on desktop (md+) and in landscape. */}
      <div className="hidden max-md:portrait:flex absolute inset-0 z-[60] flex-col justify-center items-center gap-4 bg-[#05080f]/95 text-center px-8">
        <RotateCcw className="text-[#00ffff] animate-pulse" size={56} />
        <p className="glow-text text-[#00ffff] text-xl font-bold">Rotate your device</p>
        <p className="text-slate-400 text-sm max-w-xs">
          The battle grid plays in landscape. Turn sideways to deploy your operators.
        </p>
      </div>

      {/* React UI Overlay */}
      <div className="absolute top-2.5 left-2.5 text-[#00ffff] font-mono text-lg pointer-events-none drop-shadow-[0_0_5px_#00ffff]">
        SCORE: {score}
      </div>

      <button 
        className="absolute top-2.5 right-2.5 bg-red-500/30 text-white border border-red-500 px-2 py-1 rounded cursor-pointer"
        onClick={() => onReturnToHub(0)}
      >
        Quit
      </button>

      {/* Draft Modal */}
      {showDraftModal && (
        <CardDraftModal 
          options={draftOptions} 
          onSelect={handleCardSelected} 
        />
      )}
    </div>
  );
};

export default GameContainer;
