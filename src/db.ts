import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) throw new Error('Database not initialized. Call initDb() first.');
  return pool;
}

async function ensureTable(clientOrPool: Pool | import('pg').PoolClient, table: string, ddl: string): Promise<void> {
  await clientOrPool.query(ddl);
}

export async function initDb(): Promise<Pool> {
  if (pool) return pool;

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required.');
  }

  pool = new Pool({ connectionString: DATABASE_URL });

  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('Database connected.');
  } finally {
    client.release();
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_teams (
      id SERIAL PRIMARY KEY,
      player_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      round INTEGER NOT NULL,
      team_data TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(player_id, round)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      player_id TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  return pool;
}

// ---- saved_teams ----

export async function saveTeam(playerId: string, playerName: string, round: number, teamData: string): Promise<void> {
  const p = getPool();
  await p.query(
    `INSERT INTO saved_teams (player_id, player_name, round, team_data)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (player_id, round) DO UPDATE SET team_data = $4, player_name = $2, created_at = NOW()`,
    [playerId, playerName, round, teamData]
  );
}

export interface OpponentRow {
  player_id: string;
  player_name: string;
  team_data: string;
}

export async function findOpponent(playerId: string, round: number): Promise<OpponentRow | null> {
  const p = getPool();
  const result = await p.query(
    `SELECT player_id, player_name, team_data
     FROM saved_teams
     WHERE round = $1 AND player_id != $2
     ORDER BY created_at ASC
     LIMIT 1`,
    [round, playerId]
  );
  return result.rows[0] || null;
}

export async function removeTeam(playerId: string, round: number): Promise<void> {
  const p = getPool();
  await p.query(
    `DELETE FROM saved_teams WHERE player_id = $1 AND round = $2`,
    [playerId, round]
  );
}

// ---- users ----

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  player_id: string;
  created_at: Date;
}

export async function createUser(username: string, passwordHash: string, playerId: string): Promise<UserRow> {
  const p = getPool();
  const result = await p.query(
    `INSERT INTO users (username, password_hash, player_id) VALUES ($1, $2, $3) RETURNING *`,
    [username, passwordHash, playerId]
  );
  return result.rows[0];
}

export async function findUserByUsername(username: string): Promise<UserRow | null> {
  const p = getPool();
  const result = await p.query(`SELECT * FROM users WHERE username = $1`, [username]);
  return result.rows[0] || null;
}

export async function findUserByPlayerId(playerId: string): Promise<UserRow | null> {
  const p = getPool();
  const result = await p.query(`SELECT * FROM users WHERE player_id = $1`, [playerId]);
  return result.rows[0] || null;
}

export async function updatePlayerIdForUser(userId: number, newPlayerId: string): Promise<void> {
  const p = getPool();
  await p.query(`UPDATE users SET player_id = $1 WHERE id = $2`, [newPlayerId, userId]);
}
