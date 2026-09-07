import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';

const locales = ['en-us', 'zh-cn'];
const versions = ['v4', 'v5', 'v6', 'v7', 'v8'];
const mockDocSlugs = [
  'introduction',
  'getting-started',
  'getting-started-cdk',
  'getting-started-build',
  'getting-started-oryx',
  'getting-started-ai',
  'rtmp',
  'hls',
];
const categorySlugs = ['getting-started', 'main-protocols'];
const buildDir = join(import.meta.dirname, '..', 'build');

function readBuiltPage(...parts) {
  const path = join(buildDir, ...parts, 'index.html');
  assert(statSync(path).isFile(), `Missing generated page: ${path}`);
  return {path, html: readFileSync(path, 'utf8')};
}

let checkedPages = 0;

for (const locale of locales) {
  const home = readBuiltPage(locale);
  assert(
    home.html.includes(`/lts/${locale}/docs/v6/doc/introduction`),
    `${home.path} does not link to the stable v6 mock document`,
  );
  checkedPages += 1;

  const securityPage = readBuiltPage(locale, 'security-advisories');
  const securityCanonical = `https://ossrs.io/lts/${locale}/security-advisories`;
  assert(
    securityPage.html.includes(`rel=canonical href=${securityCanonical}`),
    `${securityPage.path} has an unexpected canonical URL`,
  );
  assert(
    home.html.includes(`/lts/${locale}/security-advisories`),
    `${home.path} does not link to the standalone security page`,
  );
  checkedPages += 1;

  for (const version of versions) {
    for (const slug of mockDocSlugs) {
      const page = readBuiltPage(locale, 'docs', version, 'doc', slug);
      const publicPath = `/lts/${locale}/docs/${version}/doc/${slug}`;
      const canonical = `https://ossrs.io${publicPath}`;

      assert(
        page.html.includes(`rel=canonical href=${canonical}`),
        `${page.path} has an unexpected canonical URL`,
      );
      assert(
        page.html.includes(`/lts/en-us/docs/${version}/doc/${slug}`),
        `${page.path} is missing its English locale target`,
      );
      assert(
        page.html.includes(`/lts/zh-cn/docs/${version}/doc/${slug}`),
        `${page.path} is missing its Chinese locale target`,
      );
      assert(
        !page.html.includes('/lts/en-us/zh-cn/') &&
          !page.html.includes('/lts/zh-cn/en-us/'),
        `${page.path} contains a nested-locale URL`,
      );

      for (const linkedVersion of versions) {
        assert(
          page.html.includes(`/lts/${locale}/docs/${linkedVersion}/doc/${slug}`),
          `${page.path} is missing version-switch target ${linkedVersion}`,
        );
      }

      checkedPages += 1;
    }

    for (const slug of categorySlugs) {
      const categoryPage = readBuiltPage(locale, 'docs', version, 'category', slug);
      const publicPath = `/lts/${locale}/docs/${version}/category/${slug}`;
      assert(
        categoryPage.html.includes(`rel=canonical href=https://ossrs.io${publicPath}`),
        `${categoryPage.path} has an unexpected canonical URL`,
      );
      checkedPages += 1;
    }
  }
}

console.log(
  `URL contract check passed: ${checkedPages} pages; V1-style names, flat document slugs, and category routes across ${locales.length} locales and ${versions.length} SRS versions.`,
);
