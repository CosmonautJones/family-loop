import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { loadInvitationCandidate, verifyHostedInvitationCandidate } from '../scripts/hosted-invitation-release.mjs';

const APP_ORIGIN = 'https://loopedin-family.netlify.app';
const EXPECTED_PROJECT_REF = 'vkogznsfthirhxkqysza';
const QUARANTINED_PROJECT_REF = 'lzscofbvecgpchokxhyb';
const QA_MARKER = 'loopedin_hosted_invitation_qa';
const ROLES = ['owner', 'recipient', 'signup'];
const CHROME_PATH = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const sensitiveValues = new Set();

const projectRef = process.env.LOOPEDIN_HOSTED_PROJECT_REF;
const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
let candidate;
try {
  candidate = loadInvitationCandidate({
    artifactPath: process.env.LOOPEDIN_QA_ARTIFACT_PATH,
    sourceCommit: process.env.LOOPEDIN_QA_SOURCE_COMMIT,
    artifactSha256: process.env.LOOPEDIN_QA_ARTIFACT_SHA256,
    approvalReference: process.env.LOOPEDIN_QA_APPROVAL_REFERENCE,
  });
  const linkedProjectRef = readFileSync(new URL('../supabase/.temp/project-ref', import.meta.url), 'utf8').trim();
  assert.equal(process.env.LOOPEDIN_HOSTED_STAGING_ACK, 'I_ACKNOWLEDGE_LOOPEDIN_STAGING_ONLY');
  assert.equal(projectRef, EXPECTED_PROJECT_REF, 'unexpected hosted project');
  assert.equal(linkedProjectRef, EXPECTED_PROJECT_REF, 'Supabase CLI is not linked to the dedicated staging project');
  assert.notEqual(projectRef, QUARANTINED_PROJECT_REF, 'quarantined project refused');
  assert.equal(url, `https://${EXPECTED_PROJECT_REF}.supabase.co`, 'unexpected hosted URL');
  assert.match(publishableKey ?? '', /^sb_publishable_[A-Za-z0-9_-]+$/, 'publishable key required');
  assert.match(secretKey ?? '', /^sb_secret_[A-Za-z0-9_-]+$/, 'secret key required');
  assert.ok(existsSync(CHROME_PATH), 'Chrome executable is unavailable');
} catch {
  console.error('Hosted invitation QA configuration is invalid; details redacted. No hosted fixture was created.');
  process.exit(1);
}

function safeUuid(value) {
  assert.match(value ?? '', /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, 'invalid synthetic UUID');
  return value;
}

function markerFor(runId, role) {
  return { [QA_MARKER]: true, loopedin_qa_run_id: runId, loopedin_qa_role: role };
}

function emailFor(runId, role) {
  const slug = runId.replaceAll('-', '').slice(-20);
  return `loopedin-invite-${role}-${slug}@loopedin.invalid`;
}

function displayNameFor(runId, role) {
  return `LoopedIn invitation QA ${role} ${runId}`;
}

function isMarked(user, runId, role) {
  const metadata = user?.app_metadata ?? {};
  return metadata[QA_MARKER] === true
    && metadata.loopedin_qa_run_id === runId
    && metadata.loopedin_qa_role === role;
}

function randomPassword() {
  const value = `${crypto.randomBytes(36).toString('base64url')}Aa1!`;
  sensitiveValues.add(value);
  return value;
}

function redact(value) {
  let text = value instanceof Error ? value.message : String(value);
  for (const secret of [publishableKey, secretKey, ...sensitiveValues]) if (secret) text = text.replaceAll(secret, '[REDACTED]');
  return text
    .replace(/https?:\/\/[^\s]+/gi, '[REDACTED_URL]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_TOKEN]')
    .replace(/\b[0-9a-f]{64}\b/gi, '[REDACTED_TOKEN]')
    .replace(/sb_(?:publishable|secret)_[A-Za-z0-9_-]+/g, '[REDACTED_KEY]');
}

