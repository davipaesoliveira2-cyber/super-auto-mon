import { Pool } from 'pg';

let pool: Pool | null = null;

const DATABASE_URL = process.env.DATABASE_URL;

export async function initDb(): Promise<Pool> {
  if (pool) return pool;

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required. Get one at https://supabase.com');
  }

  pool = new Pool({ connectionString: DATABASE_URL });

  // Testar conexão
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('Database connected.');
  } finally {
    client.release();
  }

  // Criar tabela se não existir
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

  return pool;
}

export function getPool(): Pool {
  if (!pool) throw new Error('Database not initialized. Call initDb() first.');
  return pool;
}

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
