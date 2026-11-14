// Reads the SQL files the migration runner applies, from a directory laid
// out like the deployed Lambda bundle (or the repository, for local tests).

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { orderFiles, type SqlFile } from './runner';

function readDir(dir: string, prefix: string, filter: (name: string) => boolean): SqlFile[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.sql') && filter(name))
    .map((name) => ({ name: `${prefix}/${name}`, sql: readFileSync(join(dir, name), 'utf8') }));
}

/** compat (infra/sql/00_*), app (supabase/migrations), aws (infra/sql/90_*). */
export function loadSqlFiles(infraSqlDir: string, appMigrationsDir: string): SqlFile[] {
  return orderFiles(
    readDir(infraSqlDir, 'compat', (n) => n.startsWith('0')),
    readDir(appMigrationsDir, 'app', () => true),
    readDir(infraSqlDir, 'aws', (n) => n.startsWith('9')),
  );
}
