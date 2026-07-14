import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const requiredDocs = [
  'docs/01-executive-summary.md',
  'docs/02-market-research.md',
  'docs/03-product-proposal.md',
  'docs/04-spec-roadmap.md',
  'docs/05-visual-direction.md',
  'docs/06-wireframe.html',
  'docs/07-product-prototype.html',
  'docs/08-brand-package.md',
  'docs/09-landing-page.html',
  'docs/10-loop-architecture-and-workflow.md',
  'docs/architecture.md',
  'docs/adr/001-data-source-and-session-boundary.md',
  'evals/review-log.md'
];

test('concept documentation artifacts exist', () => {
  for (const rel of requiredDocs) {
    assert.equal(fs.existsSync(path.join(root, rel)), true, `${rel} should exist`);
  }
});

test('accepted ADRs use the numeric filename convention and required sections', () => {
  const adrDir = path.join(root, 'docs/adr');
  const adrs = fs.readdirSync(adrDir).filter((file) => file.endsWith('.md'));

  assert.ok(adrs.length > 0, 'at least one ADR should exist');
  for (const file of adrs) {
    assert.match(file, /^\d{3}-[a-z0-9-]+\.md$/);
  }

  const adr = fs.readFileSync(path.join(adrDir, '001-data-source-and-session-boundary.md'), 'utf8');
  for (const section of ['Status', 'Context', 'Problem', 'Decision', 'Alternatives', 'Consequences', 'Validation', 'Evidence links']) {
    assert.match(adr, new RegExp(`## ${section}`));
  }
  assert.match(adr, /## Assumptions and inferences/);
  assert.match(adr, /## Non-decisions/);
});

test('engineering campaign contains exactly 17 ordered OPORDs with executable task contracts', () => {
  const opordDir = path.join(root, 'docs/opords');
  const files = fs.readdirSync(opordDir)
    .filter((file) => /^\d{3}-[a-z0-9-]+\.md$/.test(file))
    .sort();

  assert.equal(files.length, 17);
  assert.deepEqual(files.map((file) => file.slice(0, 3)), Array.from({ length: 17 }, (_, index) => String(index + 1).padStart(3, '0')));
  assert.equal(new Set(files.map((file) => file.replace(/^\d{3}-/, ''))).size, 17);
  assert.equal(files.includes('015-ci-release-backup-data-lifecycle.md'), false);

  const headings = [
    'Status',
    'Situation and evidence',
    'Mission/objective',
    'Dependencies',
    'Non-goals',
    'Authorized territory (files/systems)',
    'Forbidden territory',
    'Older-adult usability guardrail',
    'Execution',
    'Acceptance criteria',
    'Validation commands/evidence',
    'Stop conditions/authorization limits',
    'Risks/follow-ups',
    'Definition of done'
  ];

  const taskIds = new Set();
  for (const file of files) {
    const content = fs.readFileSync(path.join(opordDir, file), 'utf8');
    assert.match(content, /^# (?:FAMILY-LOOP-)?OPORD(?:-| )\d{3} — .+/m, `${file} needs a unique titled order`);
    for (const heading of headings) {
      assert.match(content, new RegExp(`^## ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'), `${file} missing ${heading}`);
    }
    assert.match(content, /Always-local/i, `${file} must separate always-local evidence`);
    assert.match(content, /Conditional-(staging|mobile-web|human)/i, `${file} must separate conditional evidence`);
    assert.match(content, /^Depends on: (?:None|OPORD-\d{3}(?:, OPORD-\d{3})*)$/m, `${file} needs machine-readable dependencies`);
    const lines = content.split(/\r?\n/);
    const header = '| Task ID | Wave | Owner | Model/tier | Owned files/systems | Instructions | Task acceptance |';
    const headerIndex = lines.indexOf(header);
    assert.ok(headerIndex >= 0, `${file} needs the task table header`);
    const rows = [];
    for (const line of lines.slice(headerIndex + 2)) {
      if (!line.startsWith('|')) break;
      const fields = line.split('|').slice(1, -1).map((field) => field.trim());
      assert.equal(fields.length, 7, `${file} task row needs exactly seven fields`);
      for (const field of fields) assert.ok(field.length > 0, `${file} task fields must be populated`);
      assert.match(fields[0], /^O\d{3}-T\d+$/, `${file} task ID should parse`);
      assert.match(fields[1], /^[1-9]\d*$/, `${fields[0]} needs a positive wave`);
      assert.match(fields[3], /^(?:General|Colonel|Sergeant|Private) \/ gpt-[a-z0-9.-]+$/, `${fields[0]} needs explicit rank and model`);
      for (const fieldIndex of [4, 5, 6]) assert.ok(fields[fieldIndex].length >= 3, `${fields[0]} needs concrete task territory and acceptance`);
      rows.push(fields);
    }
    assert.ok(rows.length >= 3, `${file} needs at least three bounded tasks`);
    for (const row of rows) {
      assert.equal(taskIds.has(row[0]), false, `${row[0]} must be globally unique`);
      taskIds.add(row[0]);
    }
  }
  assert.equal(taskIds.size, 60, 'campaign must retain exactly 60 bounded tasks');
});

test('OPORD dependency graph is resolvable and acyclic', () => {
  const opordDir = path.join(root, 'docs/opords');
  const files = fs.readdirSync(opordDir).filter((file) => /^\d{3}-[a-z0-9-]+\.md$/.test(file));
  const ids = new Set(files.map((file) => `OPORD-${file.slice(0, 3)}`));
  const graph = new Map();

  for (const file of files) {
    const id = `OPORD-${file.slice(0, 3)}`;
    const content = fs.readFileSync(path.join(opordDir, file), 'utf8');
    const match = content.match(/^Depends on: (None|OPORD-\d{3}(?:, OPORD-\d{3})*)$/m);
    assert.ok(match, `${file} dependency line should parse`);
    const dependencies = match[1] === 'None' ? [] : match[1].split(', ');
    for (const dependency of dependencies) {
      assert.ok(ids.has(dependency), `${file} references missing ${dependency}`);
      assert.notEqual(dependency, id, `${file} cannot depend on itself`);
    }
    graph.set(id, dependencies);
  }

  const readme = fs.readFileSync(path.join(opordDir, 'README.md'), 'utf8');
  const adjacency = new Map([...readme.matchAll(/^(OPORD-\d{3}): (None|OPORD-\d{3}(?:, OPORD-\d{3})*)$/gm)].map((match) => [match[1], match[2] === 'None' ? [] : match[2].split(', ')]));
  assert.equal(adjacency.size, ids.size, 'README adjacency list must include every OPORD once');
  const registry = new Map();
  for (const match of readme.matchAll(/^\| (\d{3}) \| \[[^\]]+\]\((\d{3}-[a-z0-9-]+\.md)\) \| (None|OPORD-\d{3}(?:, OPORD-\d{3})*) \|/gm)) {
    assert.equal(match[1], match[2].slice(0, 3), 'README registry ID and filename should agree');
    registry.set(`OPORD-${match[1]}`, match[3] === 'None' ? [] : match[3].split(', '));
  }
  assert.equal(registry.size, ids.size, 'README registry must include every OPORD once');
  for (const [id, dependencies] of graph) {
    assert.deepEqual(adjacency.get(id), dependencies, `${id} README adjacency must match its document`);
    assert.deepEqual(registry.get(id), dependencies, `${id} README registry must match its document`);
  }

  const orderMatch = readme.match(/^Canonical execution order: (OPORD-\d{3}(?: -> OPORD-\d{3})*)$/m);
  assert.ok(orderMatch, 'README needs one machine-readable canonical execution order');
  const order = orderMatch[1].split(' -> ');
  assert.equal(order.length, ids.size);
  assert.equal(new Set(order).size, ids.size, 'canonical order must include each ID once');
  for (const id of ids) assert.ok(order.includes(id), `canonical order missing ${id}`);
  const position = new Map(order.map((id, index) => [id, index]));
  for (const [id, dependencies] of graph) {
    for (const dependency of dependencies) assert.ok(position.get(dependency) < position.get(id), `${dependency} must precede ${id}`);
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    assert.equal(visiting.has(id), false, `dependency cycle reaches ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of graph.get(id)) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of graph.keys()) visit(id);
});

test('OPORD index resolves dependencies and covers the full engineering scope', () => {
  const indexPath = path.join(root, 'docs/opords/README.md');
  assert.equal(fs.existsSync(indexPath), true);
  const content = fs.readFileSync(indexPath, 'utf8');
  const links = [...content.matchAll(/\]\((\d{3}-[a-z0-9-]+\.md)\)/g)].map((match) => match[1]);
  assert.equal(new Set(links).size, 17);
  for (const link of links) assert.equal(fs.existsSync(path.join(root, 'docs/opords', link)), true, `${link} should resolve`);

  for (const domain of [
    'Older-adult accessibility', 'Frontend navigation', 'Authentication', 'API/server',
    'Database, RLS, migrations', 'Events, RSVP, and calendar', 'Chat and realtime',
    'Images and private object storage', 'Reminders and notifications', 'Memories and recaps',
    'Offline behavior', 'Security, privacy, observability', 'mobile-web, accessibility, and usability tests',
    'CI quality gates', 'Deployment, release, promotion, and rollback', 'Backup, restore, retention, export, and deletion'
  ]) assert.match(content, new RegExp(domain, 'i'), `coverage matrix missing ${domain}`);
});

test('OPORD evidence dispositions stay reconciled with the configured local proof boundary', () => {
  const opordDir = path.join(root, 'docs/opords');
  const files = fs.readdirSync(opordDir).filter((file) => /^\d{3}-[a-z0-9-]+\.md$/.test(file));
  const index = fs.readFileSync(path.join(opordDir, 'README.md'), 'utf8');

  assert.match(index, /## 2026-07-14 evidence disposition/);
  assert.match(index, /substantive lint[\s\S]*29376063946[\s\S]*12f760d[\s\S]*administrator-required checks `NOT RUN`/i);
  assert.match(index, /Physical iOS\/Android.+NOT RUN/i);
  assert.doesNotMatch(index, /Docker is unavailable|local Supabase stack has not been exercised/i);

  for (const file of files) {
    const content = fs.readFileSync(path.join(opordDir, file), 'utf8');
    assert.match(content, /^### Acceptance disposition — 2026-07-14$/m, `${file} needs current criterion-level evidence`);
    assert.doesNotMatch(content, /Docker is unavailable|Docker and verified remote deployment are absent|Memories are still fixture-backed|upload is not wired/i, `${file} contains a stale implementation fact`);
  }
});

test('active campaign is responsive-web and preserves renamed testing and release orders', () => {
  const opordDir = path.join(root, 'docs/opords');
  const index = fs.readFileSync(path.join(opordDir, 'README.md'), 'utf8');
  const vision = fs.readFileSync(path.join(root, 'docs/vision.md'), 'utf8');
  const architecture = fs.readFileSync(path.join(root, 'docs/architecture.md'), 'utf8');

  for (const content of [index, vision, architecture]) {
    assert.match(content, /responsive web app/i);
    assert.match(content, /phone browser/i);
  }
  assert.match(index, /desktop web.+secondary/i);
  assert.match(index, /014-test-pyramid-mobile-web-accessibility-usability\.md/);
  assert.match(index, /016-web-release-deployment-rollback\.md/);
  assert.equal(fs.existsSync(path.join(opordDir, '014-test-pyramid-native-accessibility-usability.md')), false);
  assert.equal(fs.existsSync(path.join(opordDir, '016-release-deployment-rollback.md')), false);

  const media = fs.readFileSync(path.join(opordDir, '009-private-media-lifecycle.md'), 'utf8');
  const testing = fs.readFileSync(path.join(opordDir, '014-test-pyramid-mobile-web-accessibility-usability.md'), 'utf8');
  const release = fs.readFileSync(path.join(opordDir, '016-web-release-deployment-rollback.md'), 'utf8');
  assert.doesNotMatch(media, /require(?:ment|d)?.{0,30}expo-image-picker/i);
  assert.doesNotMatch(testing, /native (?:device|app|emulator).{0,30}(?:required|requirement|gate)/i);
  assert.doesNotMatch(release, /(?:EAS|app store|Play Store).{0,30}(?:release|required|gate)/i);
  assert.match(release, /(?:hosting|hosted)/i);
  assert.match(release, /(?:SPA|history) fallback/i);
});

test('spec roadmap includes MVP and roadmap phases', () => {
  const content = fs.readFileSync(path.join(root, 'docs/04-spec-roadmap.md'), 'utf8');
  assert.match(content, /HISTORICAL CONCEPT ROADMAP/);
  assert.match(content, /SUPERSEDED PLATFORM DIRECTION/);
  for (const link of ['vision.md', 'architecture.md', 'opords/README.md']) assert.match(content, new RegExp(link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(content, /Core MVP feature specification/);
  assert.match(content, /Phase 1 — MVP build/);
  assert.match(content, /Phase 2 — retention and polish/);
});

test('wireframe and prototype concept boards include LoopedIn framing', () => {
  const wireframe = fs.readFileSync(path.join(root, 'docs/06-wireframe.html'), 'utf8');
  const prototype = fs.readFileSync(path.join(root, 'docs/07-product-prototype.html'), 'utf8');
  assert.match(wireframe, /LoopedIn — Visual Concept Board/);
  assert.match(wireframe, /Plan it\. Live it\. Remember it\./);
  assert.match(prototype, /LoopedIn — Interactive Product Prototype/);
  assert.match(prototype, /Event-centered habit loop/);
});

test('brand package and landing page contain brand and product positioning', () => {
  const brand = fs.readFileSync(path.join(root, 'docs/08-brand-package.md'), 'utf8');
  const landing = fs.readFileSync(path.join(root, 'docs/09-landing-page.html'), 'utf8');
  assert.match(brand, /Brand platform/);
  assert.match(brand, /Voice and messaging/);
  assert.match(landing, /LoopedIn — The private social calendar for real life/);
  assert.match(landing, /Plan it\. Chat in context\. Keep the memory\./);
});

test('architecture workflow doc covers app structure, sample data, and contributor flow', () => {
  const architecture = fs.readFileSync(path.join(root, 'docs/10-loop-architecture-and-workflow.md'), 'utf8');
  assert.match(architecture, /## Responsive web app structure/);
  assert.match(architecture, /Expo \+ React Native Web/);
  assert.match(architecture, /phone browsers/);
  assert.match(architecture, /desktop web.+secondary/i);
  assert.doesNotMatch(architecture, /push fanout/i);
  assert.match(architecture, /Web Notifications API.+service workers.+future work requiring separate authorization/i);
  assert.match(architecture, /## Screen model for the MVP foundation/);
  assert.match(architecture, /## Sample data strategy/);
  assert.match(architecture, /## Recommended implementation workflow for agent\/subagent teams/);
  assert.match(architecture, /## Local run and test commands/);
});

test('active OPORDs do not require native application testing', () => {
  const opordDir = path.join(root, 'docs/opords');
  const files = fs.readdirSync(opordDir).filter((file) => /^\d{3}-[a-z0-9-]+\.md$/.test(file));
  const prohibited = [
    /Native deep-link tests/i,
    /Native\/human tests/i,
    /native smoke/i,
    /both native platforms/i,
    /iOS\/Android builds/i
  ];
  for (const file of files) {
    const content = fs.readFileSync(path.join(opordDir, file), 'utf8');
    for (const pattern of prohibited) assert.doesNotMatch(content, pattern, `${file} contains active native-test language`);
  }
});