function dbQuery(statement, label) {
  const cliScript = join(dirname(process.execPath), 'node_modules', 'supabase', 'dist', 'supabase.js');
  const command = process.platform === 'win32' ? process.execPath : 'supabase';
  const prefix = process.platform === 'win32' ? [cliScript] : [];
  const result = spawnSync(command, [...prefix, 'db', 'query', '--linked', '--output', 'json', statement], {
    cwd: new URL('..', import.meta.url), encoding: 'utf8', windowsHide: true,
  });
  if (result.status !== 0) throw new Error(`${label} failed through the dedicated staging SQL seam`);
  try {
    return JSON.parse(result.stdout).rows ?? [];
  } catch {
    throw new Error(`${label} returned an invalid staging SQL response`);
  }
}

async function request(path, { token = publishableKey, headers = {}, ...options } = {}) {
  const apiKey = token === secretKey ? secretKey : publishableKey;
  const response = await fetch(`${url}${path}`, {
    ...options,
    redirect: 'error', signal: AbortSignal.timeout(15_000),
    headers: { apikey: apiKey, Authorization: `Bearer ${token}`, ...headers },
  });
  const text = await response.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch {}
  return { response, body };
}

async function required(resultPromise, label) {
  const result = await resultPromise;
  if (!result.response.ok) throw new Error(`${label} failed (HTTP ${result.response.status})`);
  return result.body;
}

function rpc(name, token, body = {}) {
  return request(`/rest/v1/rpc/${name}`, {
    token, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

async function adminUsers() {
  const body = await required(request('/auth/v1/admin/users?page=1&per_page=1000', { token: secretKey }), 'list marked Auth users');
  const users = Array.isArray(body) ? body : body.users ?? [];
  assert.ok(users.length < 1000, 'bounded Auth discovery capacity reached');
  return users;
}

async function adminUsersWithRetry(label, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await adminUsers(); } catch {
      if (attempt === attempts) throw new Error(`${label} failed after ${attempts} attempts`);
      await delay(attempt * 250);
    }
  }
  throw new Error(`${label} failed`);
}

async function createConfirmedUser(runId, role) {
  const email = emailFor(runId, role);
  const password = randomPassword();
  sensitiveValues.add(email);
  const user = await required(request('/auth/v1/admin/users', {
    token: secretKey,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email, password, email_confirm: true,
      user_metadata: { display_name: displayNameFor(runId, role) },
      app_metadata: markerFor(runId, role),
    }),
  }), `create ${role} synthetic user`);
  assert.ok(isMarked(user, runId, role), 'synthetic Auth marker mismatch');
  const session = await required(request('/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  }), `sign in ${role} synthetic user`);
  assert.equal(session.user.id, user.id, 'synthetic Auth session mismatch');
  sensitiveValues.add(session.access_token);
  sensitiveValues.add(session.refresh_token);
  return { id: safeUuid(user.id), role, email, password, token: session.access_token };
}

async function verifyHostedRelease() {
  await verifyHostedInvitationCandidate(candidate, { expectedPublishableKey: publishableKey });
}

async function withBrowser(initialUrl, proof) {
  const profile = mkdtempSync(join(tmpdir(), 'loopedin-hosted-invite-'));
  const chrome = spawn(CHROME_PATH, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--disable-gpu', 'about:blank',
  ], { stdio: 'ignore', windowsHide: true });
  let socket;
  let sequence = 0;
  const pending = new Map();
  const consoleEvents = [];
  let stage = 'launch';
  try {
    const portFile = join(profile, 'DevToolsActivePort');
    for (let attempt = 0; attempt < 100 && !existsSync(portFile); attempt += 1) await delay(50);
    assert.ok(existsSync(portFile), 'Chrome DevTools port unavailable');
    const port = Number(readFileSync(portFile, 'utf8').split(/\r?\n/)[0]);
    const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json());
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(String(data));
      if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) consoleEvents.push(message.params.type);
      if (!message.id || !pending.has(message.id)) return;
      const handlers = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) handlers.reject(new Error(message.error.message)); else handlers.resolve(message.result);
    };
    const command = (method, params = {}) => {
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('Browser command timed out.')); }, 15_000);
        pending.set(id, {
          resolve: (result) => { clearTimeout(timer); resolve(result); },
          reject: (error) => { clearTimeout(timer); reject(error); },
        });
        try { socket.send(JSON.stringify({ id, method, params })); }
        catch { pending.get(id)?.reject(new Error('Browser command failed.')); pending.delete(id); }
      });
    };
    const evaluate = async (expression) => {
      const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error('browser evaluation failed');
      return result.result.value;
    };
    const eventually = async (predicate, label, timeout = 45_000) => {
      const started = Date.now();
      while (Date.now() - started < timeout) {
        if (await predicate()) return;
        await delay(100);
      }
      throw new Error(`Timed out: ${label}`);
    };
    const text = () => evaluate('document.body?.innerText ?? ""');
    const hash = () => evaluate('window.location.hash');
    const fill = (id, value) => evaluate(`(() => { const element=document.getElementById(${JSON.stringify(id)}); if(!element)return false; const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(element,${JSON.stringify(value)}); element.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
    const clickText = (value) => evaluate(`(() => { const element=[...document.querySelectorAll('button,[role=button],[role=tab]')].find((item)=>item.textContent?.trim()===${JSON.stringify(value)}); if(!element)return false; element.click(); return true; })()`);
    const clickLabelPrefix = (value) => evaluate(`(() => { const elements=[...document.querySelectorAll('button,[role=button]')].filter((item)=>item.getAttribute('aria-label')?.startsWith(${JSON.stringify(value)})); if(elements.length!==1)return false; elements[0].click(); return true; })()`);
    const reload = async () => { await command('Page.reload', { ignoreCache: true }); };
    await command('Page.enable');
    await command('Runtime.enable');
    await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await command('Page.navigate', { url: initialUrl });
    stage = 'scenario';
    const result = await proof({ eventually, text, hash, fill, clickText, clickLabelPrefix, reload, evaluate, setStage: (value) => { stage = value; } });
    assert.deepEqual(consoleEvents, [], 'hosted invitation browser console events');
    return result;
  } catch {
    throw new Error(`hosted invitation browser proof failed during ${stage}`);
  } finally {
    for (const handlers of pending.values()) handlers.reject(new Error('Browser proof ended.'));
    pending.clear();
    socket?.close();
    chrome.kill();
    await delay(500);
    rmSync(profile, { recursive: true, force: true });
  }
}

function inviteUrl(token) {
  return `${APP_ORIGIN}/#/invite/${token.browser}`;
}

