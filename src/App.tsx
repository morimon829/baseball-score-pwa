import { useState } from 'react';
import { TeamManager } from './components/TeamManager';
import { ScoreSheet } from './components/ScoreSheet';
import { Home } from './components/Home';
import { GameList } from './components/GameList';
import type { Game } from './types';

type View = 'home' | 'teams' | 'game' | 'history';

function App() {
  const [view, setView] = useState<View>('home');
  const [currentGame, setCurrentGame] = useState<Game | null>(null);

  const handleStartGame = (game: Game) => {
    setCurrentGame(game);
    setView('game');
  };

  const navigateHome = () => {
    if (view === 'game' && !confirm('試合を終了してホームに戻りますか？保存されていないデータは失われる可能性があります。')) {
      return;
    }
    setView('home');
    setCurrentGame(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
      {view === 'home' && (
        <Home
          onNavigateTeams={() => setView('teams')}
          onNavigateHistory={() => setView('history')}
          onStartGame={handleStartGame}
        />
      )}

      {view === 'teams' && (
        <TeamManager onBack={() => setView('home')} />
      )}

      {view === 'history' && (
        <GameList
          onSelectGame={handleStartGame}
          onBack={() => setView('home')}
        />
      )}

      {view === 'game' && currentGame && (
        <ScoreSheet
          game={currentGame}
          onSave={() => { }}
          onBack={navigateHome}
        />
      )}
    </div>
  );
}

export default App;
