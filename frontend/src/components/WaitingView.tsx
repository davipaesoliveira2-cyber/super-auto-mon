import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Clock, ArrowLeft, Swords, Shield, User } from 'lucide-react';

export const WaitingView: React.FC = () => {
  const { waitingRound, showWaitingChoice, waitingTimeoutMs, cancelWaiting, fightChoice } = useGameStore();
  const [countdownMs, setCountdownMs] = useState(0);

  useEffect(() => {
    setCountdownMs(waitingTimeoutMs);
  }, [waitingTimeoutMs]);

  useEffect(() => {
    if (countdownMs <= 0) return;
    const interval = setInterval(() => {
      setCountdownMs(prev => Math.max(0, prev - 100));
    }, 100);
    return () => clearInterval(interval);
  }, [countdownMs]);

  const seconds = Math.ceil(countdownMs / 1000);

  if (showWaitingChoice) {
    return (
      <div className="flex flex-col min-h-screen pokemon-bg items-center justify-center p-6 select-none">
        <div className="pokemon-card rounded-3xl p-8 max-w-md w-full text-center">
          <Shield className="w-12 h-12 text-pokemon-yellow mx-auto mb-3" />
          <h2 className="text-xl font-black uppercase tracking-wider text-white mb-1">
            Nenhum Oponente Encontrado
          </h2>
          <p className="text-slate-400 text-xs mb-6">
            Ninguém entrou na Rodada {waitingRound}. Escolha como prosseguir:
          </p>

          <div className="mb-4">
            <div className="text-3xl font-black text-pokemon-yellow tabular-nums">
              {seconds}s
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="bg-pokemon-yellow h-full rounded-full transition-all duration-100"
                style={{ width: `${waitingTimeoutMs > 0 ? (countdownMs / waitingTimeoutMs) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => fightChoice('ai')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-pokemon-blue/10 border border-pokemon-blue/30 hover:bg-pokemon-blue/20 text-left transition"
            >
              <Swords className="w-5 h-5 text-pokemon-blue shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">Lutar contra IA</div>
                <div className="text-[10px] text-slate-400">Um time gerado automaticamente</div>
              </div>
            </button>

            <button
              onClick={() => fightChoice('ghost')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-left transition"
            >
              <User className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">Lutar contra meu time (Fantasma)</div>
                <div className="text-[10px] text-slate-400">Batalha contra uma cópia do seu próprio time</div>
              </div>
            </button>

            <button
              onClick={() => fightChoice('wait')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 text-left transition"
            >
              <Clock className="w-5 h-5 text-slate-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">Continuar esperando</div>
                <div className="text-[10px] text-slate-400">Mais {Math.ceil(waitingTimeoutMs / 1000)} segundos antes de enfrentar IA</div>
              </div>
            </button>
          </div>

          <button
            onClick={cancelWaiting}
            className="mt-6 flex items-center justify-center space-x-2 mx-auto text-slate-500 hover:text-pokemon-yellow text-xs transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para Loja</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pokemon-bg items-center justify-center p-6 select-none">
      <div className="pokemon-card rounded-3xl p-10 max-w-md w-full text-center">
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

        <p className="text-slate-400 text-sm leading-relaxed mb-4">
          Seu time foi salvo. Quando outro jogador entrar, a batalha começará automaticamente.
        </p>

        <div className="mb-6">
          <div className="text-4xl font-black text-pokemon-yellow tabular-nums">
            {seconds}s
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-2.5 mt-3 overflow-hidden">
            <div
              className="bg-pokemon-yellow h-full rounded-full transition-all duration-100"
              style={{ width: `${waitingTimeoutMs > 0 ? (countdownMs / waitingTimeoutMs) * 100 : 0}%` }}
            />
          </div>
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
