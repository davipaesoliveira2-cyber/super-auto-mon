import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { Clock, ArrowLeft } from 'lucide-react';

export const WaitingView: React.FC = () => {
  const { waitingRound, cancelWaiting } = useGameStore();

  return (
    <div className="flex flex-col min-h-screen pokemon-bg items-center justify-center p-6 select-none">
      <div className="pokemon-card rounded-3xl p-10 max-w-md w-full text-center relative">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <img
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"
              alt="Pokeball"
              className="w-20 h-20 drop-shadow-[0_0_24px_rgba(239,68,68,0.4)] animate-bounce"
            />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-2 bg-black/30 blur-md rounded-full"></div>
          </div>
        </div>

        <Clock className="w-10 h-10 text-pokemon-yellow mx-auto mb-3 animate-pulse" />

        <h2 className="text-2xl font-black uppercase tracking-wider text-white mb-2">
          Aguardando Oponente
        </h2>

        <div className="inline-flex items-center gap-2 bg-pokemon-blue/20 text-pokemon-yellow text-xs font-bold px-3 py-1 rounded-full mb-5 border border-pokemon-yellow/20">
          Rodada {waitingRound}
        </div>

        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          Seu time foi salvo. Quando outro jogador entrar na mesma rodada, a batalha começará automaticamente.
        </p>

        <div className="flex justify-center space-x-1 mb-8">
          <span className="w-3 h-3 bg-pokemon-yellow rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></span>
          <span className="w-3 h-3 bg-pokemon-yellow rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></span>
          <span className="w-3 h-3 bg-pokemon-yellow rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></span>
        </div>

        <button
          onClick={cancelWaiting}
          className="flex items-center justify-center space-x-2 mx-auto text-slate-400 hover:text-pokemon-yellow font-semibold text-sm transition-all duration-300"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Loja</span>
        </button>
      </div>
    </div>
  );
};
