import React, { useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import { ShopView } from './components/ShopView';
import { BattleView } from './components/BattleView';
import { WaitingView } from './components/WaitingView';

export const App: React.FC = () => {
  const { connectSocket, isBattleActive, isWaitingOpponent } = useGameStore();

  useEffect(() => {
    connectSocket();
  }, [connectSocket]);

  const renderView = () => {
    if (isBattleActive) return <BattleView />;
    if (isWaitingOpponent) return <WaitingView />;
    return <ShopView />;
  };

  return (
    <div className="min-h-screen text-slate-100 bg-slate-950 font-sans selection:bg-pokemon-yellow selection:text-slate-900">
      {renderView()}
    </div>
  );
};

export default App;
