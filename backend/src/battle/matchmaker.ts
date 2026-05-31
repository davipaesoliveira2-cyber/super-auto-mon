import { PokemonInstance, generatePokemon } from '../utils/pokemon-generator';
import pokemonData from '../data/pokemon-data.json';
import { saveTeam, findOpponent, removeTeam } from '../db';

export interface Opponent {
  playerId: string;
  name: string;
  team: (PokemonInstance | null)[];
}

class Matchmaker {
  saveTeam(playerId: string, playerName: string, round: number, team: (PokemonInstance | null)[]): void {
    saveTeam(playerId, playerName, round, JSON.stringify(team));
  }

  findOpponentInDb(playerId: string, round: number): Opponent | null {
    const row = findOpponent(playerId, round);
    if (!row) return null;
    try {
      const team: (PokemonInstance | null)[] = JSON.parse(row.team_data);
      return { playerId: row.player_id, name: row.player_name, team };
    } catch {
      return null;
    }
  }

  removeTeam(playerId: string, round: number): void {
    removeTeam(playerId, round);
  }

  async generateFallbackTeam(round: number): Promise<(PokemonInstance | null)[]> {
    const team: (PokemonInstance | null)[] = Array(6).fill(null);

    let maxTier = 1;
    if (round >= 11) maxTier = 6;
    else if (round >= 9) maxTier = 5;
    else if (round >= 7) maxTier = 4;
    else if (round >= 5) maxTier = 3;
    else if (round >= 3) maxTier = 2;

    const eligibleSpecies = Object.entries(pokemonData as Record<string, { tier: number }>)
      .filter(([_, info]) => info.tier <= maxTier)
      .map(([id]) => id);

    const size = Math.min(5, 2 + Math.floor(round / 2));

    for (let i = 0; i < size; i++) {
      const speciesId = eligibleSpecies[Math.floor(Math.random() * eligibleSpecies.length)];
      const pokemon = await generatePokemon(speciesId, 30);

      if (round >= 4) {
        pokemon.copies = Math.floor(Math.random() * 2) + 1;
      }
      if (round >= 8) {
        pokemon.copies = Math.floor(Math.random() * 3) + 2;
      }

      team[i] = pokemon;
    }

    return team;
  }
}

export const matchmaker = new Matchmaker();