async function createCopiedInvitation(owner, inviteeEmail) {
  sensitiveValues.add(inviteeEmail);
  const copiedUrl = await withBrowser(APP_ORIGIN, async ({ eventually, text, fill, clickText, clickLabelPrefix, evaluate, setStage }) => {
    setStage('owner sign-in');
    await eventually(async () => (await text()).includes('Welcome back'), 'owner sign-in form');
    assert.equal(await fill('auth-email', owner.email), true, 'owner email input unavailable');
    assert.equal(await fill('auth-password', owner.password), true, 'owner password input unavailable');
    assert.equal(await clickText('Sign in'), true, 'owner sign-in unavailable');
    await eventually(async () => await evaluate(`Boolean(document.querySelector('[aria-label^="Family and account."]'))`), 'owner account button');
    assert.equal(await clickLabelPrefix('Family and account.'), true, 'owner account button unavailable');
    await eventually(async () => (await text()).includes('Invite someone'), 'owner invitation form');
    setStage('owner creates copied link');
    assert.equal(await fill('family-invite-email-input', inviteeEmail), true, 'owner invitation email unavailable');
    assert.equal(await clickText('Create invitation link'), true, 'create invitation link unavailable');
    setStage('owner waits for copied link');
    await eventually(async () => (await text()).includes('Copy invitation link'), 'copy invitation link action');
    setStage('owner captures displayed link');
    const linkExpression = `(document.body.innerText.match(/https:\\/\\/loopedin-family\\.netlify\\.app\\/#\\/invite\\/[A-Za-z0-9_-]{43}/)?.[0]??null)`;
    const displayedLink = await evaluate(linkExpression);
    assert.equal(typeof displayedLink, 'string', 'displayed invitation link unavailable');
    return displayedLink;
  });
  const match = copiedUrl.match(new RegExp(`^${APP_ORIGIN.replaceAll('.', '\\.')}\\/#\\/invite\\/([A-Za-z0-9_-]{42}[AEIMQUYcgkosw048])$`));
  assert.ok(match, 'copied invitation URL was not canonical');
  sensitiveValues.add(copiedUrl);
  sensitiveValues.add(match[1]);
  return { browser: match[1] };
}

