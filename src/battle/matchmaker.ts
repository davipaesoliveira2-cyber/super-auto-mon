import { PokemonInstance, generatePokemon, evolvePokemon, isInSameEvolutionLine } from '../utils/pokemon-generator';
import pokemonData from '../data/pokemon-data.json';
import { saveTeam, findOpponent, removeTeam } from '../db';

export interface Opponent {
  playerId: string;
  name: string;
  team: (PokemonInstance | null)[];
}

function getMaxTier(round: number): number {
  if (round >= 11) return 6;
  if (round >= 9) return 5;
  if (round >= 7) return 4;
  if (round >= 5) return 3;
  if (round >= 3) return 2;
  return 1;
}

function getEligibleSpecies(maxTier: number): string[] {
  return Object.entries(pokemonData as Record<string, { tier: number }>)
    .filter(([_, info]) => info.tier <= maxTier)
    .map(([id]) => id);
}

function compactTeam(team: (PokemonInstance | null)[]): (PokemonInstance | null)[] {
  const result: (PokemonInstance | null)[] = team.filter(p => p !== null);
  while (result.length < 6) result.push(null);
  return result;
}

class Matchmaker {
  async saveTeamDb(playerId: string, playerName: string, round: number, team: (PokemonInstance | null)[]): Promise<void> {
    await saveTeam(playerId, playerName, round, JSON.stringify(team));
  }

  async findOpponentInDb(playerId: string, round: number): Promise<Opponent | null> {
    const row = await findOpponent(playerId, round);
    if (!row) return null;
    try {
      const team: (PokemonInstance | null)[] = JSON.parse(row.team_data);
      return { playerId: row.player_id, name: row.player_name, team };
    } catch {
      return null;
    }
  }

  async removeTeamDb(playerId: string, round: number): Promise<void> {
    await removeTeam(playerId, round);
  }

  async generateFallbackTeam(round: number): Promise<(PokemonInstance | null)[]> {
    let team: (PokemonInstance | null)[] = Array(6).fill(null);
    let gold = 10;

    for (let r = 1; r <= round; r++) {
      const maxTier = getMaxTier(r);
      const eligibleSpecies = getEligibleSpecies(maxTier);

      // Gerar loja de 5 Pokémon
      const shop: { speciesId: string; instance: PokemonInstance }[] = [];
      for (let i = 0; i < 5; i++) {
        const speciesId = eligibleSpecies[Math.floor(Math.random() * eligibleSpecies.length)];
        const instance = await generatePokemon(speciesId, 30);
        shop.push({ speciesId, instance });
      }

      // Prioridade 1: fundir com time existente
      for (const item of [...shop]) {
        if (gold < 3) break;
        for (let slot = 0; slot < 6; slot++) {
          const target = team[slot];
          if (!target) continue;
          if (isInSameEvolutionLine(target.species, item.speciesId, pokemonData)) {
            team[slot] = await evolvePokemon(target, item.instance, pokemonData);
            gold -= 3;
            shop.splice(shop.indexOf(item), 1);
            break;
          }
        }
      }

      // Prioridade 2: preencher slots vazios com Pokémon de tier mais alto disponível
      const shopSorted = [...shop].sort((a, b) => {
        const tA = (pokemonData as any)[a.speciesId]?.tier || 0;
        const tB = (pokemonData as any)[b.speciesId]?.tier || 0;
        return tB - tA;
      });
      for (const item of shopSorted) {
        if (gold < 3) break;
        const emptySlot = team.findIndex(s => s === null);
        if (emptySlot === -1) break;
        team[emptySlot] = item.instance;
        gold -= 3;
        shop.splice(shop.indexOf(item), 1);
      }

      // Fundir Pokémon do mesmo time (slot arrasta no outro)
      for (let i = 0; i < 6; i++) {
        for (let j = i + 1; j < 6; j++) {
          const a = team[i];
          const b = team[j];
          if (!a || !b) continue;
          if (isInSameEvolutionLine(a.species, b.species, pokemonData)) {
            team[i] = await evolvePokemon(a, b, pokemonData);
            team[j] = null;
          }
        }
      }

      // Comprar itens para os Pokémon mais fortes
      if (gold >= 3) {
        const filledSlots = team
          .map((p, i) => ({ p, i }))
          .filter((x): x is { p: PokemonInstance; i: number } => x.p !== null)
          .sort((a, b) => {
            const tA = (pokemonData as any)[a.p.species]?.tier || 0;
            const tB = (pokemonData as any)[b.p.species]?.tier || 0;
            return tB - tA;
          });
        for (const slot of filledSlots) {
          if (gold < 3) break;
          if (!slot.p.item) {
            slot.p.item = ['leftovers', 'berry', 'quickclaw', 'choiceband'][Math.floor(Math.random() * 4)];
            gold -= 3;
          }
        }
      }

      team = compactTeam(team);
      gold = 10 + (Math.random() > 0.3 ? 1 : 0);
    }

    team = compactTeam(team);
    return team;
  }
}

export const matchmaker = new Matchmaker();
