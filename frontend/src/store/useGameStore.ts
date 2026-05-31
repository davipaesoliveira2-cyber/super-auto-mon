import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

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

export interface ShopItem {
  id: string;
  type: 'pokemon' | 'item';
  pokemonId?: string;
  pokemonInstance?: PokemonInstance;
  itemName?: string;
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
  team: (PokemonInstance | null)[];
  shop: ShopItem[];
}

export interface BattleResult {
  winner: string;
  log: string[];
  opponentName: string;
  opponentTeam: (PokemonInstance | null)[];
}

interface GameStore {
  gameState: GameState | null;
  battleResult: BattleResult | null;
  isBattleActive: boolean;
  isWaitingOpponent: boolean;
  waitingRound: number;
  errorMessage: string | null;
  socket: Socket | null;
  connectSocket: () => void;
  reroll: () => void;
  toggleFreeze: (shopItemId: string) => void;
  buyPokemon: (shopItemId: string, teamSlotIndex: number) => void;
  buyItem: (shopItemId: string, teamSlotIndex: number) => void;
  sellPokemon: (teamSlotIndex: number) => void;
  movePokemon: (fromIndex: number, toIndex: number) => void;
  endTurn: () => void;
  closeBattle: () => void;
  cancelWaiting: () => void;
  resetGame: () => void;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  battleResult: null,
  isBattleActive: false,
  isWaitingOpponent: false,
  waitingRound: 0,
  errorMessage: null,
  socket: null,

  connectSocket: () => {
    if (get().socket) return;

    const playerId = 'p_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('super-auto-mon-player-id', playerId);

    const socket = io(BACKEND_URL, {
      query: { playerId }
    });

    socket.on('connect', () => {
      console.log('Connected to backend socket');
    });

    socket.on('state', (state: GameState) => {
      set({ gameState: state });
    });

    socket.on('battleResult', (result: BattleResult) => {
      set({ battleResult: result, isBattleActive: true, isWaitingOpponent: false });
    });

    socket.on('waitingOpponent', (data: { round: number }) => {
      set({ isWaitingOpponent: true, waitingRound: data.round });
    });

    socket.on('error', (msg: string) => {
      set({ errorMessage: msg });
      setTimeout(() => set({ errorMessage: null }), 3000);
    });

    set({ socket });
  },

  reroll: () => {
    const { socket } = get();
    if (socket) socket.emit('reroll');
  },

  toggleFreeze: (shopItemId) => {
    const { socket } = get();
    if (socket) socket.emit('freeze', { shopItemId });
  },

  buyPokemon: (shopItemId, teamSlotIndex) => {
    const { socket } = get();
    if (socket) socket.emit('buyPokemon', { shopItemId, teamSlotIndex });
  },

  buyItem: (shopItemId, teamSlotIndex) => {
    const { socket } = get();
    if (socket) socket.emit('buyItem', { shopItemId, teamSlotIndex });
  },

  sellPokemon: (teamSlotIndex) => {
    const { socket } = get();
    if (socket) socket.emit('sellPokemon', { teamSlotIndex });
  },

  movePokemon: (fromIndex, toIndex) => {
    const { socket } = get();
    if (socket) socket.emit('movePokemon', { fromIndex, toIndex });
  },

  endTurn: () => {
    const { socket } = get();
    if (socket) socket.emit('endTurn');
  },

  closeBattle: () => {
    set({ isBattleActive: false, battleResult: null });
  },

  cancelWaiting: () => {
    const { socket } = get();
    if (socket) socket.emit('cancelWait');
    set({ isWaitingOpponent: false, waitingRound: 0 });
  },

  resetGame: () => {
    const { socket } = get();
    if (socket) socket.emit('resetGame');
  }
}));
