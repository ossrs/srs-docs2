import assert from 'node:assert/strict';
import http from 'node:http';

const origin = process.env.PREVIEW_ORIGIN ?? 'http://127.0.0.1:3000';
const locales = ['en-us', 'zh-cn'];
const versions = ['v4', 'v5', 'v6', 'v7', 'v8'];
const mockDocs = [
  {slug: 'introduction', en: 'Introduction', zh: '介绍'},
  {slug: 'getting-started', en: 'Docker', zh: 'Docker'},
  {slug: 'getting-started-cdk', en: 'CDK', zh: 'CDK'},
  {slug: 'getting-started-build', en: 'Build', zh: '源码编译'},
  {slug: 'getting-started-oryx', en: 'Oryx', zh: 'Oryx'},
  {slug: 'getting-started-ai', en: 'AI Agent', zh: 'AI Agent'},
  {slug: 'rtmp', en: 'RTMP', zh: 'RTMP'},
  {slug: 'hls', en: 'HLS', zh: 'HLS'},
];
const blogTitles = [
  {
    en: 'SRS - Fix Memory Leaks with Smart Pointers',
    zh: 'SRS - 使用智能指针修复内存泄漏',
  },
  {
    en: 'Oryx - Leveraging OpenAI for OCR and Object Recognition in Video Streams',
    zh: 'Oryx - 利用 OpenAI 对视频流进行 OCR 和目标识别',
  },
  {
    en: 'Oryx - Revolutionize Video Content with Oryx - Effortless Dubbing and Translating to Multiple Languages Using OpenAI',
    zh: 'Oryx - 借助 Oryx 革新视频内容 - 使用 OpenAI 轻松完成配音和多语言翻译',
  },
  {
    en: 'Oryx - Speak to the Future - Transform Your Browser into a Personal Voice-Driven GPT AI Assistant with Oryx',
    zh: 'Oryx - 与未来对话 - 使用 Oryx 将浏览器变成个人语音驱动的 GPT AI 助手',
  },
];

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

async function expectRenderedPage(path, markers, forbiddenMarkers = []) {
  const response = await request(path);
  assert.equal(response.status, 200, `${path} returned ${response.status}, expected 200`);
  assert.match(response.body, /<main\b/, `${path} did not render a main page region`);
  assert(!response.body.includes('Page Not Found'), `${path} rendered the Docusaurus 404 page`);
  for (const marker of markers) {
    assert(response.body.includes(marker), `${path} is missing rendered marker: ${marker}`);
  }
  for (const marker of forbiddenMarkers) {
    assert(!response.body.includes(marker), `${path} unexpectedly contains: ${marker}`);
  }
  return response.body;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

await expectRedirect('/', 302, '/lts/en-us/');
await expectRedirect('/lts', 302, '/lts/zh-cn/');
await expectRedirect('/lts/', 302, '/lts/zh-cn/');
await expectRedirect('/lts/docs/v6/doc/introduction', 302, '/lts/zh-cn/docs/v6/doc/introduction');
await expectRedirect(
  '/lts/en-us/zh-cn/docs/v6/doc/introduction',
  302,
  '/lts/zh-cn/docs/v6/doc/introduction',
);
await expectRedirect('/lts/en-us/docs/v6/doc/introduction/', 302, '/lts/en-us/docs/v6/doc/introduction');
await expectRedirect('/lts/?source=test', 302, '/lts/zh-cn/?source=test');

for (const locale of locales) {
  const chinese = locale === 'zh-cn';
  await expectRenderedPage(`/lts/${locale}/`, [
    `lang=${chinese ? 'zh-CN' : 'en-US'}`,
    'SRS Docs2',
    `/lts/${locale}/docs/v6/doc/introduction`,
    chinese ? '简单易用' : 'Easy to Use',
    chinese ? '文档' : 'Docs',
  ], [chinese ? 'Easy to Use' : '简单易用']);

  for (const version of versions) {
    const introductionPath = `/lts/${locale}/docs/${version}/doc/introduction`;
    const introductionBody = await expectRenderedPage(introductionPath, [
      chinese ? '<h1>介绍</h1>' : '<h1>Introduction</h1>',
      chinese ? '开始使用' : 'Getting Started',
      `https://ossrs.io/lts/${locale}/docs/${version}/doc/introduction`,
    ], [chinese ? '<h1>Introduction</h1>' : '<h1>介绍</h1>']);
    const categoryLabel = chinese ? '起步' : 'Getting Started';
    assert.match(
      introductionBody,
      new RegExp(`${escapeRegExp(categoryLabel)}[\\s\\S]{0,300}aria-expanded=true`),
      `${introductionPath} does not render ${categoryLabel} expanded by default`,
    );

    for (const doc of mockDocs.filter((value) => value.slug !== 'introduction')) {
      await expectRenderedPage(`/lts/${locale}/docs/${version}/doc/${doc.slug}`, [
        `<h1>${chinese ? doc.zh : doc.en}</h1>`,
        `https://ossrs.io/lts/${locale}/docs/${version}/doc/${doc.slug}`,
      ]);
    }

    await expectRenderedPage(`/lts/${locale}/docs/${version}/category/getting-started`, [
      chinese ? '起步' : 'Getting Started',
    ]);
    await expectRenderedPage(`/lts/${locale}/docs/${version}/category/main-protocols`, [
      chinese ? '核心协议' : 'Main Protocols',
    ]);
  }

  await expectRenderedPage(
    `/lts/${locale}/blog`,
    [
      ...blogTitles.map((title) => (chinese ? title.zh : title.en)),
      chinese ? '近期文章' : 'Recent posts',
    ],
    blogTitles.map((title) => (chinese ? title.en : title.zh)),
  );

  await expectRenderedPage(`/lts/${locale}/markdown-page`, [
    chinese ? 'Markdown 页面示例' : 'Markdown page example',
  ], [chinese ? 'You don\'t need React' : '编写简单的独立页面']);

  await expectRenderedPage(`/lts/${locale}/security-advisories`, [
    chinese ? 'SRS 安全公告' : 'SRS Security Advisories',
    chinese ? '报告安全漏洞' : 'Report a vulnerability',
    `https://ossrs.io/lts/${locale}/security-advisories`,
  ], [chinese ? 'SRS Security Advisories' : 'SRS 安全公告']);
}

const missing = await request('/lts/en-us/does-not-exist');
assert.equal(missing.status, 404, 'A missing route must not masquerade as a successful page');

console.log(
  'Preview check passed: redirects, rendered page markers, expanded Getting Started sidebar, 2 locales, and 5 versions.',
);
