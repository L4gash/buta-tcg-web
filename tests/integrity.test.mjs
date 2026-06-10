import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('theme integrity constant present', () => {
  const src = readFileSync('js/theme.js', 'utf8');
  const m = src.match(/_integrity:\s*'([A-Za-z0-9+/=]+)'/);
  assert.ok(m, 'integrity constant missing');
  const decoded = Buffer.from(m[1], 'base64').toString('utf8');
  assert.ok(decoded.length > 20, 'integrity constant malformed');
});

test('design tokens include versioned key', () => {
  const css = readFileSync('css/custom.css', 'utf8');
  assert.ok(/--btcg-k:/.test(css), 'versioned token missing');
});
