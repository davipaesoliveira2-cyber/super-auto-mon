import Fastify from 'fastify';
import { Server, Socket } from 'socket.io';
import { GameManager } from './models/game-state';
import { matchmaker } from './battle/matchmaker';
import { runBattle, BattleResult } from './battle/battle-manager';
import { initDb } from './db';

const fastify = Fastify({ logger: true });

const activeSessions = new Map<string, GameManager>();
const playerSockets = new Map<string, Socket>();
const waitingTimeouts = new Map<string, NodeJS.Timeout>();

fastify.addHook('onRequest', (request, reply, done) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Headers', '*');
  reply.header('Access-Control-Allow-Methods', '*');
  if (request.method === 'OPTIONS') {
    return reply.status(200).send();
  }
  done();
});

function dispatchBattle(
  playerAId: string,
  playerBId: string,
  round: number,
  teamA: (import('./utils/pokemon-generator').PokemonInstance | null)[],
  teamB: (import('./utils/pokemon-generator').PokemonInstance | null)[],
  nameA: string,
  nameB: string
): { result: BattleResult; winnerId: string; loserId: string } {
  const result = runBattle(teamA, teamB, nameA, nameB);
  const aWon = result.winner === 'p1';
  return {
    result,
    winnerId: aWon ? playerAId : playerBId,
    loserId: aWon ? playerBId : playerAId
  };
}

