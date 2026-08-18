#!/usr/bin/env node
/**
 * Verify a live Supabase project against what the app expects.
 *
 * Covers issue #2: the schema, its RLS policies, the write trigger and the
 * column constraints had never been exercised against a real database.
 *
 * Run it yourself — it needs network access to your project:
 *
 *   node scripts/verify-supabase.mjs
 *
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env, or from the
 * environment. Creates two throwaway users, asserts they cannot see each
 * other's rows, then cleans up after itself.
 *
 * Nothing here needs a service-role key. It deliberately tests through the same
 * public interface the browser uses, because that is the surface an attacker
 * would have.
 */

import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

/* ------------------------------- config -------------------------------- */

function loadEnv() {
  const env = { ...process.env };
  try {
    for (const line of readFileSync('.env', 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !env[match[1]]) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* no .env — rely on the environment */
  }
  return env;
}

const env = loadEnv();
const URL = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_ANON_KEY;

if (!URL || !KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY (checked .env and the environment).');
  process.exit(2);
}

/* ------------------------------ reporting ------------------------------ */

const results = [];
let indent = '';

const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  const mark = ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`${indent}${mark} ${name}${detail ? `\n${indent}    ${detail}` : ''}`);
};

async function check(name, fn) {
  try {
    const detail = await fn();
    record(name, true, typeof detail === 'string' ? detail : '');
  } catch (error) {
    record(name, false, error.message);
  }
}

function section(title) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
  indent = '  ';
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

/* ------------------------------- helpers ------------------------------- */

const anon = () => createClient(URL, KEY, { auth: { persistSession: false } });
const stamp = Date.now();

// Generated per run, never written into the repository: a literal password in
// source is a bad pattern even for throwaway accounts.
const password = `Aa1!${randomUUID().replace(/-/g, '').slice(0, 20)}`;
const emailFor = (n) => `action-verify-${stamp}-${n}@example.com`;

async function signUp(n) {
  const client = anon();
  const { data, error } = await client.auth.signUp({ email: emailFor(n), password });
  if (error) throw new Error(`sign-up failed: ${error.message}`);
  if (!data.session) {
    throw new Error(
      'sign-up returned no session — email confirmation is on. Disable it for this run ' +
        '(Authentication → Providers → Email → "Confirm email"), or run against a project that has it off.',
    );
  }
  return { client, userId: data.user.id };
}

/* -------------------------------- checks -------------------------------- */

console.log(`\nVerifying ${URL}\n${'─'.repeat(60)}`);

let alice;
let bob;
let aliceTaskId;

section('Connection and auth');

await check('project reachable and accepting the publishable key', async () => {
  const { error } = await anon().from('tasks').select('id').limit(1);
  // An RLS denial or empty result both prove we reached PostgREST.
  if (error && error.code === '42P01') throw new Error('table "tasks" does not exist — run supabase/tables.sql first');
  if (error && !['PGRST301', '42501'].includes(error.code)) throw new Error(`${error.code}: ${error.message}`);
  return 'reached PostgREST';
});

await check('can create a user', async () => {
  alice = await signUp('a');
  return `user A: ${alice.userId.slice(0, 8)}…`;
});

await check('can create a second user', async () => {
  bob = await signUp('b');
  return `user B: ${bob.userId.slice(0, 8)}…`;
});

// Everything below needs two signed-in clients. Without them each check would
// fail with the same unhelpful "cannot read property of undefined", burying the
// real cause under twenty lines of noise.
if (!alice || !bob) {
  console.log(
    '\n\x1b[31m\x1b[1mCannot continue.\x1b[0m The checks above must pass before the rest can run.\n' +
      '\nCommon causes:\n' +
      '  • The URL or key is wrong, or the project is paused.\n' +
      '  • Email confirmation is on, so sign-up returns no session.\n' +
      '    Turn it off temporarily: Authentication → Providers → Email → "Confirm email".\n' +
      '  • supabase/tables.sql has not been run yet.\n' +
      '  • Outbound network access to the project is blocked.\n',
  );
  process.exit(1);
}

section('Schema');

await check('tasks table exposes every column the app writes', async () => {
  const { error } = await alice.client
    .from('tasks')
    .select(
      'id,user_id,title,notes,is_completed,completed_at,status,priority,due_date,' +
        'has_time,recurrence,tags,subtasks,estimate_minutes,actual_minutes,position,created_at,updated_at',
    )
    .limit(1);
  if (error) throw new Error(`${error.code}: ${error.message}`);
  return 'all 18 columns present';
});

await check('can insert a task', async () => {
  const { data, error } = await alice.client
    .from('tasks')
    .insert({ user_id: alice.userId, title: 'Verify script task', priority: 'high', status: 'today' })
    .select()
    .single();
  if (error) throw new Error(`${error.code}: ${error.message}`);
  aliceTaskId = data.id;
  return `id ${data.id.slice(0, 8)}…`;
});

section('Row Level Security — the part that actually protects data');

await check('user B cannot READ user A’s task', async () => {
  const { data, error } = await bob.client.from('tasks').select('*').eq('id', aliceTaskId);
  if (error) throw new Error(`${error.code}: ${error.message}`);
  assert(data.length === 0, `LEAKED: user B read ${data.length} of user A's rows`);
  return 'returned nothing, as it must';
});

