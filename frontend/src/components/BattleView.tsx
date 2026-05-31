import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Swords, FastForward, SkipForward, ArrowLeft, Shield, Flame } from 'lucide-react';

interface ActiveFighter {
  name: string;
  species: string;
  maxHp: number;
  currentHp: number;
  gender: string;
  level: number;
}

type SpeedOption = '1x' | '2x' | '4x' | '8x' | '16x';

export const BattleView: React.FC = () => {
  const { battleResult, closeBattle } = useGameStore();

  const [logIndex, setLogIndex] = useState(0);
  const [speedOption, setSpeedOption] = useState<SpeedOption>('1x');
  const [isPlaying, setIsPlaying] = useState(true);
  const [battleFinished, setBattleFinished] = useState(false);

  // Histórico de mensagens detalhadas de combate
  const [combatLogs, setCombatLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Estados dos lutadores ativos
  const [p1Active, setP1Active] = useState<ActiveFighter | null>(null);
  const [p2Active, setP2Active] = useState<ActiveFighter | null>(null);
  const [actionText, setActionText] = useState('A batalha vai começar...');
  
  // Efeitos de animação
  const [p1Anim, setP1Anim] = useState<'idle' | 'attack' | 'hit' | 'faint'>('idle');
  const [p2Anim, setP2Anim] = useState<'idle' | 'attack' | 'hit' | 'faint'>('idle');

  const timerRef = useRef<any>(null);
  const animTimerRef = useRef<any>(null);

  const getSpeedMs = (opt: SpeedOption) => {
    switch (opt) {
      case '1x': return 1400;
      case '2x': return 750;
      case '4x': return 350;
      case '8x': return 120;
      case '16x': return 40;
    }
  };

  useEffect(() => {
    if (!battleResult) return;

    // Resetar estados
    setLogIndex(0);
    setP1Active(null);
    setP2Active(null);
    setActionText('Batalha iniciada!');
    setCombatLogs(['🏁 O combate foi iniciado!']);
    setIsPlaying(true);
    setBattleFinished(false);
    setP1Anim('idle');
    setP2Anim('idle');

    // Pré-escaneia o log para encontrar os switches iniciais
    // (evita "Aguardando..." desnecessário no começo e em velocidades altas)
    const findFirstSwitch = (logLines: string[], prefix: string): ActiveFighter | null => {
      for (const line of logLines) {
        const p = line.split('|');
        if ((p[1] === 'switch' || p[1] === 'drag') && p[2]?.startsWith(prefix)) {
          const n = p[2].split(': ')[1] || p[3]?.split(', ')[0] || '';
          const dets = (p[3] || '').split(', ');
          const sp = (dets[0] || '').toLowerCase();
          let lv = 30, gd = 'M' as 'M' | 'F';
          for (const d of dets) {
            if (d.startsWith('L')) lv = parseInt(d.substring(1), 10);
            if (d === 'M' || d === 'F') gd = d;
          }
          const hp = (p[4] || '0/0').split('/');
          return { name: n, species: sp, maxHp: parseInt(hp[1], 10) || 100, currentHp: parseInt(hp[0], 10) || 1, gender: gd, level: lv };
        }
      }
      return null;
    };
    const p1 = findFirstSwitch(battleResult.log, 'p1');
    const p2 = findFirstSwitch(battleResult.log, 'p2');
    if (p1) setP1Active(p1);
    if (p2) setP2Active(p2);
  }, [battleResult]);

  // Autoscroll para o painel de log detalhado
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [combatLogs]);

  const findFighterFromLog = useCallback((logLines: string[], prefix: string): ActiveFighter | null => {
    let last: ActiveFighter | null = null;
    for (const line of logLines) {
      const p = line.split('|');
      if ((p[1] === 'switch' || p[1] === 'drag') && p[2]?.startsWith(prefix)) {
        const n = p[2].split(': ')[1] || p[3]?.split(', ')[0] || '';
        const dets = (p[3] || '').split(', ');
        const sp = (dets[0] || '').toLowerCase();
        let lv = 30, gd = 'M' as 'M' | 'F';
        for (const d of dets) {
          if (d.startsWith('L')) lv = parseInt(d.substring(1), 10);
          if (d === 'M' || d === 'F') gd = d;
        }
        const hp = (p[4] || '0/0').split('/');
        last = { name: n, species: sp, maxHp: parseInt(hp[1], 10) || 100, currentHp: parseInt(hp[0], 10) || 1, gender: gd, level: lv };
      }
    }
    return last;
  }, []);

  // Marca o fim da batalha quando o log termina
  const finishBattle = useCallback(() => {
    if (!battleResult) return;

    // Varredura final de segurança: se algum fighter ficou null, tenta extrair do log
    setP1Active(prev => prev || findFighterFromLog(battleResult.log, 'p1'));
    setP2Active(prev => prev || findFighterFromLog(battleResult.log, 'p2'));

    const endText = battleResult.winner === 'p1'
      ? '🏆 Você venceu a rodada!'
      : battleResult.winner === 'p2'
      ? '💀 O oponente venceu a rodada.'
      : '🤝 A partida terminou em empate!';
    
    setActionText(endText);
    setCombatLogs(prev => {
      if (prev[prev.length - 1] !== endText) {
        return [...prev, endText];
      }
      return prev;
    });
    setIsPlaying(false);
    setBattleFinished(true);
  }, [battleResult, findFighterFromLog]);

  // Player principal da batalha
  useEffect(() => {
    const result = battleResult;
    const speedMs = getSpeedMs(speedOption);
    
    if (!result) return;

    if (!isPlaying || logIndex >= result.log.length) {
      if (logIndex >= result.log.length && !battleFinished) {
        finishBattle();
      }
      return;
    }

    timerRef.current = setTimeout(() => {
      processNextLogLine();
    }, speedMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, logIndex, speedOption, battleResult, battleFinished, finishBattle]);

  const processNextLogLine = () => {
    try {
    if (!battleResult) return;
    const line = battleResult.log[logIndex];
    if (!line) {
      setLogIndex(prev => prev + 1);
      return;
    }

    const parts = line.split('|');
    const cmd = parts[1];

    // Velocidade do timer de animação (metade do speedMs, mínimo 30ms)
    const animDuration = Math.max(30, getSpeedMs(speedOption) / 2);

    switch (cmd) {
      case 'switch':
      case 'drag': {
        // Formato: |switch|p1a: Bulbasaur|Bulbasaur, L30, M|76/76
        const isP1 = parts[2].startsWith('p1');
        const name = parts[2].split(': ')[1] || parts[3].split(', ')[0];
        const details = parts[3].split(', ');
        const species = details[0].toLowerCase();
        
        let level = 30;
        let gender = 'M';
        for (const detail of details) {
          if (detail.startsWith('L')) level = parseInt(detail.substring(1), 10);
          if (detail === 'M' || detail === 'F') gender = detail;
        }

        const hpParts = parts[4].split('/');
        const currentHp = parseInt(hpParts[0], 10);
        const maxHp = parseInt(hpParts[1], 10);

        const fighter: ActiveFighter = { name, species, maxHp, currentHp, gender, level };

        if (isP1) {
          setP1Active(fighter);
          setP1Anim('idle');
          setActionText(`${name} entrou em campo!`);
          setCombatLogs(prev => [...prev, `🟢 [Seu Time] **${name}** (Lv ${level}) entrou em campo! [HP: ${currentHp}/${maxHp}]`]);
        } else {
          setP2Active(fighter);
          setP2Anim('idle');
          setActionText(`${name} adversário entrou em campo!`);
          setCombatLogs(prev => [...prev, `🔴 [Oponente] **${name}** (Lv ${level}) entrou em campo! [HP: ${currentHp}/${maxHp}]`]);
        }
        break;
      }

      case 'move': {
        // Formato: |move|p1a: Bulbasaur|Tackle|p2a: Charmander
        const isP1 = parts[2].startsWith('p1');
        const attackerName = parts[2].split(': ')[1];
        const moveName = parts[3];

        setActionText(`${attackerName} usou ${moveName}!`);
        setCombatLogs(prev => [...prev, `⚔️ **${attackerName}** usou **${moveName}**!`]);

        if (isP1) {
          setP1Anim('attack');
          setP2Anim('hit');
        } else {
          setP2Anim('attack');
          setP1Anim('hit');
        }
        
        if (animTimerRef.current) clearTimeout(animTimerRef.current);
        animTimerRef.current = setTimeout(() => {
          setP1Anim('idle');
          setP2Anim('idle');
        }, animDuration);
        break;
      }

      case '-damage': {
        // Formato: |-damage|p2a: Charmander|61/72
        const isP1 = parts[2].startsWith('p1');
        const pokemonName = parts[2].split(': ')[1];
        const hpString = parts[3].split(' ')[0];
        
        if (hpString === '0' || hpString === '0 fnt') {
          // Pokémon fainted from damage
          if (isP1) {
            setP1Active(prev => prev ? { ...prev, currentHp: 0 } : null);
          } else {
            setP2Active(prev => prev ? { ...prev, currentHp: 0 } : null);
          }
          setCombatLogs(prev => [...prev, `💥 **${pokemonName}** sofreu dano fatal! (HP: 0)`]);
        } else {
          const hpParts = hpString.split('/');
          if (hpParts.length === 2) {
            const currentHp = parseInt(hpParts[0], 10);
            const maxHp = parseInt(hpParts[1], 10);

            if (isP1) {
              setP1Active(prev => prev ? { ...prev, currentHp, maxHp } : null);
            } else {
              setP2Active(prev => prev ? { ...prev, currentHp, maxHp } : null);
            }
            setCombatLogs(prev => [...prev, `💥 **${pokemonName}** sofreu dano! (HP: ${currentHp}/${maxHp})`]);
          }
        }
        break;
      }

      case '-heal': {
        const isP1 = parts[2].startsWith('p1');
        const pokemonName = parts[2].split(': ')[1];
        const hpString = parts[3].split(' ')[0];
        const hpParts = hpString.split('/');
        
        if (hpParts.length === 2) {
          const currentHp = parseInt(hpParts[0], 10);
          const maxHp = parseInt(hpParts[1], 10);

          if (isP1) {
            setP1Active(prev => prev ? { ...prev, currentHp, maxHp } : null);
          } else {
            setP2Active(prev => prev ? { ...prev, currentHp, maxHp } : null);
          }
          setCombatLogs(prev => [...prev, `💖 **${pokemonName}** recuperou HP! (HP: ${currentHp}/${maxHp})`]);
        }
        break;
      }

      case '-supereffective': {
        setCombatLogs(prev => [...prev, `🔥 Foi super efetivo!`]);
        setActionText(prev => prev + ' Super efetivo!');
        break;
      }

      case '-resisted': {
        setCombatLogs(prev => [...prev, `🛡️ Não foi muito efetivo...`]);
        break;
      }

      case '-immune': {
        const pokemonName = parts[2]?.split(': ')[1] || '???';
        setCombatLogs(prev => [...prev, `❌ **${pokemonName}** é imune ao ataque!`]);
        break;
      }

      case '-crit': {
        setCombatLogs(prev => [...prev, `💎 Golpe crítico!`]);
        break;
      }

      case '-miss': {
        const pokemonName = parts[2]?.split(': ')[1] || '???';
        setCombatLogs(prev => [...prev, `💨 O ataque errou **${pokemonName}**!`]);
        break;
      }

      case '-status': {
        const pokemonName = parts[2]?.split(': ')[1] || '???';
        const status = parts[3];
        const statusNames: Record<string, string> = {
          'brn': 'queimado', 'par': 'paralisado', 'slp': 'adormecido',
          'frz': 'congelado', 'psn': 'envenenado', 'tox': 'gravemente envenenado'
        };
        setCombatLogs(prev => [...prev, `🔮 **${pokemonName}** foi ${statusNames[status] || status}!`]);
        break;
      }

      case '-curestatus': {
        const pokemonName = parts[2]?.split(': ')[1] || '???';
        setCombatLogs(prev => [...prev, `✨ **${pokemonName}** se curou da condição de status!`]);
        break;
      }

      case '-boost': {
        const pokemonName = parts[2]?.split(': ')[1] || '???';
        const stat = parts[3];
        const statNames: Record<string, string> = {
          'atk': 'Ataque', 'def': 'Defesa', 'spa': 'Atq. Especial',
          'spd': 'Def. Especial', 'spe': 'Velocidade', 'accuracy': 'Precisão', 'evasion': 'Evasão'
        };
        setCombatLogs(prev => [...prev, `⬆️ **${pokemonName}** teve ${statNames[stat] || stat} aumentado!`]);
        break;
      }

      case '-unboost': {
        const pokemonName = parts[2]?.split(': ')[1] || '???';
        const stat = parts[3];
        const statNames: Record<string, string> = {
          'atk': 'Ataque', 'def': 'Defesa', 'spa': 'Atq. Especial',
          'spd': 'Def. Especial', 'spe': 'Velocidade', 'accuracy': 'Precisão', 'evasion': 'Evasão'
        };
        setCombatLogs(prev => [...prev, `⬇️ **${pokemonName}** teve ${statNames[stat] || stat} reduzido!`]);
        break;
      }

      case 'faint': {
        // Formato: |faint|p1a: Bulbasaur
        const isP1 = parts[2].startsWith('p1');
        const pokemonName = parts[2].split(': ')[1];

        if (isP1) {
          setP1Anim('faint');
          setActionText(`${pokemonName} desmaiou!`);
          setCombatLogs(prev => [...prev, `💀 **${pokemonName}** desmaiou!`]);
          // Não usar setTimeout para evitar race condition com switch
          // O próximo switch irá substituir o p1Active de qualquer forma
        } else {
          setP2Anim('faint');
          setActionText(`${pokemonName} desmaiou!`);
          setCombatLogs(prev => [...prev, `💀 **${pokemonName}** desmaiou!`]);
        }
        break;
      }

      case 'cant': {
        const pokemonName = parts[2].split(': ')[1];
        const reasonMap: Record<string, string> = {
          'slp': 'está dormindo', 'par': 'está paralisado', 'frz': 'está congelado',
          'flinch': 'recuou de medo'
        };
        const reason = reasonMap[parts[3]] || 'não pôde mover';
        setActionText(`${pokemonName} ${reason}!`);
        setCombatLogs(prev => [...prev, `🚫 **${pokemonName}** não pôde atacar: ${reason}!`]);
        break;
      }

      case 'turn': {
        const turnNum = parts[2];
        setCombatLogs(prev => [...prev, `── Turno ${turnNum} ──`]);
        break;
      }

      default:
        break;
    }

    setLogIndex(prev => prev + 1);
    } catch (err) {
      console.error('Erro ao processar linha de batalha:', err, battleResult?.log[logIndex]);
      setLogIndex(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    setIsPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    
    const result = battleResult;
    if (result) {
      setLogIndex(result.log.length);
      
      const endMsg = result.winner === 'p1'
        ? '🏆 Batalha Pulada! Você venceu!'
        : result.winner === 'p2'
        ? '💀 Batalha Pulada! O oponente venceu.'
        : '🤝 Batalha Pulada! Empate!';

      setCombatLogs(prev => [...prev, '⚡ Batalha pulada pelo jogador.', endMsg]);
      setActionText(endMsg);
      setBattleFinished(true);
    }
  };

  const handleSpeedToggle = () => {
    setSpeedOption(prev => {
      if (prev === '1x') return '2x';
      if (prev === '2x') return '4x';
      if (prev === '4x') return '8x';
      if (prev === '8x') return '16x';
      return '1x';
    });
  };

  const getHpPercent = (fighter: ActiveFighter) => {
    return Math.max(0, (fighter.currentHp / fighter.maxHp) * 100);
  };

  const getSpriteUrl = (species: string) => {
    return `https://play.pokemonshowdown.com/sprites/ani/${species}.gif`;
  };

  const getFallbackUrl = (species: string) => {
    return `https://img.pokemondb.net/sprites/black-white/normal/${species}.png`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 p-6 select-none justify-between">
      {/* Top Header */}
      <div className="flex justify-between items-center bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 mb-4">
        <button
          onClick={() => { if (battleFinished) closeBattle(); }}
          className={`flex items-center space-x-2 font-bold transition-colors duration-300 ${
            battleFinished ? 'text-slate-400 hover:text-white cursor-pointer' : 'text-slate-700 cursor-not-allowed'
          }`}
          disabled={!battleFinished}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar para Loja</span>
        </button>

        <div className="flex items-center space-x-2 text-white font-bold bg-pokemon-red/10 border border-pokemon-red/30 px-4 py-2 rounded-full">
          <Swords className="w-5 h-5 text-pokemon-red fill-pokemon-red" />
          <span className="uppercase tracking-wider text-sm">
            {battleResult?.opponentName ? `VS ${battleResult.opponentName}` : 'Combate Automático'}
          </span>
        </div>

        {/* Speed and Control */}
        <div className="flex space-x-2">
          <button
            onClick={handleSpeedToggle}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl border border-slate-700 font-bold transition-all text-xs"
          >
            <FastForward className="w-4 h-4" />
            <span>Velocidade: {speedOption}</span>
          </button>

          <button
            onClick={handleSkip}
            disabled={battleFinished}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-2 rounded-xl border border-slate-700 font-bold transition-all text-xs"
          >
            <SkipForward className="w-4 h-4" />
            <span>Pular</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Arena on Left, Log Panel on Right */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 my-4 items-stretch">
        
        {/* Left Section (Fighters) */}
        <div className="lg:col-span-3 flex flex-col justify-center items-center relative overflow-hidden bg-slate-900/30 border border-slate-900 rounded-3xl p-6 min-h-[400px]">
          {/* Battle Arena Background Design Elements */}
          <div className="absolute inset-0 bg-radial-gradient from-transparent to-slate-950 opacity-60"></div>
          <div className="absolute w-[300px] h-[300px] rounded-full bg-pokemon-red/5 blur-[120px] top-1/2 left-1/4 -translate-y-1/2"></div>
          <div className="absolute w-[300px] h-[300px] rounded-full bg-pokemon-blue/5 blur-[120px] top-1/2 right-1/4 -translate-y-1/2"></div>

          <div className="w-full max-w-3xl grid grid-cols-2 gap-16 relative z-10">
            {/* Left Fighter: Player (p1) */}
            <div className="flex flex-col items-center justify-end min-h-[260px]">
              {p1Active ? (
                <div className="w-full flex flex-col items-center">
                  
                  {/* Nome do Treinador */}
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1.5">
                    Sua Equipe
                  </div>

                  {/* Status Bar */}
                  <div className="w-full max-w-[220px] bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 shadow-xl mb-4 transform hover:scale-102 transition-all">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-extrabold text-sm text-white capitalize leading-none">{p1Active.name}</span>
                      <span className="text-[9px] text-pokemon-yellow font-bold uppercase">Nv {p1Active.level}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          getHpPercent(p1Active) > 50
                            ? 'bg-emerald-500'
                            : getHpPercent(p1Active) > 20
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${getHpPercent(p1Active)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-end text-[8px] text-slate-500 mt-0.5 font-bold">
                      {p1Active.currentHp} / {p1Active.maxHp} HP
                    </div>
                  </div>

                  {/* Animated Sprite - FRONT SPRITE flipped horizontally to face right */}
                  <div className={`relative min-h-[120px] flex items-center justify-center transition-all duration-300 ${
                    p1Anim === 'attack'
                      ? 'translate-x-12 scale-110'
                      : p1Anim === 'hit'
                      ? 'animate-shake bg-red-500/10 rounded-full'
                      : p1Anim === 'faint'
                      ? 'translate-y-12 opacity-0'
                      : 'translate-x-0'
                  }`}>
                    <img
                      src={getSpriteUrl(p1Active.species)}
                      alt={p1Active.name}
                      className="w-24 h-24 object-contain"
                      style={{ transform: 'scaleX(-1)' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getFallbackUrl(p1Active.species);
                        (e.target as HTMLImageElement).style.transform = 'scaleX(-1)';
                      }}
                    />
                    {/* Base platform shadow */}
                    <div className="absolute -bottom-2 w-20 h-3 bg-black/40 blur-sm rounded-full -z-10"></div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[120px]">
                  <div className="w-16 h-16 rounded-full bg-slate-900/60 border border-slate-800/60 flex items-center justify-center mb-2">
                    <Shield className="w-6 h-6 text-slate-700" />
                  </div>
                  <div className="text-slate-700 font-bold uppercase text-xs tracking-wider">Aguardando...</div>
                </div>
              )}
            </div>

            {/* Right Fighter: Opponent (p2) */}
            <div className="flex flex-col items-center justify-end min-h-[260px]">
              {p2Active ? (
                <div className="w-full flex flex-col items-center">
                  
                  {/* Nome do Treinador Inimigo */}
                  <div className="text-[10px] text-pokemon-red font-black uppercase tracking-widest mb-1.5">
                    Equipe de {battleResult?.opponentName || 'Oponente'}
                  </div>

                  {/* Status Bar */}
                  <div className="w-full max-w-[220px] bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 shadow-xl mb-4 transform hover:scale-102 transition-all">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-extrabold text-sm text-white capitalize leading-none">{p2Active.name}</span>
                      <span className="text-[9px] text-pokemon-yellow font-bold uppercase">Nv {p2Active.level}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          getHpPercent(p2Active) > 50
                            ? 'bg-emerald-500'
                            : getHpPercent(p2Active) > 20
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${getHpPercent(p2Active)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-end text-[8px] text-slate-500 mt-0.5 font-bold">
                      {p2Active.currentHp} / {p2Active.maxHp} HP
                    </div>
                  </div>

                  {/* Animated Sprite - FRONT SPRITE naturally faces left */}
                  <div className={`relative min-h-[120px] flex items-center justify-center transition-all duration-300 ${
                    p2Anim === 'attack'
                      ? '-translate-x-12 scale-110'
                      : p2Anim === 'hit'
                      ? 'animate-shake bg-red-500/10 rounded-full'
                      : p2Anim === 'faint'
                      ? 'translate-y-12 opacity-0'
                      : 'translate-x-0'
                  }`}>
                    <img
                      src={getSpriteUrl(p2Active.species)}
                      alt={p2Active.name}
                      className="w-24 h-24 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getFallbackUrl(p2Active.species);
                      }}
                    />
                    {/* Base platform shadow */}
                    <div className="absolute -bottom-2 w-20 h-3 bg-black/40 blur-sm rounded-full -z-10"></div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[120px]">
                  <div className="w-16 h-16 rounded-full bg-slate-900/60 border border-slate-800/60 flex items-center justify-center mb-2">
                    <Flame className="w-6 h-6 text-slate-700" />
                  </div>
                  <div className="text-slate-700 font-bold uppercase text-xs tracking-wider">Aguardando...</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section (Combat Log Panel) */}
        <div className="glass border border-slate-900 rounded-3xl p-4 flex flex-col min-h-[350px] max-h-[480px]">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2 mb-3">
            Histórico Detalhado
          </h3>
          
          <div 
            ref={scrollRef} 
            className="flex-1 overflow-y-auto pr-1 space-y-2 text-xs font-semibold text-slate-300"
          >
            {combatLogs.map((logMsg, i) => (
              <div 
                key={i} 
                className={`p-2 rounded-xl leading-relaxed transform transition-all ${
                  logMsg.startsWith('──')
                    ? 'bg-slate-800/40 border border-slate-700/40 text-center text-[10px] text-slate-500 font-black uppercase tracking-widest'
                    : 'bg-slate-950/60 border border-slate-900/60'
                }`}
                dangerouslySetInnerHTML={{
                  __html: logMsg
                    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white">$1</strong>')
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Narrative Event Banner */}
      <div className="bg-slate-900/60 border border-slate-850 backdrop-blur-md rounded-2xl p-6 text-center max-w-2xl mx-auto w-full shadow-2xl relative">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-pokemon-red text-[10px] font-black tracking-widest text-white uppercase px-3 py-1 rounded-full shadow">
          Narrativa de Combate
        </div>
        <p className="text-lg font-bold text-slate-100 tracking-wide">{actionText}</p>
      </div>

      {/* Premium End of Battle Modal Overlay Popup */}
      {battleFinished && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="glass border border-slate-800/80 rounded-3xl p-8 max-w-md w-full text-center relative shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            
            {/* PokeBall glowing badge */}
            <div className="absolute inset-x-0 -top-12 flex justify-center">
              <div className="bg-slate-950 p-4 rounded-full border border-slate-800 shadow-2xl">
                <img
                  src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"
                  alt="Pokeball"
                  className="w-16 h-16 drop-shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-pulse"
                />
              </div>
            </div>

            <div className="mt-8">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Resultado do Combate
              </span>
              
              <h3 className={`text-4xl font-black uppercase tracking-wider mt-2 mb-4 drop-shadow-md ${
                battleResult?.winner === 'p1' 
                  ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]' 
                  : battleResult?.winner === 'p2' 
                  ? 'text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]' 
                  : 'text-slate-400'
              }`}>
                {battleResult?.winner === 'p1' ? 'Vitória!' : battleResult?.winner === 'p2' ? 'Derrota' : 'Empate'}
              </h3>

              <p className="text-slate-300 font-medium text-sm leading-relaxed mb-6">
                {battleResult?.winner === 'p1' 
                  ? `Excelente! Você superou a equipe de ${battleResult?.opponentName || 'Treinador'} nesta rodada.` 
                  : battleResult?.winner === 'p2' 
                  ? `Seu time foi derrotado pela equipe de ${battleResult?.opponentName || 'Treinador'}.` 
                  : `Foi um empate incrível contra a equipe de ${battleResult?.opponentName || 'Treinador'}!`
                }
              </p>

              {/* Opponent Team Lineup Preview */}
              {battleResult?.opponentTeam && (
                <div className="mb-8 bg-slate-950/40 p-4 rounded-2xl border border-slate-900/60">
                  <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-3">
                    Equipe Enfrentada ({battleResult?.opponentName || 'Oponente'})
                  </div>
                  <div className="flex justify-center space-x-2 overflow-x-auto py-1">
                    {battleResult.opponentTeam.map((poke, index) => poke && (
                      <div key={index} className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 flex items-center justify-center shadow" title={poke.name}>
                        <img
                          src={getSpriteUrl(poke.species)}
                          alt={poke.name}
                          className="w-10 h-10 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getFallbackUrl(poke.species);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={closeBattle}
                className="w-full bg-pokemon-yellow text-slate-950 font-black py-4 px-8 rounded-2xl uppercase tracking-wider shadow-lg hover:shadow-yellow-500/20 hover:scale-102 transform active:scale-95 transition-all duration-300 text-sm"
              >
                Ir para a Próxima Rodada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
