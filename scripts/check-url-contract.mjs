import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {extname, join, relative, sep} from 'node:path';

import {inventoryUrls} from './url-inventory.mjs';

const root = join(import.meta.dirname, '..');
const buildDir = join(root, 'build');
const locales = ['en-us', 'zh-cn'];
const versions = ['v4', 'v5', 'v6', 'v7', 'v8'];

function filesBelow(directory, predicate = () => true) {
  return readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path, predicate) : predicate(path) ? [path] : [];
  });
}

function withoutFencedCode(source) {
  const lines = source.split('\n');
  let fence;
  return lines
    .map((line) => {
      const marker = line.match(/^\s*(`{3,}|~{3,})/u)?.[1];
      if (marker && !fence) {
        fence = marker[0];
        return '';
      }
      if (marker && fence === marker[0]) {
        fence = undefined;
        return '';
      }
      return fence ? '' : line;
    })
    .join('\n');
}

const contentRoots = ['docs', 'versioned_docs', 'blog', 'src/pages', 'i18n/zh-cn'].map((path) =>
  join(root, path),
);
const authoredSources = contentRoots.flatMap((directory) =>
  filesBelow(directory, (path) => ['.md', '.mdx'].includes(extname(path))),
);
for (const path of authoredSources) {
  const renderedProse = withoutFencedCode(readFileSync(path, 'utf8'));
  assert(
    !/https?:\/\/(?:www\.)?ossrs\.(?:io|net)\/lts(?:\/|\b)/iu.test(renderedProse),
    `${relative(root, path)} contains an absolute same-site page reference; use a relative link`,
  );
  assert(
    !/(?:\]\(|(?:href|src)=["'])\/lts(?:\/|\b)/iu.test(renderedProse),
    `${relative(root, path)} contains a root-relative same-site link; use a page-relative link`,
  );
}

function routeForHtml(path) {
  let route = `/${relative(buildDir, path).split(sep).join('/')}`;
  if (route.endsWith('/index.html')) route = route.slice(0, -'/index.html'.length) || '/';
  return `/lts${route === '/en-us' || route === '/zh-cn' ? `${route}/` : route}`;
}

function inventoryPaths(name) {
  return new Set(
    inventoryUrls(name).map((url) => new URL(url).pathname.replace(/\/$/u, '') || '/'),
  );
}

function assertSameSet(actual, expected, label) {
  const missing = [...expected].filter((value) => !actual.has(value));
  const extra = [...actual].filter((value) => !expected.has(value));
  assert.deepEqual(missing, [], `${label}: missing routes:\n${missing.join('\n')}`);
  assert.deepEqual(extra, [], `${label}: extra routes:\n${extra.join('\n')}`);
}

let checkedRoutes = 0;
for (const version of versions) {
  const htmlFiles = locales.flatMap((locale) =>
    filesBelow(join(buildDir, locale, 'docs', version), (path) => path.endsWith(`${sep}index.html`)),
  );
  const actual = new Set(htmlFiles.map((path) => routeForHtml(path).replace(/\/$/u, '')));
  const expected = inventoryPaths(`docs-${version}`);
  assertSameSet(actual, expected, `${version} documentation inventory`);
  checkedRoutes += actual.size;
}

const blogFiles = locales.flatMap((locale) =>
  filesBelow(join(buildDir, locale, 'blog'), (path) => path.endsWith(`${sep}index.html`)),
);
const blogRoutes = new Set(blogFiles.map((path) => routeForHtml(path).replace(/\/$/u, '')));
assertSameSet(blogRoutes, inventoryPaths('blog-and-tags'), 'blog/tag inventory');
checkedRoutes += blogRoutes.size;

const standaloneFiles = locales.flatMap((locale) =>
  filesBelow(join(buildDir, locale), (path) => {
    const route = routeForHtml(path);
    return (
      (path.endsWith(`${sep}index.html`) &&
        !route.includes('/docs/') &&
        !route.includes(`/${locale}/blog`)) ||
      path.endsWith(`${sep}404.html`)
    );
  }),
);
const standaloneRoutes = new Set(
  standaloneFiles.map((path) => routeForHtml(path).replace(/\/$/u, '')),
);
assertSameSet(standaloneRoutes, inventoryPaths('standalone-pages'), 'standalone-page inventory');
checkedRoutes += standaloneRoutes.size;

// Every generated docs page must retain an exact locale-aware canonical and
// offer both locale alternatives without nested locale prefixes.
let metadataPages = 0;
for (const locale of locales) {
  for (const version of versions) {
    for (const path of filesBelow(join(buildDir, locale, 'docs', version), (value) =>
      value.endsWith(`${sep}index.html`),
    )) {
      const html = readFileSync(path, 'utf8');
      const route = routeForHtml(path);
      assert(html.includes(`rel=canonical href=https://ossrs.io${route}`), `Bad canonical: ${route}`);
      for (const targetLocale of locales) {
        assert(
          html.includes(route.replace(`/lts/${locale}/`, `/lts/${targetLocale}/`)),
          `${route} is missing locale target ${targetLocale}`,
        );
      }
      assert(
        !html.includes('/lts/en-us/zh-cn/') && !html.includes('/lts/zh-cn/en-us/'),
        `Nested locale: ${route}`,
      );
      metadataPages += 1;
    }
  }
}

console.log(
  `URL contract check passed: ${checkedRoutes} exact legacy routes, ${metadataPages} docs metadata pages, and ${authoredSources.length} authored Markdown/MDX files with relative same-site navigation.`,
);
