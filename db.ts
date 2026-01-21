import { Database } from 'bun:sqlite';
import type { KemonoPost } from './types';
import { mkdirSync, existsSync } from 'fs';

// Ensure data directory exists
const DATA_DIR = './data';
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(`${DATA_DIR}/kemono.db`);

// Initialize schema
db.run(`
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT NOT NULL,
    service TEXT NOT NULL,
    creator_id TEXT NOT NULL,
    post_data TEXT NOT NULL,
    published TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    PRIMARY KEY (id, service, creator_id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS creators (
    service TEXT NOT NULL,
    creator_id TEXT NOT NULL,
    last_synced TEXT NOT NULL,
    PRIMARY KEY (service, creator_id)
  )
`);

// Create index for faster lookups
db.run(`
  CREATE INDEX IF NOT EXISTS idx_posts_creator 
  ON posts (service, creator_id, published DESC)
`);

console.log('[DB] SQLite database initialized');

// Check if we have any posts for a creator
export function hasPostsForCreator(service: string, creatorId: string): boolean {
  const result = db.query<{ count: number }, [string, string]>(
    'SELECT COUNT(*) as count FROM posts WHERE service = ? AND creator_id = ?'
  ).get(service, creatorId);
  return (result?.count ?? 0) > 0;
}

// Get all posts for a creator, sorted by published date descending
export function getPostsForCreator(service: string, creatorId: string): KemonoPost[] {
  const rows = db.query<{ post_data: string }, [string, string]>(
    'SELECT post_data FROM posts WHERE service = ? AND creator_id = ? ORDER BY published DESC'
  ).all(service, creatorId);
  
  return rows.map(row => JSON.parse(row.post_data) as KemonoPost);
}

// Save posts to database (upsert)
export function savePosts(posts: KemonoPost[]): number {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO posts (id, service, creator_id, post_data, published, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const now = new Date().toISOString();
  let saved = 0;
  
  for (const post of posts) {
    stmt.run(
      post.id,
      post.service,
      post.user,
      JSON.stringify(post),
      post.published,
      now
    );
    saved++;
  }
  
  return saved;
}

// Mark a creator as synced
export function markSynced(service: string, creatorId: string): void {
  db.run(`
    INSERT OR REPLACE INTO creators (service, creator_id, last_synced)
    VALUES (?, ?, ?)
  `, [service, creatorId, new Date().toISOString()]);
}

// Get last sync time for a creator
export function getLastSynced(service: string, creatorId: string): Date | null {
  const result = db.query<{ last_synced: string }, [string, string]>(
    'SELECT last_synced FROM creators WHERE service = ? AND creator_id = ?'
  ).get(service, creatorId);
  
  return result ? new Date(result.last_synced) : null;
}

// Get post count for a creator
export function getPostCount(service: string, creatorId: string): number {
  const result = db.query<{ count: number }, [string, string]>(
    'SELECT COUNT(*) as count FROM posts WHERE service = ? AND creator_id = ?'
  ).get(service, creatorId);
  return result?.count ?? 0;
}
