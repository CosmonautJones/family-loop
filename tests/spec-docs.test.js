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
