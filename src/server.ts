import Fastify from 'fastify';
import { Server, Socket } from 'socket.io';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GameManager } from './models/game-state';
import { matchmaker } from './battle/matchmaker';
import { runBattle, BattleResult } from './battle/battle-manager';
import { initDb, createUser, findUserByUsername, findUserByPlayerId } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'super-auto-mon-beta-secret-2026';
const SALT_ROUNDS = 10;

const fastify = Fastify({ logger: true });

const activeSessions = new Map<string, GameManager>();
const playerSockets = new Map<string, Socket>();
const waitingTimeouts = new Map<string, NodeJS.Timeout>();
const choiceFallbackTimers = new Map<string, NodeJS.Timeout>();

fastify.addHook('onRequest', (request, reply, done) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Headers', '*');
  reply.header('Access-Control-Allow-Methods', '*');
  if (request.method === 'OPTIONS') {
    return reply.status(200).send();
  }
  done();
});

fastify.get('/health', async () => {
  return { status: 'ok' };
});

// ---- Auth Routes ----

fastify.post('/api/register', async (request, reply) => {
  const { username, password } = request.body as { username?: string; password?: string };
  if (!username || !password) {
    return reply.status(400).send({ error: 'Username and password required.' });
  }
  if (username.length < 3) {
    return reply.status(400).send({ error: 'Username must be at least 3 characters.' });
  }
  if (password.length < 4) {
    return reply.status(400).send({ error: 'Password must be at least 4 characters.' });
  }

  const existing = await findUserByUsername(username);
  if (existing) {
    return reply.status(409).send({ error: 'Username already taken.' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const playerId = 'p_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

  const user = await createUser(username, passwordHash, playerId);
  const token = jwt.sign({ playerId: user.player_id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

  return { token, playerId: user.player_id, username: user.username };
});

fastify.post('/api/login', async (request, reply) => {
  const { username, password } = request.body as { username?: string; password?: string };
  if (!username || !password) {
    return reply.status(400).send({ error: 'Username and password required.' });
  }

  const user = await findUserByUsername(username);
  if (!user) {
    return reply.status(401).send({ error: 'Invalid username or password.' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return reply.status(401).send({ error: 'Invalid username or password.' });
  }

  const token = jwt.sign({ playerId: user.player_id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  return { token, playerId: user.player_id, username: user.username };
});

fastify.get('/api/me', async (request, reply) => {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing token.' });
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { playerId: string; username: string };
    return { playerId: payload.playerId, username: payload.username };
  } catch {
    return reply.status(401).send({ error: 'Invalid token.' });
  }
});

function dispatchBattle(
  playerAId: string,
  playerBId: string,
  _round: number,
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

    io.use((socket, next) => {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        return next(new Error('Authentication required.'));
      }
      try {
        const payload = jwt.verify(token, JWT_SECRET) as { playerId: string; username: string };
        (socket as any).authedPlayerId = payload.playerId;
        (socket as any).authedUsername = payload.username;
        next();
      } catch {
        next(new Error('Invalid or expired token.'));
      }
    });

    io.on('connection', async (socket) => {
      const pid = (socket as any).authedPlayerId as string;
      const username = (socket as any).authedUsername as string;
      console.log(`Client connected: ${socket.id} (${username})`);

      playerSockets.set(pid, socket);

      let gm = activeSessions.get(pid) ?? null;
      if (!gm) {
        gm = new GameManager(pid, username);
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
        await matchmaker.saveTeamDb(pid, st.playerName, round, myTeam);

        // 2. Procurar oponente real
        const opp = await matchmaker.findOpponentInDb(pid, round);

        if (opp) {
          // --- MATCH ENCONTRADO ---
          console.log(`Match found round ${round}: ${pid} vs ${opp.playerId}`);

          const { result } = dispatchBattle(pid, opp.playerId, round, myTeam, opp.team, st.playerName, opp.name);

          const won = result.winner === 'p1';
          await g.nextRound(won);
          await matchmaker.removeTeamDb(pid, round);

          socket.emit('battleResult', {
            winner: result.winner,
            log: result.log,
            opponentName: opp.name,
            opponentTeam: opp.team
          });
          socket.emit('state', g.getState());

          const oppSocket = playerSockets.get(opp.playerId);
          const oppGM = activeSessions.get(opp.playerId);
          if (oppSocket && oppGM) {
            const oppWon = result.winner === 'p2';
            await oppGM.nextRound(oppWon);

            oppSocket.emit('battleResult', {
              winner: oppWon ? 'p1' : result.winner === 'draw' ? 'draw' : 'p2',
              log: result.log,
              opponentName: st.playerName,
              opponentTeam: myTeam
            });
            oppSocket.emit('state', oppGM.getState());

            const oppT = waitingTimeouts.get(opp.playerId);
            if (oppT) { clearTimeout(oppT); waitingTimeouts.delete(opp.playerId); }
          }
        } else {
          socket.emit('waitingOpponent', { round });
          console.log(`Player ${pid} waiting in round ${round}`);

          const timeout = setTimeout(async () => {
            waitingTimeouts.delete(pid);

            if (getGM().getState().round !== round) return;

            const found = await matchmaker.findOpponentInDb(pid, round);
            if (found) {
              console.log(`Timeout real match ${pid} vs ${found.playerId} round ${round}`);
              const { result } = dispatchBattle(pid, found.playerId, round, myTeam, found.team, st.playerName, found.name);
              const won = result.winner === 'p1';
              await g.nextRound(won);
              await matchmaker.removeTeamDb(pid, round);

              socket.emit('battleResult', {
                winner: result.winner,
                log: result.log,
                opponentName: found.name,
                opponentTeam: found.team
              });
              socket.emit('state', g.getState());

              const fOppSocket = playerSockets.get(found.playerId);
              const fOppGM = activeSessions.get(found.playerId);
              if (fOppSocket && fOppGM) {
                const fOppWon = result.winner === 'p2';
                await fOppGM.nextRound(fOppWon);
                fOppSocket.emit('battleResult', {
                  winner: fOppWon ? 'p1' : result.winner === 'draw' ? 'draw' : 'p2',
                  log: result.log,
                  opponentName: st.playerName,
                  opponentTeam: myTeam
                });
                fOppSocket.emit('state', fOppGM.getState());
                const ft = waitingTimeouts.get(found.playerId);
                if (ft) { clearTimeout(ft); waitingTimeouts.delete(found.playerId); }
              }
            } else {
              console.log(`Asking ${pid} for fight choice round ${round}`);
              socket.emit('waitingChoice', { round });

              const choiceHandler = async (choice: { action: 'ai' | 'ghost' | 'wait' }) => {
                socket.off('fightChoice', choiceHandler);
                const ft = choiceFallbackTimers.get(pid);
                if (ft) { clearTimeout(ft); choiceFallbackTimers.delete(pid); }

                if (choice.action === 'wait') {
                  const newTimeout = setTimeout(async () => {
                    waitingTimeouts.delete(pid);
                    if (getGM().getState().round !== round) return;
                    await matchmaker.removeTeamDb(pid, round);
                    const aiTeam = await matchmaker.generateFallbackTeam(round);
                    const fbResult = runBattle(myTeam, aiTeam, st.playerName, `Treinador da Rodada ${round}`);
                    const fbWon = fbResult.winner === 'p1';
                    await g.nextRound(fbWon);
                    socket.emit('battleResult', {
                      winner: fbResult.winner, log: fbResult.log,
                      opponentName: `Treinador da Rodada ${round}`, opponentTeam: aiTeam
                    });
                    socket.emit('state', g.getState());
                  }, 15000);
                  waitingTimeouts.set(pid, newTimeout);
                  return;
                }

                await matchmaker.removeTeamDb(pid, round);

                if (choice.action === 'ghost') {
                  console.log(`Ghost fight for ${pid} round ${round}`);
                  const ghostResult = runBattle(myTeam, myTeam.map(p => p ? { ...p } : null), st.playerName, `${st.playerName} (Fantasmal)`);
                  const ghostWon = ghostResult.winner === 'p1';
                  await g.nextRound(ghostWon);
                  socket.emit('battleResult', {
                    winner: ghostResult.winner, log: ghostResult.log,
                    opponentName: `${st.playerName} (Fantasmal)`, opponentTeam: myTeam
                  });
                  socket.emit('state', g.getState());
                } else {
                  console.log(`AI fallback for ${pid} round ${round}`);
                  const aiTeam = await matchmaker.generateFallbackTeam(round);
                  const fbResult = runBattle(myTeam, aiTeam, st.playerName, `Treinador da Rodada ${round}`);
                  const fbWon = fbResult.winner === 'p1';
                  await g.nextRound(fbWon);
                  socket.emit('battleResult', {
                    winner: fbResult.winner, log: fbResult.log,
                    opponentName: `Treinador da Rodada ${round}`, opponentTeam: aiTeam
                  });
                  socket.emit('state', g.getState());
                }
              };
              socket.on('fightChoice', choiceHandler);

              const fallback = setTimeout(() => {
                socket.off('fightChoice', choiceHandler);
                choiceFallbackTimers.delete(pid);
                if (getGM().getState().round === round) {
                  console.log(`Choice default AI for ${pid} round ${round}`);
                  socket.emit('clearChoice');
                }
              }, 15000);
              choiceFallbackTimers.set(pid, fallback);
            }
          }, 10000);
          waitingTimeouts.set(pid, timeout);
        }
      });

      socket.on('resetGame', async () => {
        const cur = getGM().getState();
        await matchmaker.removeTeamDb(pid, cur.round);

        const newGm = new GameManager(pid, username);
        activeSessions.set(pid, newGm);
        await newGm.rollShop();
        socket.emit('state', newGm.getState());
      });

      socket.on('cancelWait', async () => {
        const t = waitingTimeouts.get(pid);
        if (t) { clearTimeout(t); waitingTimeouts.delete(pid); }
        const ct = choiceFallbackTimers.get(pid);
        if (ct) { clearTimeout(ct); choiceFallbackTimers.delete(pid); }
        socket.off('fightChoice', () => {});
        await matchmaker.removeTeamDb(pid, getGM().getState().round);
        socket.emit('state', getGM().getState());
      });

      socket.on('disconnect', async () => {
        console.log(`Client disconnected: ${socket.id}`);
        playerSockets.delete(pid);
        const t = waitingTimeouts.get(pid);
        if (t) { clearTimeout(t); waitingTimeouts.delete(pid); }
        const ct = choiceFallbackTimers.get(pid);
        if (ct) { clearTimeout(ct); choiceFallbackTimers.delete(pid); }
        const cur = activeSessions.get(pid);
        if (cur) {
          await matchmaker.removeTeamDb(pid, cur.getState().round);
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