await check('user B cannot UPDATE user A’s task', async () => {
  const { data } = await bob.client
    .from('tasks')
    .update({ title: 'hijacked' })
    .eq('id', aliceTaskId)
    .select();
  assert(!data || data.length === 0, 'LEAKED: user B modified user A’s row');

  const { data: check } = await alice.client.from('tasks').select('title').eq('id', aliceTaskId).single();
  assert(check.title !== 'hijacked', 'LEAKED: user A’s title was changed by user B');
  return 'rejected, and the original value is intact';
});

await check('user B cannot DELETE user A’s task', async () => {
  await bob.client.from('tasks').delete().eq('id', aliceTaskId);
  const { data } = await alice.client.from('tasks').select('id').eq('id', aliceTaskId);
  assert(data.length === 1, 'LEAKED: user B deleted user A’s row');
  return 'rejected, row still present';
});

await check('user B cannot INSERT a row owned by user A', async () => {
  const { error } = await bob.client
    .from('tasks')
    .insert({ user_id: alice.userId, title: 'forged' });
  assert(error, 'LEAKED: user B created a row owned by user A');
  return `rejected (${error.code})`;
});

await check('an anonymous client cannot read anything', async () => {
  const { data, error } = await anon().from('tasks').select('*').limit(5);
  assert(error || !data?.length, `LEAKED: anonymous read returned ${data?.length} rows`);
  return 'returned nothing';
});

section('Trigger behaviour');

await check('completing a task fills completed_at automatically', async () => {
  const { data, error } = await alice.client
    .from('tasks')
    .update({ is_completed: true })
    .eq('id', aliceTaskId)
    .select()
    .single();
  if (error) throw new Error(`${error.code}: ${error.message}`);
  assert(data.completed_at, 'completed_at was not set');
  assert(data.status === 'done', `status should be "done", got "${data.status}"`);
  return 'completed_at set and status moved to done';
});

await check('reopening a task clears completed_at', async () => {
  const { data, error } = await alice.client
    .from('tasks')
    .update({ is_completed: false })
    .eq('id', aliceTaskId)
    .select()
    .single();
  if (error) throw new Error(`${error.code}: ${error.message}`);
  assert(data.completed_at === null, 'completed_at was not cleared');
  assert(data.status !== 'done', `status should have left "done", got "${data.status}"`);
  return 'completed_at cleared and status left done';
});

await check('updated_at advances on every write', async () => {
  const { data: before } = await alice.client.from('tasks').select('updated_at').eq('id', aliceTaskId).single();
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const { data: after } = await alice.client
    .from('tasks')
    .update({ title: 'Verify script task (touched)' })
    .eq('id', aliceTaskId)
    .select('updated_at')
    .single();
  assert(
    new Date(after.updated_at) > new Date(before.updated_at),
    'updated_at did not move — the optimistic-concurrency check depends on this',
  );
  return 'moved forward';
});

section('Constraints');

for (const [column, value] of [
  ['priority', 'nonsense'],
  ['status', 'nonsense'],
]) {
  await check(`rejects an invalid ${column}`, async () => {
    const { error } = await alice.client
      .from('tasks')
      .insert({ user_id: alice.userId, title: 'bad', [column]: value });
    assert(error, `an invalid ${column} was accepted`);
    return `rejected (${error.code})`;
  });
}

await check('rejects an empty title', async () => {
  const { error } = await alice.client.from('tasks').insert({ user_id: alice.userId, title: '' });
  assert(error, 'an empty title was accepted');
  return `rejected (${error.code})`;
});

section('Optional tables');

await check('app_meta is readable when present', async () => {
  const { data, error } = await alice.client.from('app_meta').select('*').eq('key', 'completed_at_backfilled_at');
  if (error?.code === '42P01') return 'not present (fine — only created by the upgrade migration)';
  if (error) throw new Error(`${error.code}: ${error.message}`);
  return data?.length ? `backfill marker: ${data[0].value}` : 'present, no backfill marker';
});

await check('legacy user_stats table', async () => {
  const { error } = await alice.client.from('user_stats').select('user_id').limit(1);
  if (error?.code === '42P01') return 'already dropped';
  return 'still present — see issue #10, nothing reads it any more';
});

/* -------------------------------- cleanup -------------------------------- */

section('Cleanup');

await check('removes the tasks this script created', async () => {
  await alice.client.from('tasks').delete().eq('user_id', alice.userId);
  await bob.client.from('tasks').delete().eq('user_id', bob.userId);
  return 'done';
});

console.log(
  `\n\x1b[2mThe two throwaway accounts (${emailFor('a')}, ${emailFor('b')}) remain.\n` +
    'Delete them from Authentication → Users if you would rather not keep them.\x1b[0m',
);

/* -------------------------------- summary -------------------------------- */

const failed = results.filter((result) => !result.ok);
console.log(`\n${'─'.repeat(60)}`);

if (failed.length === 0) {
  console.log(`\x1b[32m\x1b[1mAll ${results.length} checks passed.\x1b[0m\n`);
  process.exit(0);
}

console.log(`\x1b[31m\x1b[1m${failed.length} of ${results.length} checks failed:\x1b[0m`);
for (const result of failed) console.log(`  ✗ ${result.name}\n    ${result.detail}`);
console.log();
process.exit(1);
