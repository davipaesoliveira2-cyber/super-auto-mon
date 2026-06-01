import React, { useEffect } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { useGameStore } from './store/useGameStore';
import { ShopView } from './components/ShopView';
import { BattleView } from './components/BattleView';
import { WaitingView } from './components/WaitingView';
import { AuthView } from './components/AuthView';
import { MatchHistoryView } from './components/MatchHistoryView';
import { LogOut, History } from 'lucide-react';

export const App: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const username = useAuthStore((s) => s.username);
  const { connectSocket, disconnectSocket, isBattleActive, isWaitingOpponent, gameState, showHistory, toggleHistory } = useGameStore();

  useEffect(() => {
    if (token) {
      connectSocket();
    } else {
      disconnectSocket();
    }
  }, [token, connectSocket, disconnectSocket]);

  if (!token) return <AuthView />;

  return (
    <div className="min-h-screen text-slate-100 bg-slate-950 font-sans selection:bg-pokemon-yellow selection:text-slate-900">
      {showHistory && <MatchHistoryView />}
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-2 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">Super Auto Mon</span>
          <span className="bg-gradient-to-br from-pokemon-yellow to-pokemon-gold text-[10px] text-slate-900 font-bold px-2 py-0.5 rounded-full">
            BETA
          </span>
        </div>
        <div className="flex items-center gap-3">
          {gameState && (
            <span className="text-xs text-slate-400">
              Rodada {gameState.round}
            </span>
          )}
          <button
            onClick={toggleHistory}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-pokemon-yellow transition"
            title="Histórico"
          >
            <History size={14} />
          </button>
          <span className="text-xs text-slate-500">{username}</span>
          <button
            onClick={logout}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-pokemon-red transition"
            title="Sair"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>
      <div className="pt-10">
        {isBattleActive ? <BattleView /> : isWaitingOpponent ? <WaitingView /> : <ShopView />}
      </div>
    </div>
  );
};

export default App;
