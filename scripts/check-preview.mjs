import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import http from 'node:http';
import {join} from 'node:path';

const origin = process.env.PREVIEW_ORIGIN ?? 'http://127.0.0.1:3000';
const inventoryDir = join(import.meta.dirname, '..', '..', '..', 'references', 'url-inventory');

function request(path) {
  return new Promise((resolve, reject) => {
    http
      .get(`${origin}${path}`, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => (body += chunk));
        response.on('end', () =>
          resolve({status: response.statusCode, location: response.headers.location, body}),
        );
      })
      .on('error', reject);
  });
}

async function expectRedirect(path, status, location) {
  const response = await request(path);
  assert.equal(response.status, status, `${path} returned ${response.status}, expected ${status}`);
  assert.equal(response.location, location, `${path} redirected to ${response.location}`);
}

async function expectPage(path, markers = []) {
  const response = await request(path);
  assert.equal(response.status, 200, `${path} returned ${response.status}, expected 200`);
  assert.match(response.body, /<main\b/u, `${path} did not render a main region`);
  assert(!response.body.includes('Page Not Found'), `${path} rendered the Docusaurus 404 page`);
  for (const marker of markers) {
    assert(response.body.includes(marker), `${path} is missing rendered marker: ${marker}`);
  }
  return response.body;
}

await expectRedirect('/', 302, '/lts/en-us/');
await expectRedirect('/lts', 302, '/lts/en-us/');
await expectRedirect('/lts/', 302, '/lts/en-us/');
await expectRedirect('/lts/docs/v6/doc/introduction', 302, '/lts/en-us/docs/v6/doc/introduction');
await expectRedirect('/lts/blog', 302, '/lts/en-us/blog');
await expectRedirect('/lts/security-advisories', 302, '/lts/en-us/security-advisories');
await expectRedirect(
  '/lts/en-us/zh-cn/docs/v6/doc/introduction',
  302,
  '/lts/zh-cn/docs/v6/doc/introduction',
);
await expectRedirect('/lts/en-us/docs/v6/doc/introduction/', 302, '/lts/en-us/docs/v6/doc/introduction');
await expectRedirect('/lts/?source=test', 302, '/lts/en-us/?source=test');

await expectPage('/lts/en-us/', [
  'SRS (Simple Realtime Server) | SRS',
  'Simple Realtime Server',
  'Easy to Use',
  'Focus on Realtime Streaming',
  'High Efficiency',
  '/lts/en-us/docs/v7/doc/getting-started-ai',
]);
await expectPage('/lts/zh-cn/', [
  'SRS (Simple Realtime Server) | SRS',
  '简单高效的实时视频服务器',
  '简单',
  '实时',
  '高效',
]);

for (const locale of ['en-us', 'zh-cn']) {
  for (const version of ['v4', 'v5', 'v6', 'v7', 'v8']) {
    const path = `/lts/${locale}/docs/${version}/doc/introduction`;
    const body = await expectPage(path, [
      '<h1>Introduction</h1>',
      `https://ossrs.io${path}`,
      `/lts/${locale}/docs/${version}/doc/getting-started`,
    ]);
    assert(
      version === 'v4'
        ? body.includes('SRS Overview')
        : locale === 'zh-cn'
          ? body.includes('SRS是一个开源的')
          : body.includes('SRS is a open-source'),
      `${path} does not contain the migrated legacy Introduction`,
    );
  }
}

await expectPage('/lts/en-us/blog', ['GSoC-2025', 'Recent posts']);
await expectPage('/lts/zh-cn/blog', ['SRS for GSoC 2025', 'Recent posts']);
await expectPage('/lts/en-us/security-advisories', ['SRS Security', 'CVE-2024-29882']);
await expectPage('/lts/zh-cn/security-advisories', ['SRS Security', 'CVE-2024-29882']);

function inventoryPaths(name) {
  return readFileSync(join(inventoryDir, `${name}.txt`), 'utf8')
    .trim()
    .split('\n')
    .map((url) => new URL(url).pathname)
    .filter((path) => !path.endsWith('/404.html'));
}

const pagePaths = [
  ...['v4', 'v5', 'v6', 'v7', 'v8'].flatMap((version) => inventoryPaths(`docs-${version}`)),
  ...inventoryPaths('blog-and-tags'),
  ...inventoryPaths('standalone-pages'),
];

let cursor = 0;
const workers = Array.from({length: 24}, async () => {
  while (cursor < pagePaths.length) {
    const path = pagePaths[cursor++];
    const response = await request(path);
    assert.equal(response.status, 200, `${path} returned ${response.status}, expected 200`);
    assert.match(response.body, /<main\b/u, `${path} did not render a main region`);
    assert(!response.body.includes('Page Not Found'), `${path} rendered a 404 page`);
  }
});
await Promise.all(workers);

const missing = await request('/lts/en-us/does-not-exist');
assert.equal(missing.status, 404, 'A missing route must not masquerade as a successful page');

console.log(
  `Preview check passed: 9 redirects, ${pagePaths.length} legacy page routes, 10 Introduction variants, representative home/blog/security content, and a deliberate 404.`,
);
