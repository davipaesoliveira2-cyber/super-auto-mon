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

interface MatchRecord {
  id: string;
  round: number;
  winner: string;
  opponentName: string;
  timestamp: number;
}

interface GameStore {
  gameState: GameState | null;
  battleResult: BattleResult | null;
  isBattleActive: boolean;
  isWaitingOpponent: boolean;
  waitingRound: number;
  showWaitingChoice: boolean;
  waitingTimeoutMs: number;
  showHistory: boolean;
  matchHistory: MatchRecord[];
  errorMessage: string | null;
  socket: Socket | null;
  connectSocket: () => void;
  disconnectSocket: () => void;
  toggleHistory: () => void;
  reroll: () => void;
  toggleFreeze: (shopItemId: string) => void;
  buyPokemon: (shopItemId: string, teamSlotIndex: number) => void;
  buyItem: (shopItemId: string, teamSlotIndex: number) => void;
  sellPokemon: (teamSlotIndex: number) => void;
  movePokemon: (fromIndex: number, toIndex: number) => void;
  endTurn: () => void;
  closeBattle: () => void;
  cancelWaiting: () => void;
  fightChoice: (action: 'ai' | 'ghost' | 'wait') => void;
  resetGame: () => void;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function loadHistory(): MatchRecord[] {
  try { return JSON.parse(localStorage.getItem('sam-history') || '[]'); } catch { return []; }
}

function saveHistory(records: MatchRecord[]) {
  localStorage.setItem('sam-history', JSON.stringify(records.slice(-50)));
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  battleResult: null,
  isBattleActive: false,
  isWaitingOpponent: false,
  waitingRound: 0,
  showWaitingChoice: false,
  waitingTimeoutMs: 0,
  showHistory: false,
  matchHistory: loadHistory(),
  errorMessage: null,
  socket: null,

  connectSocket: () => {
    if (get().socket) return;

    const token = localStorage.getItem('sam-token');
    if (!token) return;

    const socket = io(BACKEND_URL, {
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('Connected to backend socket');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      if (err.message === 'Invalid or expired token.') {
        localStorage.removeItem('sam-token');
        localStorage.removeItem('sam-player-id');
        localStorage.removeItem('sam-username');
      }
    });

    socket.on('state', (state: GameState) => {
      set({ gameState: state });
    });

    socket.on('battleResult', (result: BattleResult) => {
      set({ battleResult: result, isBattleActive: true, isWaitingOpponent: false, showWaitingChoice: false });
      const gs = get().gameState;
      if (gs) {
        const record: MatchRecord = {
          id: Date.now().toString(36),
          round: gs.round,
          winner: result.winner,
          opponentName: result.opponentName,
          timestamp: Date.now(),
        };
        const history = loadHistory();
        history.unshift(record);
        saveHistory(history);
        set({ matchHistory: history });
      }
    });

    socket.on('waitingOpponent', (data: { round: number; timeoutMs: number }) => {
      set({ isWaitingOpponent: true, waitingRound: data.round, showWaitingChoice: false, waitingTimeoutMs: data.timeoutMs });
    });

    socket.on('waitingChoice', (data: { round: number; timeoutMs: number } | null) => {
      if (data) {
        set({ showWaitingChoice: true, waitingRound: data.round, waitingTimeoutMs: data.timeoutMs });
      } else {
        set({ showWaitingChoice: false, waitingTimeoutMs: 0 });
      }
    });

    socket.on('waitTimerUpdate', (data: { timeoutMs: number }) => {
      set({ waitingTimeoutMs: data.timeoutMs });
    });

    socket.on('clearChoice', () => {
      set({ showWaitingChoice: false, waitingTimeoutMs: 0 });
    });

    socket.on('error', (msg: string) => {
      set({ errorMessage: msg });
      setTimeout(() => set({ errorMessage: null }), 3000);
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, gameState: null, battleResult: null, isBattleActive: false, isWaitingOpponent: false, showWaitingChoice: false });
    }
  },

  toggleHistory: () => {
    set((s) => ({ showHistory: !s.showHistory }));
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
    set({ isWaitingOpponent: false, waitingRound: 0, showWaitingChoice: false, waitingTimeoutMs: 0 });
  },

  fightChoice: (action) => {
    const { socket } = get();
    if (socket) socket.emit('fightChoice', { action });
    set({ showWaitingChoice: false });
  },

  resetGame: () => {
    const { socket } = get();
    if (socket) socket.emit('resetGame');
  }
}));
