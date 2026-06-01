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

  // 7. Sorteio de Golpes válidos (qualquer geração) de nível <= level
  const learnsetObj = await Dex.learnsets.get(speciesId);
  const movesPool: string[] = [];

  if (learnsetObj && learnsetObj.learnset) {
    for (const [moveId, sources] of Object.entries(learnsetObj.learnset)) {
      if (bannedMoves.has(moveId)) continue;

      const canLearn = sources.some(source => {
        // Formato: [gen]L[level] (ex: 9L1, 8L33, 7L27)
        const match = source.match(/^(\d+)L(\d+)$/);
        if (match) {
          const learnLevel = parseInt(match[2], 10);
          return learnLevel <= level;
        }
        return false;
      });

      if (canLearn) {
        movesPool.push(moveId);
      }
    }
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
    moves: pickMoves(movesPool),
    item: null,
    copies: 1
  };
}

function getEvolutionLine(speciesId: string, evolveConfig: Record<string, any>): string[] {
  const line = [speciesId];
  let current = speciesId;
  while (evolveConfig[current]?.evolvesInto && evolveConfig[current].evolvesInto !== current) {
    current = evolveConfig[current].evolvesInto;
    line.push(current);
  }
  return line;
}

export function isInSameEvolutionLine(a: string, b: string, evolveConfig: Record<string, any>): boolean {
  if (a === b) return true;
  const lineA = getEvolutionLine(a, evolveConfig);
  const lineB = getEvolutionLine(b, evolveConfig);
  return lineA.includes(b) || lineB.includes(a);
}

async function generateMovesForSpecies(speciesId: string, level: number): Promise<string[]> {
  const learnsetObj = await Dex.learnsets.get(speciesId);
  const movesPool: string[] = [];

  if (learnsetObj && learnsetObj.learnset) {
    for (const [moveId, sources] of Object.entries(learnsetObj.learnset)) {
      if (bannedMoves.has(moveId)) continue;
      const canLearn = sources.some(source => {
        const match = source.match(/^(\d+)L(\d+)$/);
        if (match) {
          const learnLevel = parseInt(match[2], 10);
          return learnLevel <= level;
        }
        return false;
      });
      if (canLearn) {
        movesPool.push(moveId);
      }
    }
  }

  return pickMoves(movesPool);
}

function pickMoves(movesPool: string[]): string[] {
  if (movesPool.length === 0) {
    return ['tackle'];
  }

  const isOffensive = (moveId: string): boolean => {
    const move = Dex.moves.get(moveId);
    return move.category !== 'Status' && (move.basePower > 0 || !!move.damage || !!move.damageCallback);
  };

  const offensive = movesPool.filter(isOffensive);
  const status = movesPool.filter(m => !isOffensive(m));

  if (offensive.length === 0) {
    const moves = movesPool.slice(0, 3);
    moves.push('tackle');
    return moves;
  }

  if (movesPool.length <= 4) {
    return [...movesPool];
  }

  const selected: string[] = [];

  const offCopy = [...offensive];
  const pickOff = offCopy.splice(Math.floor(Math.random() * offCopy.length), 1)[0];
  selected.push(pickOff);

  const remaining = [...offCopy, ...status];
  const slotsLeft = Math.min(3, remaining.length);
  for (let i = 0; i < slotsLeft; i++) {
    const idx = Math.floor(Math.random() * remaining.length);
    selected.push(remaining.splice(idx, 1)[0]);
  }

  return selected;
}

function boostIvs(ivs: PokemonInstance['ivs']): PokemonInstance['ivs'] {
  const cap = (v: number) => Math.min(31, v + 1);
  return {
    hp: cap(ivs.hp),
    atk: cap(ivs.atk),
    def: cap(ivs.def),
    spa: cap(ivs.spa),
    spd: cap(ivs.spd),
    spe: cap(ivs.spe),
  };
}

export async function evolvePokemon(target: PokemonInstance, source: PokemonInstance, evolveConfig: Record<string, any>): Promise<PokemonInstance> {
  if (!isInSameEvolutionLine(target.species, source.species, evolveConfig)) {
    return target;
  }

  const totalCopies = target.copies + source.copies;
  const currentConfig = evolveConfig[target.species];

  if (currentConfig?.evolvesInto && currentConfig.evolvesInto !== target.species && totalCopies >= currentConfig.evolveCopies) {
    const nextSpeciesId = currentConfig.evolvesInto;
    const nextSpecies = Dex.species.get(nextSpeciesId);
    const moves = await generateMovesForSpecies(nextSpeciesId, target.level);

    return {
      ...target,
      species: nextSpeciesId,
      name: nextSpecies.name,
      moves,
      copies: 1,
      ivs: boostIvs(target.ivs)
    };
  }

  return {
    ...target,
    copies: totalCopies,
    ivs: boostIvs(target.ivs)
  };
}
