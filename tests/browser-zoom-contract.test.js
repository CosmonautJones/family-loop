import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../scripts/check-opord14-real-browser-zoom.mjs', import.meta.url), 'utf8');

test('OPORD 014 uses persisted Chrome browser zoom rather than page or CSS scaling', () => {
  assert.match(source, /default_zoom_level: \{ x: level \}/);
  assert.match(source, /Math\.log\(2\) \/ Math\.log\(1\.2\)/);
  assert.match(source, /zoom\.dpr - expectedDpr/);
  assert.match(source, /zoom\.viewportScale, 1/);
  assert.match(source, /zoomed\.innerWidth \/ baseline\.innerWidth - 0\.5/);
  assert.doesNotMatch(source, /Emulation\.setPageScaleFactor/);
  assert.doesNotMatch(source, /style\.zoom\s*=/);
});

test('OPORD 014 browser-zoom matrix retains roles, core screens, and usability assertions', () => {
  for (const role of ['signed-out', 'owner', 'member', 'outsider']) assert.match(source, new RegExp(`'${role}'`));
  for (const surface of [
    'Reset your password', 'Updates', 'Review upcoming family plans.', 'Create family plan',
    'Family memories', 'Download your data', 'Edit plan', 'Event reminder', 'Thread',
    'Event gallery', 'Add photo', 'Leave family', 'Invite someone',
  ]) assert.ok(source.includes(surface), `matrix should cover ${surface}`);
  assert.match(source, /control\.height >= 48/);
  assert.match(source, /glyphClipped/);
  assert.match(source, /horizontal overflow/);
  assert.match(source, /clipped control/);
  assert.match(source, /history\.back/);
  assert.match(source, /Page\.reload/);
  assert.match(source, /record\.console/);
  assert.match(source, /record\.failedRequests/);
});
