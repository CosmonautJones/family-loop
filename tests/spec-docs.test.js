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
    assert.match(content, /Conditional-(staging|native|human)/i, `${file} must separate conditional evidence`);
    assert.match(content, /^Depends on: (?:None|OPORD-\d{3}(?:, OPORD-\d{3})*)$/m, `${file} needs machine-readable dependencies`);
    assert.match(content, /^\| Task ID \| Wave \| Owner \| Model\/tier \| Owned files\/systems \| Instructions \| Task acceptance \|$/m, `${file} needs the task table header`);
    const rows = [...content.matchAll(/^\| (O\d{3}-T\d+) \| [^\n]+$/gm)];
    assert.ok(rows.length >= 3, `${file} needs at least three bounded tasks`);
    for (const row of rows) {
      assert.equal(taskIds.has(row[1]), false, `${row[1]} must be globally unique`);
      taskIds.add(row[1]);
    }
  }
});

test('OPORD dependency graph is resolvable and acyclic', () => {
  const opordDir = path.join(root, 'docs/opords');
  const files = fs.readdirSync(opordDir).filter((file) => /^\d{3}-[a-z0-9-]+\.md$/.test(file));
  const ids = new Set(files.map((file) => `OPORD-${file.slice(0, 3)}`));
  const graph = new Map();
  const expected = new Map(Object.entries({
    'OPORD-001': [],
    'OPORD-002': ['OPORD-001'],
    'OPORD-003': ['OPORD-002', 'OPORD-005', 'OPORD-006'],
    'OPORD-004': ['OPORD-003', 'OPORD-006'],
    'OPORD-005': ['OPORD-002'],
    'OPORD-006': ['OPORD-005'],
    'OPORD-007': ['OPORD-004', 'OPORD-006'],
    'OPORD-008': ['OPORD-007'],
    'OPORD-009': ['OPORD-006', 'OPORD-007'],
    'OPORD-010': ['OPORD-006', 'OPORD-007'],
    'OPORD-011': ['OPORD-007', 'OPORD-008', 'OPORD-009'],
    'OPORD-012': ['OPORD-005', 'OPORD-006', 'OPORD-007', 'OPORD-008', 'OPORD-009', 'OPORD-010', 'OPORD-011'],
    'OPORD-013': ['OPORD-005', 'OPORD-006', 'OPORD-012'],
    'OPORD-014': Array.from({ length: 13 }, (_, index) => `OPORD-${String(index + 1).padStart(3, '0')}`),
    'OPORD-015': ['OPORD-013', 'OPORD-014'],
    'OPORD-016': ['OPORD-015'],
    'OPORD-017': ['OPORD-006', 'OPORD-016']
  }));

  for (const file of files) {
    const id = `OPORD-${file.slice(0, 3)}`;
    const content = fs.readFileSync(path.join(opordDir, file), 'utf8');
    const match = content.match(/^Depends on: (None|OPORD-\d{3}(?:, OPORD-\d{3})*)$/m);
    assert.ok(match, `${file} dependency line should parse`);
    const dependencies = match[1] === 'None' ? [] : match[1].split(', ');
    assert.deepEqual(dependencies, expected.get(id), `${file} must use the campaign dependency graph`);
    for (const dependency of dependencies) {
      assert.ok(ids.has(dependency), `${file} references missing ${dependency}`);
      assert.notEqual(dependency, id, `${file} cannot depend on itself`);
    }
    graph.set(id, dependencies);
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
    'Offline behavior', 'Security, privacy, observability', 'native, accessibility, and usability tests',
    'CI quality gates', 'Deployment, release, promotion, and rollback', 'Backup, restore, retention, export, and deletion'
  ]) assert.match(content, new RegExp(domain, 'i'), `coverage matrix missing ${domain}`);
});

test('spec roadmap includes MVP and roadmap phases', () => {
  const content = fs.readFileSync(path.join(root, 'docs/04-spec-roadmap.md'), 'utf8');
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
  assert.match(architecture, /## Mobile app structure/);
  assert.match(architecture, /## Screen model for the MVP foundation/);
  assert.match(architecture, /## Sample data strategy/);
  assert.match(architecture, /## Recommended implementation workflow for agent\/subagent teams/);
  assert.match(architecture, /## Local run and test commands/);
});
