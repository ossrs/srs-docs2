import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {extname, join, relative} from 'node:path';

const root = join(import.meta.dirname, '..');
const chinesePattern = /[\u3400-\u9fff]/;

function filesBelow(directory, extensions = ['.md', '.mdx']) {
  return readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesBelow(path, extensions);
    return extensions.includes(extname(entry.name)) ? [path] : [];
  });
}

function assertPairedMarkdown(
  sourceDirectory,
  translatedDirectory,
  expectedCount,
  label,
  {requireChinese = true} = {},
) {
  const sourceFiles = filesBelow(sourceDirectory);
  const translatedFiles = filesBelow(translatedDirectory);
  assert.equal(sourceFiles.length, expectedCount, `${label}: unexpected English source count`);
  assert.equal(translatedFiles.length, expectedCount, `${label}: unexpected Chinese source count`);

  const sourcePaths = sourceFiles.map((path) => relative(sourceDirectory, path)).sort();
  const translatedPaths = translatedFiles.map((path) => relative(translatedDirectory, path)).sort();
  assert.deepEqual(translatedPaths, sourcePaths, `${label}: English/Chinese paths differ`);

  for (const relativePath of sourcePaths) {
    const source = readFileSync(join(sourceDirectory, relativePath), 'utf8');
    const translation = readFileSync(join(translatedDirectory, relativePath), 'utf8');
    assert.notEqual(translation, source, `${label}: translation equals English: ${relativePath}`);
    if (requireChinese) {
      assert(chinesePattern.test(translation), `${label}: no Chinese text: ${relativePath}`);
    }
  }
}

const docTrees = [
  ['docs', 'i18n/zh-cn/docusaurus-plugin-content-docs/current', 92, 'v8/current docs'],
  ['versioned_docs/version-4.0', 'i18n/zh-cn/docusaurus-plugin-content-docs/version-4.0', 81, 'v4 docs'],
  ['versioned_docs/version-5.0', 'i18n/zh-cn/docusaurus-plugin-content-docs/version-5.0', 89, 'v5 docs'],
  ['versioned_docs/version-6.0', 'i18n/zh-cn/docusaurus-plugin-content-docs/version-6.0', 89, 'v6 docs'],
  ['versioned_docs/version-7.0', 'i18n/zh-cn/docusaurus-plugin-content-docs/version-7.0', 92, 'v7 docs'],
];
for (const [source, translated, count, label] of docTrees) {
  assertPairedMarkdown(join(root, source), join(root, translated), count, label);
}

assertPairedMarkdown(
  join(root, 'blog'),
  join(root, 'i18n/zh-cn/docusaurus-plugin-content-blog'),
  34,
  'blog posts',
  {requireChinese: false},
);

// The legacy project localizes every authored standalone content page. Its
// React homepage is localized through translation IDs, and markdown-page.md is
// an upstream Docusaurus example that intentionally falls back to English.
const pageSource = join(root, 'src/pages');
const pageTranslation = join(root, 'i18n/zh-cn/docusaurus-plugin-content-pages');
const translatedPages = filesBelow(pageTranslation);
assert.equal(translatedPages.length, 11, 'Unexpected Chinese standalone-page count');
let chinesePageCount = 0;
for (const translatedPath of translatedPages) {
  const relativePath = relative(pageTranslation, translatedPath);
  const sourcePath = join(pageSource, relativePath);
  assert(existsSync(sourcePath), `Chinese page has no English source: ${relativePath}`);
  if (chinesePattern.test(readFileSync(translatedPath, 'utf8'))) chinesePageCount += 1;
}
assert(chinesePageCount >= 9, `Only ${chinesePageCount} standalone pages contain Chinese text`);

const homepageTranslationIds = [
  'homepage.subTitle',
  'homepage.tutorial',
  'homepage.getStarted',
  'homepage.askAI',
  'homepage.cloudService',
  'homepage.easyToUseName',
  'homepage.easyToUse',
  'homepage.focusOnName',
  'homepage.focusOn',
  'homepage.highEfficiencyName',
  'homepage.highEfficiency',
];
const codeTranslations = JSON.parse(readFileSync(join(root, 'i18n/zh-cn/code.json'), 'utf8'));
for (const id of homepageTranslationIds) {
  assert(chinesePattern.test(codeTranslations[id]?.message ?? ''), `Missing Chinese UI text: ${id}`);
}

const englishCodeTranslations = JSON.parse(
  readFileSync(join(root, 'i18n/en-us/code.json'), 'utf8'),
);
for (const id of homepageTranslationIds) {
  const message = englishCodeTranslations[id]?.message ?? '';
  assert(message && message !== id, `Missing English homepage UI text: ${id}`);
}

for (const version of ['current', '4.0', '5.0', '6.0', '7.0']) {
  const name = version === 'current' ? 'current.json' : `version-${version}.json`;
  assert(
    existsSync(join(root, 'i18n/zh-cn/docusaurus-plugin-content-docs', name)),
    `Missing translated docs metadata: ${name}`,
  );
}

const footer = JSON.parse(
  readFileSync(join(root, 'i18n/zh-cn/docusaurus-theme-classic/footer.json'), 'utf8'),
);
assert.equal(
  footer.copyright?.message,
  '©2013~2026 OSSRS <a href="https://beian.miit.gov.cn/">京ICP备19056366号-1</a>',
  'Chinese legal footer changed unexpectedly',
);

console.log(
  'Translation check passed: 886 paired docs, 68 paired blog posts, 11 Chinese pages, English/Chinese homepage UI, version metadata, and legal footer.',
);