async function proveExistingRecipient(token, recipient, familyName, wrongAccount) {
  const route = inviteUrl(token);
  await withBrowser(route, async ({ eventually, text, hash, fill, clickText, reload, evaluate, setStage }) => {
    setStage('valid signed-out preview');
    await eventually(async () => (await text()).includes(`Join ${familyName}`), 'valid signed-out invitation preview');
    assert.equal(await hash(), `#/invite/${token.browser}`, 'invitation route mismatch');
    await reload();
    await eventually(async () => (await text()).includes(`Join ${familyName}`), 'invitation preview after reload');
    assert.equal(await hash(), `#/invite/${token.browser}`, 'invitation route lost after reload');
    setStage('wrong-account rejection and recovery');
    assert.equal(await fill('auth-email', wrongAccount.email), true, 'wrong-account email input unavailable');
    assert.equal(await fill('auth-password', wrongAccount.password), true, 'wrong-account password input unavailable');
    assert.equal(await clickText('Sign in'), true, 'wrong-account sign-in unavailable');
    await eventually(async () => (await text()).includes('Sign out to join as the invited person'), 'wrong-account recovery action');
    assert.equal(await clickText('Accept invitation'), true, 'wrong-account acceptance action unavailable');
    await eventually(async () => (await text()).includes('We couldn’t add you to this family because this invitation is for'), 'wrong-account denial');
    assert.equal(await hash(), `#/invite/${token.browser}`, 'wrong-account denial lost invitation route');
    assert.equal(await clickText('Sign out to join as the invited person'), true, 'wrong-account sign-out unavailable');
    await eventually(async () => (await text()).includes('Welcome back') && (await text()).includes(`Join ${familyName}`), 'signed-out invited-account recovery');
    assert.equal(await hash(), `#/invite/${token.browser}`, 'account switch lost invitation route');
    setStage('recipient sign-in');
    assert.equal(await fill('auth-email', recipient.email), true, 'recipient email input unavailable');
    assert.equal(await fill('auth-password', recipient.password), true, 'recipient password input unavailable');
    assert.equal(await clickText('Sign in'), true, 'recipient sign-in unavailable');
    await eventually(async () => (await text()).includes('Accept invitation'), 'authenticated invitation acceptance');
    setStage('recipient acceptance');
    assert.equal(await clickText('Accept invitation'), true, 'accept invitation unavailable');
    await eventually(async () => (await text()).includes(`You joined ${familyName}.`), 'accepted invitation confirmation');
    await eventually(async () => (await hash()) === '#/home', 'accepted invitation route cleared');
    await reload();
    await eventually(async () => (await hash()) === '#/home' &&
      await evaluate(`Boolean(document.querySelector('[aria-label^="Family and account."]'))`) &&
      (await text()).includes(familyName), 'accepted session restoration');
  });
}

