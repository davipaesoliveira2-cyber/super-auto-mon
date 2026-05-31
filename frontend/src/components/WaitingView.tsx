import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { Clock, ArrowLeft } from 'lucide-react';

export const WaitingView: React.FC = () => {
  const { waitingRound, cancelWaiting } = useGameStore();

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 items-center justify-center p-6 select-none">
      <div className="glass border border-slate-800/80 rounded-3xl p-10 max-w-md w-full text-center relative shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        {/* Pokeball animada */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <img
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"
              alt="Pokeball"
              className="w-20 h-20 drop-shadow-[0_0_16px_rgba(239,68,68,0.5)] animate-bounce"
            />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-2 bg-black/30 blur-md rounded-full"></div>
          </div>
        </div>

        <Clock className="w-10 h-10 text-pokemon-yellow mx-auto mb-4 animate-pulse" />

        <h2 className="text-2xl font-black uppercase tracking-wider text-white mb-3">
          Aguardando Oponente
        </h2>

        <p className="text-slate-400 font-medium text-sm leading-relaxed mb-2">
          Seu time foi salvo para a Rodada {waitingRound}.
        </p>
        <p className="text-slate-500 text-xs leading-relaxed mb-8">
          Assim que outro jogador entrar na mesma rodada, a batalha começará automaticamente.
          Se ninguém aparecer em 30 segundos, um oponente controlado por IA será gerado.
        </p>

        <div className="flex justify-center space-x-1 mb-8">
          <span className="w-3 h-3 bg-pokemon-yellow rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></span>
          <span className="w-3 h-3 bg-pokemon-yellow rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></span>
          <span className="w-3 h-3 bg-pokemon-yellow rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></span>
        </div>

        <button
          onClick={cancelWaiting}
          className="flex items-center justify-center space-x-2 mx-auto text-slate-400 hover:text-white font-semibold text-sm transition-colors duration-300"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Loja</span>
        </button>
      </div>
    </div>
  );
};
