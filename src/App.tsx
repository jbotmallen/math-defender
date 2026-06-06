import { useCallback, useEffect, useRef, useState } from 'react';
import Dashboard from './components/Dashboard';
import GameContainer from './components/GameContainer';
import { defaultAudioSettings, type AudioSettings } from './settings';
import { setSfxSettings } from './audio/sfx';

export type ViewState = 'DASHBOARD' | 'GAME';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [stars, setStars] = useState<number>(0);
  // Highest sector cleared (won). Sector N unlocks once N-1 is cleared.
  const [maxClearedLevel, setMaxClearedLevel] = useState<number>(0);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(defaultAudioSettings);
  // TODO: spec calls for spending stars to unlock cards into the draft pool.
  const [unlockedCards] = useState<string[]>(['ADD_1', 'ADD_2', 'SUB_2']);

  // Keep the UI sound player in sync with the user's audio settings.
  useEffect(() => {
    setSfxSettings(audioSettings);
  }, [audioSettings]);

  // Mirror of selectedLevel for the stable-identity return handler below.
  const selectedLevelRef = useRef<number>(1);

  const handleStartLevel = useCallback((level: number) => {
    setSelectedLevel(level);
    selectedLevelRef.current = level;
    setCurrentView('GAME');
  }, []);

  // Bank a finished run's rewards. Called once when the results screen appears, so
  // stars/unlocks persist regardless of which results button the player picks next.
  // Stable identity so GameContainer's effect doesn't tear down the Phaser game.
  const handleCommitResult = useCallback((earnedStars: number, didWin: boolean) => {
    if (earnedStars > 0) {
      setStars(prev => prev + earnedStars);
    }
    if (didWin) {
      // Clearing a sector unlocks the next one.
      setMaxClearedLevel(prev => Math.max(prev, selectedLevelRef.current));
    }
  }, []);

  // Navigation only (no banking) — used by the results screen's Hub button and Quit.
  const handleReturnToHub = useCallback(() => {
    setCurrentView('DASHBOARD');
  }, []);

  return (
    <>
      {currentView === 'DASHBOARD' && (
        <Dashboard
          stars={stars}
          maxClearedLevel={maxClearedLevel}
          unlockedCards={unlockedCards}
          audioSettings={audioSettings}
          onAudioSettingsChange={setAudioSettings}
          onStartLevel={handleStartLevel} 
        />
      )}
      {currentView === 'GAME' && (
        <GameContainer
          key={selectedLevel}
          level={selectedLevel}
          maxLevel={3}
          unlockedCards={unlockedCards}
          audioSettings={audioSettings}
          onCommitResult={handleCommitResult}
          onReturnToHub={handleReturnToHub}
          onStartLevel={handleStartLevel}
        />
      )}
    </>
  );
}

export default App;