async function proveRevokedAndExpired(owner, groupId, runId) {
  const email = emailFor(runId, 'signup');
  const locate = async (token) => {
    const hash = crypto.createHash('sha256').update(Buffer.from(token.browser, 'base64url')).digest('hex');
    sensitiveValues.add(hash);
    const rows = await required(request(`/rest/v1/loopedin_group_invitations?group_id=eq.${safeUuid(groupId)}&invited_by=eq.${safeUuid(owner.id)}&token_hash=eq.%5Cx${hash}&select=id,status`, { token: secretKey }), 'locate exact synthetic invitation');
    assert.equal(rows.length, 1, 'exact synthetic invitation not found');
    assert.equal(rows[0].status, 'pending', 'synthetic invitation is not pending');
    return safeUuid(rows[0].id);
  };
  const revokedToken = await createCopiedInvitation(owner, email);
  const revokedId = await locate(revokedToken);
  const revoked = await required(rpc('loopedin_revoke_group_invite', owner.token, { target_invitation_id: revokedId }), 'revoke synthetic invitation');
  assert.equal(revoked.ok, true, 'synthetic invitation revoke refused');
  await proveUnavailable(revokedToken, 'revoked invitation unavailable');

  const expiredToken = await createCopiedInvitation(owner, email);
  const expiredId = await locate(expiredToken);
  dbQuery(`
    do $$
    declare changed integer;
    begin
      update public.loopedin_group_invitations invitation
      set created_at = least(invitation.created_at, now() - interval '2 seconds'),
          expires_at = now() - interval '1 second'
      where invitation.id = '${expiredId}'::uuid and invitation.group_id = '${safeUuid(groupId)}'::uuid
        and invitation.invited_by = '${safeUuid(owner.id)}'::uuid and invitation.status = 'pending'
        and exists (
          select 1 from public.loopedin_groups family join auth.users actor on actor.id = family.created_by
          where family.id = invitation.group_id and actor.id = invitation.invited_by
            and family.name = 'LoopedIn invitation QA ${runId}'
            and family.description = 'loopedin-hosted-invitation-qa:${runId}'
            and actor.raw_app_meta_data->>'${QA_MARKER}' = 'true'
            and actor.raw_app_meta_data->>'loopedin_qa_run_id' = '${runId}'
            and actor.raw_app_meta_data->>'loopedin_qa_role' = 'owner'
        );
      get diagnostics changed = row_count;
      if changed <> 1 then raise exception 'Synthetic invitation expiry guard refused'; end if;
    end $$;
  `, 'expire exact marked synthetic invitation');
  await proveUnavailable(expiredToken, 'expired invitation unavailable');
}

async function proveUnavailable(token, label) {
  await withBrowser(inviteUrl(token), async ({ eventually, text, hash, reload, setStage }) => {
    setStage(label);
    await eventually(async () => (await text()).includes('This invitation isn’t available.'), label);
    assert.equal(await hash(), `#/invite/${token.browser}`, `${label} route mismatch`);
    await reload();
    await eventually(async () => (await text()).includes('This invitation isn’t available.'), `${label} after reload`);
  });
}

