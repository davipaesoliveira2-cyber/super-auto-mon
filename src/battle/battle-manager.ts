import { Battle, Dex } from '@pkmn/sim';
import { PokemonInstance } from '../utils/pokemon-generator';

export interface BattleResult {
  winner: string; // 'p1' | 'p2' | 'draw'
  log: string[];
}

// Tabela de Efetividade Básica para IA (1 = Neutro, 2 = Super Efetivo, 0.5 = Resistente, 0 = Imune)
const TYPE_CHART: Record<string, Record<string, number>> = {
  Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Dragon: 0.5 },
  Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2 },
  Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0 },
  Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Rock: 2, Steel: 2 },
  Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
  Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
  Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5 },
  Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5, Steel: 0.5 },
  Dragon: { Dragon: 2, Steel: 0.5 },
  Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Steel: 0.5 },
  Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5 }
};

function getEffectiveness(moveType: string, targetType: string): number {
  if (TYPE_CHART[moveType] && TYPE_CHART[moveType][targetType] !== undefined) {
    return TYPE_CHART[moveType][targetType];
  }
  return 1;
}

export function runBattle(
  team1: (PokemonInstance | null)[],
  team2: (PokemonInstance | null)[],
  name1: string = "Player 1",
  name2: string = "Player 2"
): BattleResult {
  const battle = new Battle({ formatid: 'gen2customgame' as any });

  // Filtrar nulos para a batalha
  const cleanTeam1 = team1.filter((p): p is PokemonInstance => p !== null);
  const cleanTeam2 = team2.filter((p): p is PokemonInstance => p !== null);

  // Se um dos times estiver vazio, o outro vence imediatamente
  if (cleanTeam1.length === 0 && cleanTeam2.length === 0) {
    return { winner: 'draw', log: ['|chat|Ambos os times estão vazios! Empate.'] };
  }
  if (cleanTeam1.length === 0) {
    return { winner: 'p2', log: [`|chat|${name1} não possui Pokémon no time!`] };
  }
  if (cleanTeam2.length === 0) {
    return { winner: 'p1', log: [`|chat|${name2} não possui Pokémon no time!`] };
  }

  // Mapear para o formato do Showdown PokemonSet
  const formattedTeam1 = cleanTeam1.map(p => ({
    name: p.name,
    species: p.species,
    moves: p.moves,
    level: p.level,
    ivs: p.ivs,
    evs: p.evs,
    ability: p.ability,
    item: p.item || '',
    nature: p.nature,
    gender: p.gender === 'N' ? '' : p.gender
  }));

  const formattedTeam2 = cleanTeam2.map(p => ({
    name: p.name,
    species: p.species,
    moves: p.moves,
    level: p.level,
    ivs: p.ivs,
    evs: p.evs,
    ability: p.ability,
    item: p.item || '',
    nature: p.nature,
    gender: p.gender === 'N' ? '' : p.gender
  }));

  battle.setPlayer('p1', { name: name1, team: formattedTeam1 });
  battle.setPlayer('p2', { name: name2, team: formattedTeam2 });

  let loops = 0;
  while (!battle.ended && loops < 2000) {
    loops++;
    
    // Processar escolha para o p1 se necessário
    if ((battle.p1 as any).activeRequest && !(battle.p1 as any).isChoiceDone()) {
      const request = (battle.p1 as any).activeRequest;
      if (request) {
        if (request.forceSwitch) {
          // Escolher próximo Pokémon saudável no time
          const switchIndex = findNextSwitchIndex(battle.p1);
          if (switchIndex !== -1) {
            battle.choose('p1', `switch ${switchIndex}`);
          } else {
            battle.choose('p1', 'default');
          }
        } else if ((request as any).active) {
          // IA simples escolhe o melhor golpe
          const bestMove = chooseBestMove(battle, 'p1');
          battle.choose('p1', `move ${bestMove}`);
        } else {
          battle.choose('p1', 'default');
        }
      }
    }

    // Processar escolha para o p2 se necessário
    if ((battle.p2 as any).activeRequest && !(battle.p2 as any).isChoiceDone()) {
      const request = (battle.p2 as any).activeRequest;
      if (request) {
        if (request.forceSwitch) {
          const switchIndex = findNextSwitchIndex(battle.p2);
          if (switchIndex !== -1) {
            battle.choose('p2', `switch ${switchIndex}`);
          } else {
            battle.choose('p2', 'default');
          }
        } else if ((request as any).active) {
          const bestMove = chooseBestMove(battle, 'p2');
          battle.choose('p2', `move ${bestMove}`);
        } else {
          battle.choose('p2', 'default');
        }
      }
    }
  }

  let winner: string;
  if (battle.winner === name1) {
    winner = 'p1';
  } else if (battle.winner === name2) {
    winner = 'p2';
  } else {
    const remaining1 = (battle.p1 as any).pokemon.filter((p: any) => p.hp > 0).length;
    const remaining2 = (battle.p2 as any).pokemon.filter((p: any) => p.hp > 0).length;
    if (remaining1 > remaining2) {
      winner = 'p1';
    } else if (remaining2 > remaining1) {
      winner = 'p2';
    } else {
      winner = 'draw';
    }
  }

  return {
    winner,
    log: battle.log
  };
}

