import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

import {inventoryDir, inventoryNames} from './url-inventory.mjs';

// The skill repository owns the canonical public ossrs.io migration contract. This
// repository vendors only the lists the automated checks consume, so a clean clone and
// the isolated Docker build stay reproducible. When the canonical copy is reachable —
// William's workspace, not the build container — prove the vendored subset still
// matches it byte for byte.
const canonicalDir = join(inventoryDir, '..', '..', '..', '..', 'references', 'url-inventory');

if (!existsSync(canonicalDir)) {
  console.log(
    `Inventory sync check skipped: the canonical contract is not present at ${canonicalDir}. ` +
      'The vendored subset is authoritative for this build.',
  );
  process.exit(0);
}

for (const name of inventoryNames) {
  const vendored = readFileSync(join(inventoryDir, `${name}.txt`), 'utf8');
  const canonical = readFileSync(join(canonicalDir, `${name}.txt`), 'utf8');
  assert.equal(
    vendored,
    canonical,
    `references/url-inventory/${name}.txt has drifted from the canonical contract; ` +
      'refresh the vendored copy from the skill repository',
  );
}

console.log(
  `Inventory sync check passed: ${inventoryNames.length} vendored contract lists match the canonical copy.`,
);
