import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export const AuthView: React.FC = () => {
  const { login, register, loading, error, clearError } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (mode === 'login') {
      await login(username, password);
    } else {
      await register(username, password);
    }
  };

  const switchMode = () => {
    clearError();
    setMode(mode === 'login' ? 'register' : 'login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-pokemon-red/10 to-slate-950 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-gradient-to-br from-pokemon-yellow to-pokemon-gold text-slate-900 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 shadow-lg shadow-pokemon-yellow/20">
            <span className="w-2 h-2 rounded-full bg-pokemon-red animate-pulse" />
            Beta - Proof of Concept
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            Super Auto Mon
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Pokémon Auto Battler</p>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-1">
            {mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </h2>
          <p className="text-slate-400 text-xs mb-5">
            {mode === 'login' ? 'Acesse sua conta para continuar.' : 'Registre-se para começar a jogar.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Seu nome de treinador"
                className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pokemon-yellow/50 focus:border-pokemon-yellow transition"
                minLength={3}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha secreta"
                className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pokemon-yellow/50 focus:border-pokemon-yellow transition"
                minLength={4}
                required
              />
            </div>

            {error && (
              <div className="text-pokemon-red text-xs bg-pokemon-red/10 border border-pokemon-red/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-pokemon-yellow to-pokemon-gold text-slate-900 font-bold text-sm rounded-lg hover:brightness-110 disabled:opacity-50 transition-all shadow-lg shadow-pokemon-yellow/20"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  {mode === 'login' ? 'Entrando...' : 'Criando...'}
                </span>
              ) : (
                mode === 'login' ? 'Entrar' : 'Criar Conta'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={switchMode}
              className="text-xs text-pokemon-yellow hover:text-pokemon-gold transition"
            >
              {mode === 'login'
                ? 'Não tem conta? Registre-se'
                : 'Já tem conta? Faça login'}
            </button>
          </div>
        </div>

        <p className="text-center text-slate-600 text-[10px] mt-6 leading-relaxed">
          Super Auto Mon — Proof of Concept. Dados podem ser resetados a qualquer momento.
        </p>
      </div>
    </div>
  );
};
