import { Dex } from '@pkmn/sim';
import * as crypto from 'crypto';

export interface PokemonInstance {
  id: string;
  species: string;
  name: string;
  level: number;
  gender: 'M' | 'F' | 'N';
  shiny: boolean;
  nature: string;
  ability: string;
  ivs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  evs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  moves: string[];
  item: string | null;
  copies: number;
}

// Carregar lista de movimentos banidos
const bannedMoves = new Set([
  "teleport",
  "roar",
  "whirlwind",
  "splash",
  "celebrate",
  "holdhands",
  "uturn",
  "voltswitch",
  "batonpass",
  "selfdestruct",
  "explosion",
  "memento",
  "healingwish",
  "lunardance",
  "finalgambit"
]);

export async function generatePokemon(speciesId: string, level: number = 30): Promise<PokemonInstance> {
  const species = Dex.species.get(speciesId);
  if (!species.exists) {
    throw new Error(`Species ${speciesId} does not exist in Dex.`);
  }

  // 1. IVs (0 - 31)
  const ivs = {
    hp: Math.floor(Math.random() * 32),
    atk: Math.floor(Math.random() * 32),
    def: Math.floor(Math.random() * 32),
    spa: Math.floor(Math.random() * 32),
    spd: Math.floor(Math.random() * 32),
    spe: Math.floor(Math.random() * 32)
  };

  // 2. EVs (Sorteados de forma que o total seja no máximo 510, e cada stat no máximo 252)
  // Distribuição aleatória simples: sorteia parcelas e acumula até atingir o limite
  const evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  let remainingEVs = 510;
  const stats: (keyof typeof evs)[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
  while (remainingEVs > 0) {
    const stat = stats[Math.floor(Math.random() * stats.length)];
    if (evs[stat] < 252) {
      const add = Math.min(Math.floor(Math.random() * 30) + 1, 252 - evs[stat], remainingEVs);
      evs[stat] += add;
      remainingEVs -= add;
    } else {
      // Se todos estiverem no limite
      if (stats.every(s => evs[s] === 252)) break;
    }
  }

  // 3. Natureza
  const natures = Dex.natures.all();
  const nature = natures[Math.floor(Math.random() * natures.length)].name;

  // 4. Habilidade
  const abilities = Object.values(species.abilities);
  const ability = abilities[Math.floor(Math.random() * abilities.length)];

  // 5. Sexo
  let gender: 'M' | 'F' | 'N' = 'N';
  if (species.gender === 'M') gender = 'M';
  else if (species.gender === 'F') gender = 'F';
  else if (species.genderRatio) {
    gender = Math.random() < species.genderRatio.M ? 'M' : 'F';
  }

  // 6. Shiny (1 em 100 de chance para o divertimento do auto battler)
  const shiny = Math.random() < 0.01;

  // 7. Sorteio de Golpes válidos da Gen 1 de nível <= level
  const learnsetObj = await Dex.learnsets.get(speciesId);
  const movesPool: string[] = [];

  if (learnsetObj && learnsetObj.learnset) {
    for (const [moveId, sources] of Object.entries(learnsetObj.learnset)) {
      if (bannedMoves.has(moveId)) continue;
      
      // Verifica se o golpe é aprendido na Gen 1 por nível até o nível especificado
      const canLearnInGen1 = sources.some(source => {
        // Formato: 1L[level] (ex: 1L15)
        const match = source.match(/^1L([0-9]+)$/);
        if (match) {
          const learnLevel = parseInt(match[1], 10);
          return learnLevel <= level;
        }
        return false;
      });

      if (canLearnInGen1) {
        movesPool.push(moveId);
      }
    }
  }

  // Se o pool de movimentos estiver muito vazio (improvável, mas segurança), adiciona Tackle
  if (movesPool.length === 0) {
    movesPool.push('tackle');
  }

  // Selecionar 4 movimentos únicos garantindo pelo menos um ofensivo
  let selectedMoves: string[] = [];
  let attempts = 0;
  
  while (attempts < 50) {
    const tempMoves: string[] = [];
    const poolCopy = [...movesPool];
    
    // Sorteia até 4
    const count = Math.min(4, poolCopy.length);
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * poolCopy.length);
      tempMoves.push(poolCopy.splice(idx, 1)[0]);
    }

    // Verifica se possui pelo menos um ofensivo
    const hasOffensive = tempMoves.some(moveId => {
      const move = Dex.moves.get(moveId);
      return move.category !== 'Status' && (move.basePower > 0 || move.damage || move.damageCallback);
    });

    if (hasOffensive || poolCopy.length === 0) {
      selectedMoves = tempMoves;
      break;
    }
    attempts++;
  }

  if (selectedMoves.length === 0) {
    selectedMoves = movesPool.slice(0, 4);
  }

  return {
    id: crypto.randomUUID(),
    species: speciesId,
    name: species.name,
    level,
    gender,
    shiny,
    nature,
    ability,
    ivs,
    evs,
    moves: selectedMoves,
    item: null,
    copies: 1
  };
}

export async function evolvePokemon(target: PokemonInstance, source: PokemonInstance, evolveConfig: Record<string, any>): Promise<PokemonInstance> {
  const currentConfig = evolveConfig[target.species];
  if (!currentConfig || !currentConfig.evolvesInto) {
    // Não evolui mais, apenas soma cópias
    return {
      ...target,
      copies: target.copies + source.copies
    };
  }

  const totalCopies = target.copies + source.copies;
  if (totalCopies >= currentConfig.evolveCopies) {
    // Evolui!
    const nextSpeciesId = currentConfig.evolvesInto;
    const nextSpecies = Dex.species.get(nextSpeciesId);

    // Regenera os golpes baseados na nova espécie
    const level = target.level;
    const learnsetObj = await Dex.learnsets.get(nextSpeciesId);
    const movesPool: string[] = [];

    if (learnsetObj && learnsetObj.learnset) {
      for (const [moveId, sources] of Object.entries(learnsetObj.learnset)) {
        if (bannedMoves.has(moveId)) continue;
        const canLearnInGen1 = sources.some(source => {
          const match = source.match(/^1L([0-9]+)$/);
          if (match) {
            const learnLevel = parseInt(match[1], 10);
            return learnLevel <= level;
          }
          return false;
        });

        if (canLearnInGen1) {
          movesPool.push(moveId);
        }
      }
    }

    if (movesPool.length === 0) {
      movesPool.push('tackle');
    }

    let selectedMoves: string[] = [];
    let attempts = 0;
    while (attempts < 50) {
      const tempMoves: string[] = [];
      const poolCopy = [...movesPool];
      const count = Math.min(4, poolCopy.length);
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * poolCopy.length);
        tempMoves.push(poolCopy.splice(idx, 1)[0]);
      }
      const hasOffensive = tempMoves.some(moveId => {
        const move = Dex.moves.get(moveId);
        return move.category !== 'Status' && (move.basePower > 0 || move.damage || move.damageCallback);
      });
      if (hasOffensive || poolCopy.length === 0) {
        selectedMoves = tempMoves;
        break;
      }
      attempts++;
    }

    if (selectedMoves.length === 0) {
      selectedMoves = movesPool.slice(0, 4);
    }

    return {
      ...target,
      species: nextSpeciesId,
      name: nextSpecies.name,
      moves: selectedMoves,
      copies: totalCopies
    };
  }

  // Não atingiu o limite de cópias para evoluir ainda
  return {
    ...target,
    copies: totalCopies
  };
}
