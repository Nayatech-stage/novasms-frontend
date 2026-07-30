import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(configDir, '../../..');

export default async function globalSetup() {
  execFileSync('node', [path.resolve(repoRoot, 'apps/backend/scripts/seed_e2e.js')], {
    stdio: 'inherit',
  });
}