async function cleanup(runId, runStartedAt, users, groupId) {
  const failures = [];
  let listed = [];
  try { listed = await adminUsersWithRetry('discover marked users for cleanup'); } catch { failures.push('Auth cleanup discovery'); }
  const expected = new Map([
    ['owner', { email: emailFor(runId, 'owner'), displayName: displayNameFor(runId, 'owner') }],
    ['recipient', { email: emailFor(runId, 'recipient'), displayName: displayNameFor(runId, 'recipient') }],
    ['signup', { email: emailFor(runId, 'signup'), displayName: displayNameFor(runId, 'signup') }],
  ]);
  for (const candidate of listed) {
    const role = candidate.app_metadata?.loopedin_qa_role;
    const expectedRole = expected.get(role);
    if (candidate.app_metadata?.[QA_MARKER] === true && candidate.app_metadata?.loopedin_qa_run_id === runId) {
      if (!expectedRole || candidate.email?.toLowerCase() !== expectedRole.email) failures.push('Auth marker mismatch');
      else users[role] = { ...users[role], id: safeUuid(candidate.id), role };
    }
  }
  if (!users.signup?.id) {
    const expectedSignup = expected.get('signup');
    const candidate = listed.find((item) => item.email?.toLowerCase() === expectedSignup.email);
    if (candidate) {
      if (candidate.user_metadata?.display_name !== expectedSignup.displayName
        || Date.parse(candidate.created_at) < runStartedAt - 5_000) {
        failures.push('unmarked signup cleanup guard');
      } else {
        const marked = await request(`/auth/v1/admin/users/${safeUuid(candidate.id)}`, {
          token: secretKey, method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ app_metadata: markerFor(runId, 'signup') }),
        }).catch(() => null);
        if (!marked?.response.ok || !isMarked(marked.body, runId, 'signup')) failures.push('signup marker adoption');
        else users.signup = { id: safeUuid(candidate.id), role: 'signup' };
      }
    }
  }
  const ids = Object.values(users).map((user) => user?.id).filter(Boolean).map(safeUuid);
  if (users.owner?.id) {
    try {
      const discoveredGroups = dbQuery(`
        select family.id from public.loopedin_groups family
        join auth.users owner on owner.id = family.created_by
        where family.created_by = '${safeUuid(users.owner.id)}'::uuid
          and family.name = 'LoopedIn invitation QA ${runId}'
          and family.description = 'loopedin-hosted-invitation-qa:${runId}'
          and owner.raw_app_meta_data->>'${QA_MARKER}' = 'true'
          and owner.raw_app_meta_data->>'loopedin_qa_run_id' = '${runId}'
          and owner.raw_app_meta_data->>'loopedin_qa_role' = 'owner';
      `, 'discover synthetic invitation family');
      if (discoveredGroups.length > 1) throw new Error('multiple synthetic invitation families discovered');
      const discoveredGroupId = discoveredGroups[0]?.id ? safeUuid(discoveredGroups[0].id) : undefined;
      if (groupId && discoveredGroupId !== safeUuid(groupId)) throw new Error('synthetic family response/discovery mismatch');
      const cleanupGroupId = groupId ? safeUuid(groupId) : discoveredGroupId;
      const groupCleanup = cleanupGroupId ? `
          if not exists (
            select 1 from public.loopedin_groups family
            join auth.users owner on owner.id = family.created_by
            where family.id = '${cleanupGroupId}'::uuid
              and family.created_by = '${safeUuid(users.owner.id)}'::uuid
              and family.name = 'LoopedIn invitation QA ${runId}'
              and family.description = 'loopedin-hosted-invitation-qa:${runId}'
              and owner.raw_app_meta_data->>'${QA_MARKER}' = 'true'
              and owner.raw_app_meta_data->>'loopedin_qa_run_id' = '${runId}'
              and owner.raw_app_meta_data->>'loopedin_qa_role' = 'owner'
          ) then raise exception 'synthetic family marker mismatch'; end if;
          delete from public.loopedin_groups where id = '${cleanupGroupId}'::uuid;
      ` : '';
      dbQuery(`
        do $$
        begin
          if not exists (
            select 1 from auth.users owner
            where owner.id = '${safeUuid(users.owner.id)}'::uuid
              and owner.raw_app_meta_data->>'${QA_MARKER}' = 'true'
              and owner.raw_app_meta_data->>'loopedin_qa_run_id' = '${runId}'
              and owner.raw_app_meta_data->>'loopedin_qa_role' = 'owner'
          ) then raise exception 'synthetic owner marker mismatch'; end if;
          ${groupCleanup}
          delete from loopedin_private.loopedin_group_creation_entitlements
          where user_id = '${safeUuid(users.owner.id)}'::uuid;
        end $$;
      `, 'clean synthetic invitation database state');
    } catch { failures.push('database cleanup'); }
  }
  for (const role of ROLES) {
    const user = users[role];
    if (!user?.id) continue;
    const current = await request(`/auth/v1/admin/users/${safeUuid(user.id)}`, { token: secretKey }).catch(() => null);
    if (!current?.response.ok) continue;
    if (!isMarked(current.body, runId, role) || current.body.email?.toLowerCase() !== emailFor(runId, role)) {
      failures.push('Auth deletion guard');
      continue;
    }
    const removed = await request(`/auth/v1/admin/users/${safeUuid(user.id)}`, { token: secretKey, method: 'DELETE' }).catch(() => null);
    if (!removed?.response.ok && removed?.response.status !== 404) failures.push('Auth deletion');
  }
  let markedResidue = [];
  try {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      markedResidue = (await adminUsersWithRetry('verify marked Auth residue'))
        .filter((user) => user.app_metadata?.[QA_MARKER] === true && user.app_metadata?.loopedin_qa_run_id === runId);
      if (markedResidue.length === 0) break;
      if (attempt < 4) await delay(attempt * 250);
    }
  } catch { failures.push('Auth residue verification'); }
  if (markedResidue.length !== 0) failures.push('Auth residue');
  if (ids.length) {
    try {
      const idList = ids.map((id) => `'${id}'::uuid`).join(',');
      const [residue] = dbQuery(`
        select
          (select count(*) from auth.users where id in (${idList}))::int as users,
          (select count(*) from public.loopedin_profiles where id in (${idList}))::int as profiles,
          (select count(*) from public.loopedin_group_members where user_id in (${idList}))::int as memberships,
          (select count(*) from public.loopedin_groups where created_by in (${idList}))::int as groups,
          (select count(*) from public.loopedin_group_invitations where invited_by in (${idList}) or responded_by in (${idList}))::int as invitations,
          (select count(*) from loopedin_private.loopedin_group_creation_entitlements where user_id in (${idList}))::int as entitlements,
          (select count(*) from storage.objects where owner_id::text in (${ids.map((id) => `'${id}'`).join(',')}))::int as objects;
      `, 'verify synthetic invitation residue');
      if (!residue || Object.values(residue).some((count) => count !== 0)) failures.push('nonzero residue');
    } catch { failures.push('residue verification'); }
  }
  if (failures.length) throw new Error([...new Set(failures)].join(', '));
}

