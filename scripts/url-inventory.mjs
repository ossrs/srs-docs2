import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root = join(import.meta.dirname, '..');

// The migration contract is vendored under references/url-inventory so that a clean
// clone — including the isolated Docker build — can validate routes without reaching
// outside the repository. scripts/check-inventory-sync.mjs guards it against drift.
export const inventoryDir = join(root, 'references', 'url-inventory');

// Every inventory list the automated checks consume. Keep this in step with the
// vendored directory; the sync check fails when the two disagree.
export const inventoryNames = [
  'docs-v4',
  'docs-v5',
  'docs-v6',
  'docs-v7',
  'docs-v8',
  'blog-and-tags',
  'standalone-pages',
];

export function inventoryUrls(name) {
  return readFileSync(join(inventoryDir, `${name}.txt`), 'utf8').trim().split('\n');
}