// Encontra o próximo Pokémon saudável no banco
function findNextSwitchIndex(side: any): number {
  const team = side.pokemon;
  for (let i = 1; i < team.length; i++) {
    if (!team[i].fainted) {
      return i + 1; // 1-based index do Showdown para troca
    }
  }
  return -1;
}

// IA simples de cálculo de dano e seleção do melhor golpe
function chooseBestMove(battle: Battle, playerId: 'p1' | 'p2'): string {
  const side = playerId === 'p1' ? battle.p1 : battle.p2;
  const activePokemon = side.active[0];
  if (!activePokemon) return '1';

  const opponentSide = playerId === 'p1' ? battle.p2 : battle.p1;
  const opponentPokemon = opponentSide.active[0];
  if (!opponentPokemon) return '1';

  const moves = activePokemon.moveSlots;
  if (!moves || moves.length === 0) return '1';

  let bestMoveIndex = 1;
  let highestScore = -9999;

  for (let i = 0; i < moves.length; i++) {
    const moveSlot = moves[i];
    if (moveSlot.disabled) continue;

    const moveData = Dex.moves.get(moveSlot.id);
    let score = 0;

    // Fake Out só funciona no primeiro turno após entrar em campo
    if (moveData.id === 'fakeout') {
      const activeTurns = (activePokemon as any).activeTurns;
      if (activeTurns !== undefined && activeTurns > 0) {
        score = -9999;
        continue;
      }
    }

    // Golpes que dão dano direto
    if (moveData.category !== 'Status') {
      const basePower = moveData.basePower || 40;
      
      // Cálculo básico de efetividade de tipo
      let effectiveness = 1;
      if (opponentPokemon.types) {
        for (const type of opponentPokemon.types) {
          effectiveness *= getEffectiveness(moveData.type, type);
        }
      }
      
      // STAB (Same Type Attack Bonus)
      const isSTAB = activePokemon.types.includes(moveData.type);
      const stabMult = isSTAB ? 1.5 : 1;

      score = basePower * effectiveness * stabMult;
    } else {
      // Golpes de status úteis
      if (moveData.id === 'spore' || moveData.id === 'sleeppowder' || moveData.id === 'thunderwave' || moveData.id === 'glare') {
        score = 80;
      } else if (moveData.id === 'swordsdance' || moveData.id === 'dragondance') {
        score = 75;
      } else {
        score = 25;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMoveIndex = i + 1;
    }
  }

  return bestMoveIndex.toString();
}
