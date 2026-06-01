import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { X, Trophy, Swords, Skull } from 'lucide-react';

export const MatchHistoryView: React.FC = () => {
  const { matchHistory, toggleHistory } = useGameStore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="pokemon-card rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white">Histórico de Partidas</h2>
          <button
            onClick={toggleHistory}
            className="text-slate-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {matchHistory.length === 0 ? (
            <div className="text-center py-8">
              <Swords className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Nenhuma partida ainda.</p>
              <p className="text-slate-600 text-xs mt-1">Complete uma batalha para vê-la aqui.</p>
            </div>
          ) : (
            matchHistory.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/40 border border-slate-800/60"
              >
                <div className={`p-2 rounded-lg ${
                  m.winner === 'p1' ? 'bg-emerald-500/20' : m.winner === 'draw' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                }`}>
                  {m.winner === 'p1' ? (
                    <Trophy className={`w-4 h-4 ${m.winner === 'p1' ? 'text-emerald-400' : ''}`} />
                  ) : m.winner === 'draw' ? (
                    <Swords className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <Skull className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white capitalize">
                    {m.winner === 'p1' ? 'Vitória' : m.winner === 'draw' ? 'Empate' : 'Derrota'}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    Round {m.round} vs {m.opponentName}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 shrink-0">
                  {new Date(m.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
