import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';

const root = join(import.meta.dirname, '..');
const chinesePattern = /[\u3400-\u9fff]/;

function filesBelow(directory) {
  return readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

function assertTranslatedTree(sourceDirectory, translatedDirectories) {
  const translatableFiles = filesBelow(sourceDirectory).filter((path) =>
    ['.md', '.mdx', '.json', '.yml', '.yaml'].some((extension) => path.endsWith(extension)),
  );

  for (const translatedDirectory of translatedDirectories) {
    for (const sourcePath of translatableFiles) {
      const relativePath = relative(sourceDirectory, sourcePath);
      const translatedPath = join(translatedDirectory, relativePath);
      assert(existsSync(translatedPath), `Missing separate translation: ${translatedPath}`);
      assert(statSync(translatedPath).isFile(), `Translation is not a file: ${translatedPath}`);
      const source = readFileSync(sourcePath, 'utf8');
      const translation = readFileSync(translatedPath, 'utf8');
      assert.notEqual(translation, source, `Translation still equals English source: ${translatedPath}`);
      assert(chinesePattern.test(translation), `Translation has no Chinese text: ${translatedPath}`);
    }
  }
}

const docsTranslations = [
  join(root, 'i18n/zh-cn/docusaurus-plugin-content-docs/current'),
  ...['4.0', '5.0', '6.0', '7.0'].map((version) =>
    join(root, `i18n/zh-cn/docusaurus-plugin-content-docs/version-${version}`),
  ),
];

assertTranslatedTree(join(root, 'docs'), docsTranslations);
assertTranslatedTree(join(root, 'blog'), [
  join(root, 'i18n/zh-cn/docusaurus-plugin-content-blog'),
]);
assertTranslatedTree(join(root, 'src/pages'), [
  join(root, 'i18n/zh-cn/docusaurus-plugin-content-pages'),
]);

const codeTranslations = JSON.parse(readFileSync(join(root, 'i18n/zh-cn/code.json'), 'utf8'));
for (const id of [
  'homepage.hero.tutorialLink',
  'homepage.hero.tagline',
  'homepage.meta.title',
  'homepage.meta.description',
  'homepage.feature.easy.title',
  'homepage.feature.easy.description',
  'homepage.feature.focus.title',
  'homepage.feature.focus.description',
  'homepage.feature.react.title',
  'homepage.feature.react.description',
]) {
  assert(chinesePattern.test(codeTranslations[id]?.message ?? ''), `Missing Chinese UI text: ${id}`);
}

console.log(
  'Translation structure check passed: separate Chinese docs for current/v4-v7, blog, pages, and homepage UI.',
);