async function run() {
  const runStartedAt = Date.now();
  const runId = `iqa-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
  assert.match(runId, /^[a-z0-9-]{12,47}$/);
  const users = {};
  let groupId;
  let summary;
  let primaryError;
  let fixturesStarted = false;
  try {
    await verifyHostedRelease();
    fixturesStarted = true;
    users.owner = await createConfirmedUser(runId, 'owner');
    users.recipient = await createConfirmedUser(runId, 'recipient');
    dbQuery(`
      insert into loopedin_private.loopedin_group_creation_entitlements(user_id)
      select '${users.owner.id}'::uuid
      where exists (
        select 1 from auth.users where id = '${users.owner.id}'::uuid
          and raw_app_meta_data->>'${QA_MARKER}' = 'true'
          and raw_app_meta_data->>'loopedin_qa_run_id' = '${runId}'
          and raw_app_meta_data->>'loopedin_qa_role' = 'owner'
      ) on conflict (user_id) do nothing;
    `, 'entitle synthetic invitation owner');
    const group = await required(rpc('loopedin_create_group', users.owner.token, {
      target_name: `LoopedIn invitation QA ${runId}`,
      target_description: `loopedin-hosted-invitation-qa:${runId}`,
      target_kind: 'family', target_creation_key: crypto.randomUUID(),
    }), 'create synthetic invitation family');
    groupId = safeUuid(group.id);
    const existingToken = await createCopiedInvitation(users.owner, users.recipient.email);
    await proveExistingRecipient(existingToken, users.recipient, group.name, users.owner);
    const membership = await required(request(`/rest/v1/loopedin_group_members?group_id=eq.${groupId}&user_id=eq.${users.recipient.id}&select=user_id,role`, { token: secretKey }), 'verify recipient membership');
    assert.deepEqual(membership, [{ user_id: users.recipient.id, role: 'member' }], 'accepted recipient membership');
    await proveUnavailable(existingToken, 'consumed invitation unavailable');
    await proveRevokedAndExpired(users.owner, groupId, runId);

    summary = {
      runId,
      sourceCommit: candidate.manifest.sourceCommit, artifactSha256: candidate.manifest.artifactSha256,
      releaseId: candidate.manifest.releaseId, approvalReference: candidate.approvalReference,
      validPreview: true, deepLinkReload: true, existingRecipientAccepted: true,
      sessionRestored: true, consumedUnavailable: true, signupConfirmationRequired: false,
      wrongAccountRecovered: true, revokedUnavailable: true, expiredUnavailable: true,
      signupDeliveryGateNotRun: true,
      objectFree: true,
    };
  } catch (error) {
    primaryError = error;
  } finally {
    try {
      if (fixturesStarted) await cleanup(runId, runStartedAt, users, groupId);
      if (summary) console.log(JSON.stringify({ ...summary, residue: 0 }));
    } catch (cleanupError) {
      primaryError = new Error(primaryError ? `${redact(primaryError)}; cleanup failed` : `cleanup failed: ${redact(cleanupError)}`);
    }
  }
  if (primaryError) throw primaryError;
}

try {
  await run();
} catch (error) {
  console.error(`hosted staging invitation QA failed: ${redact(error)}`);
  process.exitCode = 1;
}
