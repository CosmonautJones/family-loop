import assert from 'node:assert/strict';
import { execFileSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

// Always creates its own cluster. No URL or credentials for an existing DB are accepted.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = process.env.PG_BIN ?? (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/16/bin' : '');
const exe = (name) => bin ? path.join(bin, `${name}${process.platform === 'win32' ? '.exe' : ''}`) : name;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'loopedin-onboarding-db-'));
const data = path.join(dir, 'data');
const server = net.createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
await new Promise((resolve) => server.close(resolve));
const options = { encoding: 'utf8', windowsHide: true, timeout: 30000 };
const psql = ['-X', '-qAt', '-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'];
const sql = (input) => execFileSync(exe('psql'), psql, { ...options, input }).trim();
const actorSql = (id, input) => `begin; set local role authenticated; set local request.jwt.claim.sub='${id}'; set local request.jwt.claim.role='authenticated'; ${input}; commit;`;
const as = (id, input) => sql(actorSql(id, input));
const create = (key, name = 'Test family') => `select (public.loopedin_create_group('${name}', '', 'family', '${key}')).id`;
const denied = (id, input, pattern) => {
  assert.throws(() => as(id, input), (error) => pattern.test(String(error.stderr)), `expected denial: ${pattern}`);
};
const newUser = (confirmed = true) => {
  const id = crypto.randomUUID();
  sql(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values('${id}', '${id}@loopedin.test', ${confirmed ? 'now()' : 'null'}, '{"display_name":"SQL fixture","email_verified":true}')`);
  return id;
};
let started = false;
try {
  execFileSync(exe('initdb'), ['-D', data, '-U', 'postgres', '-A', 'trust', '--encoding=UTF8', '--no-locale'], options);
  started = true;
  execFileSync(exe('pg_ctl'), ['-D', data, '-l', path.join(dir, 'server.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start'], { ...options, stdio: 'ignore' });
  sql(fs.readFileSync(path.join(root, 'tests/fixtures/postgres-provider-schema.sql'), 'utf8'));
  const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((name) => name.endsWith('.sql')).sort();
  const feature = '20260917120000_self_service_family_creation.sql';
  for (const name of migrations.filter((name) => name < feature)) sql(fs.readFileSync(path.join(root, 'supabase/migrations', name), 'utf8'));

  // Historical owners without an entitlement must not get a second family.
  const legacy = newUser();
  const legacyGroup = crypto.randomUUID();
  sql(`begin; insert into public.loopedin_groups(id,name,kind,created_by) values('${legacyGroup}','Legacy family','family','${legacy}'); insert into public.loopedin_group_members(group_id,user_id,role) values('${legacyGroup}','${legacy}','owner'); commit;`);
  if (!process.argv.includes('--baseline')) {
    for (const name of migrations.filter((name) => name >= feature)) sql(fs.readFileSync(path.join(root, 'supabase/migrations', name), 'utf8'));
  }

  const founder = newUser();
  const unverified = newUser(false);
  assert.equal(as(founder, 'select public.loopedin_can_create_group()'), 't', 'verified founder needs no admin provisioning');
  assert.equal(as(unverified, 'select public.loopedin_can_create_group()'), 'f');
  denied(unverified, create(crypto.randomUUID()), /Confirm your email/);
  // Even a provisioned entitlement and self-authored email_verified metadata cannot bypass verification.
  sql(`insert into loopedin_private.loopedin_group_creation_entitlements(user_id) values('${unverified}')`);
  denied(unverified, create(crypto.randomUUID()), /Confirm your email/);
  assert.equal(sql(`select count(*) from public.loopedin_groups where created_by='${unverified}'`), '0');
  assert.equal(as(legacy, 'select public.loopedin_can_create_group()'), 'f');
  denied(legacy, create(crypto.randomUUID()), /not available/);
  sql(`delete from public.loopedin_groups where id='${legacyGroup}'`);
  assert.equal(as(legacy, 'select public.loopedin_can_create_group()'), 'f', 'deleting a legacy family does not reset quota');

  const key = crypto.randomUUID();
  denied(founder, create(key, ' '), /group name is required/);
  assert.equal(sql(`select count(*) from loopedin_private.loopedin_group_creation_entitlements where user_id='${founder}'`), '0', 'failed creation must roll back provisioning');
  const group = as(founder, create(key));
  assert.equal(as(founder, create(key)), group, 'same-key response-loss retry');
  denied(founder, create(key, 'Different details'), /different group details/);
  denied(founder, create(crypto.randomUUID()), /not available/);
  assert.equal(as(founder, 'select public.loopedin_can_create_group()'), 'f');
  assert.equal(sql(`select count(*) from public.loopedin_group_members where group_id='${group}' and user_id='${founder}' and role='owner'`), '1');
  assert.equal(as(unverified, `select count(*) from public.loopedin_groups where id='${group}'`), '0', 'unrelated account cannot discover family');
  assert.equal(as(unverified, `select count(*) from public.loopedin_group_members where group_id='${group}'`), '0');
  denied(founder, "insert into public.loopedin_groups(name,kind,created_by) values('Bypass','family',auth.uid())", /permission denied/);
  denied(founder, 'select * from loopedin_private.loopedin_group_creation_entitlements', /permission denied/);
  denied(founder, `select public.loopedin_create_group_active_impl('Bypass','','family','${crypto.randomUUID()}')`, /permission denied/);
  assert.equal(sql("select has_function_privilege('anon','public.loopedin_create_group(text,text,text,uuid)','execute') or has_function_privilege('anon','public.loopedin_can_create_group()','execute')"), 'f');

  const pending = newUser();
  as(pending, 'select public.loopedin_request_account_deletion()');
  denied(pending, 'select public.loopedin_can_create_group()', /pending deletion/);
  denied(pending, create(crypto.randomUUID()), /pending deletion/);

  const concurrent = newUser();
  const results = await Promise.allSettled([crypto.randomUUID(), crypto.randomUUID()].map((raceKey) => promisify(execFile)(exe('psql'), [...psql, '-c', actorSql(concurrent, create(raceKey))], options)));
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1, 'only one concurrent family creation may commit');
  assert.match(String(results.find((result) => result.status === 'rejected').reason.stderr), /not available/);
  assert.equal(sql(`select count(*) from public.loopedin_groups where created_by='${concurrent}'`), '1');
  const replayActor = newUser();
  const replayKey = crypto.randomUUID();
  const retries = await Promise.all([1, 2].map(() => promisify(execFile)(exe('psql'), [...psql, '-c', actorSql(replayActor, create(replayKey))], options)));
  assert.equal(retries[0].stdout.trim(), retries[1].stdout.trim(), 'concurrent identical retries return one family');
  sql(`delete from public.loopedin_groups where id='${group}'`);
  assert.equal(as(founder, 'select public.loopedin_can_create_group()'), 'f');
  denied(founder, create(crypto.randomUUID()), /not available/);
  console.log('PASS: founder verification, legacy backfill, quota, atomic ownership, rollback, retries, concurrency, deletion guard, RLS and grants.');
} finally {
  if (started) execFileSync(exe('pg_ctl'), ['-D', data, '-m', 'fast', '-w', 'stop'], { ...options, stdio: 'ignore' });
  console.log(`Isolated database stopped; diagnostic files retained at ${dir}`);
}
