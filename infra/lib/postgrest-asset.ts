// Builds the PostgREST Lambda's code folder at deploy time: the official
// static Linux binary (downloaded once, checked against a pinned SHA-256)
// next to the small Node.js adapter in lambda/postgrest. Works on Windows,
// macOS, and Linux: it only needs `tar`, which ships with Windows 10 and later.

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const POSTGREST_VERSION = 'v12.2.3';
const ARCHIVE = `postgrest-${POSTGREST_VERSION}-linux-static-x64.tar.xz`;
const ARCHIVE_URL = `https://github.com/PostgREST/postgrest/releases/download/${POSTGREST_VERSION}/${ARCHIVE}`;
const ARCHIVE_SHA256 = '9f71269e61ac3a940281e93ff415760f5957e430e475ba4c3889f3ede7d5527c';

const infraRoot = join(__dirname, '..');

/** Returns the folder to deploy as the PostgREST Lambda's code, building it if needed. */
export async function ensurePostgrestAsset(outDir = join(infraRoot, '.bin', 'postgrest-lambda')) {
  mkdirSync(outDir, { recursive: true });
  copyFileSync(join(infraRoot, 'lambda', 'postgrest', 'index.mjs'), join(outDir, 'index.mjs'));

  const binary = join(outDir, 'postgrest');
  if (existsSync(binary)) return outDir;

  const archivePath = join(infraRoot, '.bin', ARCHIVE);
  if (!existsSync(archivePath)) {
    console.log(`Downloading PostgREST ${POSTGREST_VERSION}...`);
    const response = await fetch(ARCHIVE_URL);
    if (!response.ok) throw new Error(`Downloading ${ARCHIVE_URL} failed: ${response.status}`);
    writeFileSync(archivePath, Buffer.from(await response.arrayBuffer()));
  }
  const hash = createHash('sha256').update(readFileSync(archivePath)).digest('hex');
  if (hash !== ARCHIVE_SHA256) {
    rmSync(archivePath);
    throw new Error(`PostgREST download did not match its checksum (got ${hash}). Try again.`);
  }

  const result = spawnSync('tar', ['-xf', archivePath, '-C', outDir], { stdio: 'inherit' });
  if (result.status !== 0 || !existsSync(binary)) {
    throw new Error(
      `Couldn't unpack ${archivePath} with tar. Unpack it into ${outDir} by hand (for example with 7-Zip) and deploy again.`,
    );
  }
  return outDir;
}

if (require.main === module) {
  ensurePostgrestAsset().then((dir) => console.log(`PostgREST Lambda code ready in ${dir}`));
}
