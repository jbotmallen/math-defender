import React, { useEffect, useRef, useState } from 'react';
import { Game } from 'phaser';
import { RotateCcw, LogOut, X } from 'lucide-react';
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
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  // Bumping this nonce tears down and rebuilds the Phaser game = restart the level.
  const [restartNonce, setRestartNonce] = useState(0);

  const [scorePopups, setScorePopups] = useState<{ id: number; text: string }[]>([]);
  const prevScoreRef = useRef(0);

  useEffect(() => {
    if (score > prevScoreRef.current) {
      const diff = score - prevScoreRef.current;
      const id = Date.now() + Math.random();
      setScorePopups((prev) => [...prev, { id, text: `+${diff}` }]);
      setTimeout(() => {
        setScorePopups((prev) => prev.filter((p) => p.id !== id));
      }, 750);
    }
    prevScoreRef.current = score;
  }, [score]);

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
  }, [level, onReturnToHub, restartNonce]);

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

  // Quit flow: opening the confirm dialog pauses the running scene so the battle
  // doesn't advance behind the prompt; cancelling resumes it.
  const openQuitConfirm = () => {
    setShowQuitConfirm(true);
    gameRef.current?.scene.pause('SpaceGridScene');
  };
  const cancelQuit = () => {
    setShowQuitConfirm(false);
    gameRef.current?.scene.resume('SpaceGridScene');
  };
  const confirmQuit = () => {
    setShowQuitConfirm(false);
    onReturnToHub(0);
  };

  // Restart: rebuild the Phaser game from scratch and reset overlay state.
  const handleRestart = () => {
    setShowQuitConfirm(false);
    setShowDraftModal(false);
    setScore(0);
    prevScoreRef.current = 0;
    setScorePopups([]);
    setRestartNonce((n) => n + 1);
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
      <div className="absolute top-2.5 left-2.5 flex items-center gap-2 pointer-events-none select-none">
        <div className="text-[#00ffff] font-mono text-lg drop-shadow-[0_0_5px_#00ffff]">
          SCORE: {score}
        </div>
        <div className="relative h-6 w-12">
          {scorePopups.map((popup) => (
            <span
              key={popup.id}
              className="absolute left-0 text-[#00e676] font-mono text-lg font-bold animate-score-pop drop-shadow-[0_0_6px_rgba(0,230,118,0.5)]"
            >
              {popup.text}
            </span>
          ))}
        </div>
      </div>

      {/* Top-right controls: Restart + Quit */}
      <div className="absolute top-2.5 right-2.5 flex gap-2">
        <button
          className="flex items-center gap-1 bg-cyan-500/20 text-white border border-cyan-400 px-2.5 py-1 rounded cursor-pointer hover:bg-cyan-500/35 transition-colors"
          onClick={handleRestart}
        >
          <RotateCcw size={16} />
          Restart
        </button>
        <button
          className="flex items-center gap-1 bg-red-500/30 text-white border border-red-500 px-2.5 py-1 rounded cursor-pointer hover:bg-red-500/45 transition-colors"
          onClick={openQuitConfirm}
        >
          <LogOut size={16} />
          Quit
        </button>
      </div>

      {/* Quit confirmation dialog */}
      {showQuitConfirm && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/70">
          <div className="glass-panel flex flex-col items-center gap-5 px-8 py-7 max-w-sm text-center">
            <h2 className="glow-text text-[#00ffff] text-2xl font-bold">Quit level?</h2>
            <p className="text-slate-300 text-sm">
              Your current run will be lost and you'll return to the hub with no stars.
            </p>
            <div className="flex gap-3 w-full justify-center">
              <button
                className="flex items-center gap-1.5 bg-slate-600/40 text-white border border-slate-400 px-4 py-2 rounded cursor-pointer hover:bg-slate-600/60 transition-colors"
                onClick={cancelQuit}
              >
                <X size={18} />
                Cancel
              </button>
              <button
                className="flex items-center gap-1.5 bg-red-500/40 text-white border border-red-500 px-4 py-2 rounded cursor-pointer hover:bg-red-500/60 transition-colors"
                onClick={confirmQuit}
              >
                <LogOut size={18} />
                Quit
              </button>
            </div>
          </div>
        </div>
      )}

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
