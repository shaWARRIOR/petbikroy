#!/usr/bin/env node
/* ==========================================================================
   Creates (or re-passwords) an admin account.

   It hashes with the exact same PBKDF2 parameters the Worker verifies with,
   because it imports the real auth module rather than duplicating the logic.

     node tools/create-admin.mjs --email you@example.com
     node tools/create-admin.mjs --email you@example.com --password 'secret'
     node tools/create-admin.mjs --email you@example.com --remote

   With no --password a strong one is generated and printed once.
   ========================================================================== */

import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

import { hashPassword, suggestPassword } from '../functions/_lib/auth.js';
import { newId } from '../functions/_lib/http.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------- args */

function parseArgs(argv) {
  const out = { db: 'petbikroy', remote: false, role: 'admin', name: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--email') out.email = argv[++i];
    else if (a === '--password') out.password = argv[++i];
    else if (a === '--name') out.name = argv[++i];
    else if (a === '--role') out.role = argv[++i];
    else if (a === '--db') out.db = argv[++i];
    else if (a === '--remote') out.remote = true;
    else if (a === '--local') out.remote = false;
    else if (a === '-h' || a === '--help') out.help = true;
    else if (a.startsWith('--')) fail(`Unknown option: ${a}`);
    else if (!out.email) out.email = a;
  }
  return out;
}

function fail(message) {
  console.error(`\n  error: ${message}\n`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`
  Create a PetBikroy admin account

    node tools/create-admin.mjs --email <address> [options]

  Options
    --email     <address>   Required.
    --password  <string>    Omit to generate a strong one.
    --name      <string>    Display name.
    --role      <role>      "admin" (default) or "moderator".
    --remote                Target the deployed database (default: local).
    --db        <name>      D1 database name (default: petbikroy).
`);
  process.exit(0);
}

if (!args.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(args.email)) {
  fail('A valid --email is required.');
}
if (!['admin', 'moderator'].includes(args.role)) {
  fail('--role must be "admin" or "moderator".');
}

/* ------------------------------------------------------------------ build */

const email = args.email.trim().toLowerCase();
const name = args.name || email.split('@')[0];
const generated = !args.password;
const password = args.password || suggestPassword();

if (password.length < 10) fail('Password must be at least 10 characters.');

const { hash, salt, iterations } = await hashPassword(password);
const id = newId('adm-');
const now = new Date().toISOString();
const q = v => `'${String(v).replace(/'/g, "''")}'`;

const sql = `
INSERT INTO admins (id, email, name, password_hash, password_salt, iterations, role, is_active, created_at)
VALUES (${q(id)}, ${q(email)}, ${q(name)}, ${q(hash)}, ${q(salt)}, ${iterations}, ${q(args.role)}, 1, ${q(now)})
ON CONFLICT(email) DO UPDATE SET
  name = excluded.name,
  password_hash = excluded.password_hash,
  password_salt = excluded.password_salt,
  iterations = excluded.iterations,
  role = excluded.role,
  is_active = 1,
  failed_attempts = 0,
  locked_until = NULL;
`.trim();

/* ------------------------------------------------------------------- run */

const localBin = join(ROOT, 'node_modules', '.bin', 'wrangler');
const wrangler = process.env.WRANGLER
  || (existsSync(localBin) ? localBin : 'wrangler');

const cmdArgs = [
  'd1', 'execute', args.db,
  args.remote ? '--remote' : '--local',
  '--command', sql,
];

console.log(`\n  Hashing with PBKDF2-SHA256 (${iterations.toLocaleString('en-US')} iterations)`);
console.log(`  Writing to the ${args.remote ? 'REMOTE (production)' : 'local'} database "${args.db}"\n`);

try {
  execFileSync(wrangler, cmdArgs, { stdio: ['inherit', 'pipe', 'inherit'], cwd: ROOT });
} catch {
  fail(`wrangler failed. Is it installed (npm install) and are you logged in (npx wrangler login)?`);
}

console.log('  Admin ready — sign in at /admin/\n');
console.log(`    email     ${email}`);
console.log(`    role      ${args.role}`);
if (generated) {
  console.log(`    password  ${password}`);
  console.log('\n  This password is shown once. Store it in a password manager now.');
} else {
  console.log('    password  (the one you supplied)');
}
console.log('');