const start = async () => {
  try {
    await initDb();
    console.log('Database initialized.');

    const port = parseInt(process.env.PORT || '3001', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`HTTP Server running on port ${port}`);

    const io = new Server(fastify.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    io.on('connection', async (socket) => {
      const pid = (socket.handshake.query.playerId as string) || socket.id;
      console.log(`Client connected: ${socket.id} (Player ID: ${pid})`);

      playerSockets.set(pid, socket);

      let gm = activeSessions.get(pid) ?? null;
      if (!gm) {
        const shortId = pid.substring(pid.length - 4);
        gm = new GameManager(pid, `Jogador_${shortId}`);
        activeSessions.set(pid, gm);
        await gm.rollShop();
      }

      const getGM = (): GameManager => activeSessions.get(pid) ?? gm;

      socket.emit('state', gm.getState());

      socket.on('reroll', async () => {
        const g = getGM();
        if (await g.reroll()) {
          socket.emit('state', g.getState());
        } else {
          socket.emit('error', 'Ouro insuficiente para Reroll.');
        }
      });

      socket.on('freeze', (data: { shopItemId: string }) => {
        const g = getGM();
        if (g.toggleFreeze(data.shopItemId)) {
          socket.emit('state', g.getState());
        }
      });

      socket.on('buyPokemon', (data: { shopItemId: string; teamSlotIndex: number }) => {
        const g = getGM();
        if (g.buyPokemon(data.shopItemId, data.teamSlotIndex)) {
          setTimeout(() => socket.emit('state', g.getState()), 50);
        } else {
          socket.emit('error', 'Não foi possível comprar o Pokémon.');
        }
      });

      socket.on('buyItem', (data: { shopItemId: string; teamSlotIndex: number }) => {
        const g = getGM();
        if (g.buyItem(data.shopItemId, data.teamSlotIndex)) {
          socket.emit('state', g.getState());
        } else {
          socket.emit('error', 'Não foi possível equipar o item.');
        }
      });

      socket.on('sellPokemon', (data: { teamSlotIndex: number }) => {
        const g = getGM();
        if (g.sellPokemon(data.teamSlotIndex)) {
          socket.emit('state', g.getState());
        }
      });

      socket.on('movePokemon', async (data: { fromIndex: number; toIndex: number }) => {
        const g = getGM();
        if (await g.moveOrMergePokemon(data.fromIndex, data.toIndex)) {
          socket.emit('state', g.getState());
        }
      });

      socket.on('endTurn', async () => {
        const g = getGM();
        const st = g.getState();
        const round = st.round;
        const myTeam = st.team;

        // 1. Salvar time no banco
        matchmaker.saveTeam(pid, st.playerName, round, myTeam);

        // 2. Procurar oponente real
        const opp = matchmaker.findOpponentInDb(pid, round);

        if (opp) {
          // --- MATCH ENCONTRADO: notificar AMBOS os jogadores ---
          console.log(`Match found round ${round}: ${pid} vs ${opp.playerId}`);

          const { result } = dispatchBattle(pid, opp.playerId, round, myTeam, opp.team, st.playerName, opp.name);

          // Avançar estado do jogador atual
          const won = result.winner === 'p1';
          await g.nextRound(won);
          matchmaker.removeTeam(pid, round);
          matchmaker.removeTeam(opp.playerId, round);

          socket.emit('battleResult', {
            winner: result.winner,
            log: result.log,
            opponentName: opp.name,
            opponentTeam: opp.team
          });
          socket.emit('state', g.getState());

          // Notificar o oponente (jogador A) que estava esperando
          const oppSocket = playerSockets.get(opp.playerId);
          const oppGM = activeSessions.get(opp.playerId);
          if (oppSocket && oppGM) {
            // Para o oponente, 'p1' é ele mesmo, 'p2' é o jogador atual
            const oppWon = result.winner === 'p2';
            await oppGM.nextRound(oppWon);
            matchmaker.removeTeam(opp.playerId, round);

            oppSocket.emit('battleResult', {
              winner: oppWon ? 'p1' : result.winner === 'draw' ? 'draw' : 'p2',
              log: result.log,
              opponentName: st.playerName,
              opponentTeam: myTeam
            });
            oppSocket.emit('state', oppGM.getState());
          }
        } else {
          // --- AGUARDANDO OPONENTE ---
          socket.emit('waitingOpponent', { round });
          console.log(`Player ${pid} waiting in round ${round}`);

          // Timeout de 20s para fallback com IA
          const timeout = setTimeout(async () => {
            waitingTimeouts.delete(pid);
            const stillWaiting = matchmaker.findOpponentInDb(pid, round);
            if (stillWaiting) {
              matchmaker.removeTeam(pid, round);
              const aiTeam = await matchmaker.generateFallbackTeam(round);
              const fbResult = runBattle(myTeam, aiTeam, st.playerName, `Treinador da Rodada ${round}`);
              const fbWon = fbResult.winner === 'p1';
              await g.nextRound(fbWon);

              socket.emit('battleResult', {
                winner: fbResult.winner,
                log: fbResult.log,
                opponentName: `Treinador da Rodada ${round}`,
                opponentTeam: aiTeam
              });
              socket.emit('state', g.getState());
            }
          }, 20000);
          waitingTimeouts.set(pid, timeout);
        }
      });

      socket.on('resetGame', async () => {
        const cur = getGM().getState();
        matchmaker.removeTeam(pid, cur.round);

        const shortId = pid.substring(pid.length - 4);
        const newGm = new GameManager(pid, `Jogador_${shortId}`);
        activeSessions.set(pid, newGm);
        await newGm.rollShop();
        socket.emit('state', newGm.getState());
      });

      socket.on('cancelWait', () => {
        const t = waitingTimeouts.get(pid);
        if (t) {
          clearTimeout(t);
          waitingTimeouts.delete(pid);
        }
        matchmaker.removeTeam(pid, getGM().getState().round);
        socket.emit('state', getGM().getState());
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        playerSockets.delete(pid);
        const t = waitingTimeouts.get(pid);
        if (t) {
          clearTimeout(t);
          waitingTimeouts.delete(pid);
        }
        const cur = activeSessions.get(pid);
        if (cur) {
          matchmaker.removeTeam(pid, cur.getState().round);
        }
        activeSessions.delete(pid);
      });
    });

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
