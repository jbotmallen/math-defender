import { useCallback, useState } from 'react';
import Dashboard from './components/Dashboard';
import GameContainer from './components/GameContainer';
import { defaultAudioSettings, type AudioSettings } from './settings';

export type ViewState = 'DASHBOARD' | 'GAME';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [stars, setStars] = useState<number>(0);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(defaultAudioSettings);
  // TODO: spec calls for spending stars to unlock cards into the draft pool.
  const [unlockedCards] = useState<string[]>(['ADD_1', 'ADD_2', 'SUB_1']);

  const handleStartLevel = useCallback((level: number) => {
    setSelectedLevel(level);
    setCurrentView('GAME');
  }, []);

  // Stable identity so GameContainer's effect doesn't tear down and rebuild the Phaser game.
  const handleReturnToHub = useCallback((earnedStars: number) => {
    if (earnedStars > 0) {
      setStars(prev => prev + earnedStars);
    }
    setCurrentView('DASHBOARD');
  }, []);

  return (
    <>
      {currentView === 'DASHBOARD' && (
        <Dashboard 
          stars={stars} 
          unlockedCards={unlockedCards}
          audioSettings={audioSettings}
          onAudioSettingsChange={setAudioSettings}
          onStartLevel={handleStartLevel} 
        />
      )}
      {currentView === 'GAME' && (
        <GameContainer 
          level={selectedLevel}
          unlockedCards={unlockedCards}
          audioSettings={audioSettings}
          onReturnToHub={handleReturnToHub} 
        />
      )}
    </>
  );
}

export default App;
