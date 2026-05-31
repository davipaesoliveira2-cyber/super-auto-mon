import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'saved-teams.db');

let db: SqlJsDatabase | null = null;

export async function initDb(): Promise<SqlJsDatabase> {
  if (db) return db;

  const SQL = await initSqlJs();

  // Tentar carregar banco existente do disco
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS saved_teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      round INTEGER NOT NULL,
      team_data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(player_id, round)
    )
  `);

  persistDb();
  return db;
}

function persistDb(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export function getDb(): SqlJsDatabase {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

export function saveTeam(playerId: string, playerName: string, round: number, teamData: string): void {
  const d = getDb();
  d.run(
    `INSERT OR REPLACE INTO saved_teams (player_id, player_name, round, team_data)
     VALUES (?, ?, ?, ?)`,
    [playerId, playerName, round, teamData]
  );
  persistDb();
}

export interface OpponentRow {
  player_id: string;
  player_name: string;
  team_data: string;
}

export function findOpponent(playerId: string, round: number): OpponentRow | null {
  const d = getDb();
  const stmt = d.prepare(`
    SELECT player_id, player_name, team_data
    FROM saved_teams
    WHERE round = ? AND player_id != ?
    ORDER BY created_at ASC
    LIMIT 1
  `);
  stmt.bind([round, playerId]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as OpponentRow;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export function removeTeam(playerId: string, round: number): void {
  const d = getDb();
  d.run(`DELETE FROM saved_teams WHERE player_id = ? AND round = ?`, [playerId, round]);
  persistDb();
}
