import { PokemonInstance, generatePokemon, evolvePokemon, isInSameEvolutionLine } from '../utils/pokemon-generator';
import pokemonData from '../data/pokemon-data.json';

export interface ShopItem {
  id: string;
  type: 'pokemon' | 'item';
  pokemonId?: string; // e.g. 'bulbasaur'
  pokemonInstance?: PokemonInstance;
  itemName?: string; // e.g. 'leftovers'
  cost: number;
  frozen: boolean;
}

export interface GameState {
  playerId: string;
  playerName: string;
  gold: number;
  hearts: number;
  trophies: number;
  round: number;
  team: (PokemonInstance | null)[]; // Ordem fixa de 6 slots
  shop: ShopItem[];
}

const ITEMS_POOL = [
  'leftovers',
  'berry',
  'goldberry',
  'quickclaw',
  'kingsrock',
  'focusband',
  'choiceband',
  'mysticwater',
  'charcoal',
  'miracleseed'
];

export class GameManager {
  private state: GameState;

  constructor(playerId: string, playerName: string) {
    this.state = {
      playerId,
      playerName,
      gold: 10,
      hearts: 5,
      trophies: 0,
      round: 1,
      team: Array(6).fill(null),
      shop: []
    };
  }

  getState(): GameState {
    return this.state;
  }

  // Define o tier máximo liberado com base na rodada atual
  getMaxTier(): number {
    if (this.state.round >= 11) return 6;
    if (this.state.round >= 9) return 5;
    if (this.state.round >= 7) return 4;
    if (this.state.round >= 5) return 3;
    if (this.state.round >= 3) return 2;
    return 1;
  }

  // Gera uma nova lista de itens da loja respeitando congelamento
  async rollShop(): Promise<void> {
    const maxTier = this.getMaxTier();
    
    // Obter espécies da Gen 1 elegíveis
    const eligibleSpecies = Object.entries(pokemonData as Record<string, { tier: number }>)
      .filter(([_, info]) => info.tier <= maxTier)
      .map(([id]) => id);

    const newShop: ShopItem[] = [];

    // Preservar os congelados
    for (const item of this.state.shop) {
      if (item.frozen) {
        newShop.push(item);
      }
    }

    // Preencher as posições vazias (loja de tamanho 5 para Pokémon + 2 para Itens)
    const neededPokemon = 5 - newShop.filter(i => i.type === 'pokemon').length;
    const neededItems = 2 - newShop.filter(i => i.type === 'item').length;

    for (let i = 0; i < neededPokemon; i++) {
      const speciesId = eligibleSpecies[Math.floor(Math.random() * eligibleSpecies.length)];
      const instance = await generatePokemon(speciesId);
      newShop.push({
        id: Math.random().toString(36).substring(2, 9),
        type: 'pokemon',
        pokemonId: speciesId,
        pokemonInstance: instance,
        cost: 3,
        frozen: false
      });
    }

    for (let i = 0; i < neededItems; i++) {
      const itemName = ITEMS_POOL[Math.floor(Math.random() * ITEMS_POOL.length)];
      newShop.push({
        id: Math.random().toString(36).substring(2, 9),
        type: 'item',
        itemName,
        cost: 3,
        frozen: false
      });
    }

    this.state.shop = newShop;
  }

  // Reroll manual custa 1 de ouro
  async reroll(): Promise<boolean> {
    if (this.state.gold < 1) return false;
    this.state.gold -= 1;
    await this.rollShop();
    return true;
  }

  // Congelar/Descongelar item
  toggleFreeze(shopItemId: string): boolean {
    const item = this.state.shop.find(i => i.id === shopItemId);
    if (!item) return false;
    item.frozen = !item.frozen;
    return true;
  }

  // Compra Pokémon da loja para um slot específico do time
  buyPokemon(shopItemId: string, teamSlotIndex: number): boolean {
    if (teamSlotIndex < 0 || teamSlotIndex >= 6) return false;

    const shopIndex = this.state.shop.findIndex(i => i.id === shopItemId);
    if (shopIndex === -1) return false;

    const item = this.state.shop[shopIndex];
    if (item.type !== 'pokemon' || !item.pokemonInstance) return false;

    if (this.state.gold < item.cost) return false;

    const targetSlot = this.state.team[teamSlotIndex];

    if (targetSlot === null) {
      // Slot vazio: coloca o Pokémon
      this.state.team[teamSlotIndex] = item.pokemonInstance;
      this.state.gold -= item.cost;
      this.state.shop.splice(shopIndex, 1);
      return true;
    } else if (isInSameEvolutionLine(targetSlot.species, item.pokemonInstance.species, pokemonData)) {
      // Fusão ao comprar da mesma linha evolutiva
      this.state.gold -= item.cost;
      this.state.shop.splice(shopIndex, 1);

      evolvePokemon(targetSlot, item.pokemonInstance, pokemonData).then(evolved => {
        this.state.team[teamSlotIndex] = evolved;
      });
      return true;
    }

    return false;
  }

  // Compra item da loja e equipa no Pokémon
  buyItem(shopItemId: string, teamSlotIndex: number): boolean {
    if (teamSlotIndex < 0 || teamSlotIndex >= 6) return false;

    const shopIndex = this.state.shop.findIndex(i => i.id === shopItemId);
    if (shopIndex === -1) return false;

    const item = this.state.shop[shopIndex];
    if (item.type !== 'item' || !item.itemName) return false;

    const pokemon = this.state.team[teamSlotIndex];
    if (!pokemon) return false;

    if (this.state.gold < item.cost) return false;

    this.state.gold -= item.cost;
    pokemon.item = item.itemName;
    this.state.shop.splice(shopIndex, 1);
    return true;
  }

  // Vender Pokémon do time (retorna 1 de ouro + 1 por cópia fundida)
  sellPokemon(teamSlotIndex: number): boolean {
    if (teamSlotIndex < 0 || teamSlotIndex >= 6) return false;

    const pokemon = this.state.team[teamSlotIndex];
    if (!pokemon) return false;

    const sellPrice = 1 + (pokemon.copies - 1);
    this.state.gold += sellPrice;
    this.state.team[teamSlotIndex] = null;
    return true;
  }

  // Mover Pokémon ou realizar fusão no time
  async moveOrMergePokemon(fromIndex: number, toIndex: number): Promise<boolean> {
    if (fromIndex < 0 || fromIndex >= 6 || toIndex < 0 || toIndex >= 6) return false;
    if (fromIndex === toIndex) return true;

    const source = this.state.team[fromIndex];
    const target = this.state.team[toIndex];

    if (!source) return false;

    if (!target) {
      // Apenas mover
      this.state.team[toIndex] = source;
      this.state.team[fromIndex] = null;
      return true;
    }

    if (isInSameEvolutionLine(source.species, target.species, pokemonData)) {
      // Fusão (mesma linha evolutiva)
      const evolved = await evolvePokemon(target, source, pokemonData);
      this.state.team[toIndex] = evolved;
      this.state.team[fromIndex] = null;
      return true;
    }

    // Trocar de posição
    this.state.team[fromIndex] = target;
    this.state.team[toIndex] = source;
    return true;
  }

  // Prepara estado para a fase de preparação da próxima rodada
  async nextRound(wonBattle: boolean): Promise<void> {
    this.state.round += 1;
    this.state.gold = 10;
    
    if (wonBattle) {
      this.state.trophies += 1;
    } else {
      this.state.hearts -= 1;
    }

    await this.rollShop();
  }
}
