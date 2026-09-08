import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import mdxMermaid from 'mdx-mermaid';

const config: Config = {
  title: 'SRS',
  tagline: 'Simple Realtime Server',
  favicon: 'img/favicon.ico',
  future: {v4: true},

  // Keep the V1 public namespace while letting every locale retain an explicit prefix.
  url: 'https://ossrs.io',
  baseUrl: '/lts/',
  organizationName: 'ossrs',
  projectName: 'srs-docs2',
  onBrokenLinks: 'throw',
  markdown: {hooks: {onBrokenMarkdownLinks: 'warn'}},

  i18n: {
    defaultLocale: 'en-us',
    locales: ['en-us', 'zh-cn'],
    localeConfigs: {
      'en-us': {
        label: 'English',
        htmlLang: 'en-US',
        url: 'https://ossrs.io',
        baseUrl: '/lts/en-us/',
      },
      'zh-cn': {
        label: '简体中文',
        htmlLang: 'zh-CN',
        url: 'https://ossrs.io',
        baseUrl: '/lts/zh-cn/',
      },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/ossrs/srs-docs2/edit/main/',
          remarkPlugins: [mdxMermaid],
          lastVersion: '6.0',
          versions: {
            current: {label: '8.0 (Unstable) 🚧🚀', path: 'v8'},
            '7.0': {label: '7.0 (Unstable) 🚧🚀', path: 'v7'},
            '6.0': {label: '6.0 (Stable) ✅', path: 'v6'},
            '5.0': {label: '5.0 (Archived) 📦', path: 'v5'},
            '4.0': {label: '4.0 (Archived) 📦', path: 'v4'},
          },
        },
        blog: {
          showReadingTime: true,
          authorsMapPath: 'authors-disabled.yml',
          blogSidebarCount: 'ALL',
          feedOptions: {type: ['rss', 'atom'], xslt: true},
          editUrl: 'https://github.com/ossrs/srs-docs2/edit/main/',
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {customCss: './src/css/custom.css'},
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {respectPrefersColorScheme: true},
    navbar: {
      title: 'SRS',
      logo: {alt: 'SRS(Simple Realtime Server)', src: 'img/srs-200x200.png'},
      items: [
        {type: 'doc', docId: 'doc/getting-started', position: 'left', label: 'Docs'},
        {to: '/blog', label: 'Blog', position: 'left'},
        {type: 'doc', docId: 'tutorial/srs-server', position: 'left', label: 'Tutorial'},
        {
          type: 'dropdown',
          label: 'FAQ',
          position: 'left',
          items: [
            {to: '/faq', label: 'SRS'},
            {to: '/faq-oryx', label: 'Oryx'},
          ],
        },
        {to: '/security-advisories', label: 'Security', position: 'left'},
        {
          type: 'dropdown',
          label: 'Community',
          position: 'left',
          items: [
            {to: '/about', label: 'About'},
            {to: '/faq', label: 'FAQ: SRS'},
            {to: '/faq-oryx', label: 'FAQ: Oryx'},
            {to: '/contact', label: 'Contact'},
            {to: '/how-to-file-pr', label: 'Contributing'},
            {type: 'doc', docId: 'tools/utility', label: 'Tools'},
            {to: '/product', label: 'Milestones'},
            {to: '/license', label: 'LICENSE'},
          ],
        },
        {href: 'https://github.com/ossrs/srs', label: 'GitHub', position: 'left'},
        {type: 'docsVersionDropdown', position: 'right', dropdownActiveClassDisabled: true},
        {type: 'localeDropdown', position: 'right'},
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Learn',
          items: [
            {label: 'Tutorial', to: '/docs/v6/tutorial/srs-server'},
            {label: 'Docs', to: '/docs/v6/doc/getting-started'},
            {label: 'Blog', to: '/blog'},
          ],
        },
        {
          title: 'Community',
          items: [
            {label: 'Contact', to: '/contact'},
            {label: 'Community', to: '/how-to-file-pr'},
          ],
        },
        {title: 'Discussion', items: [{label: 'Discord', href: 'https://discord.gg/yZ4BnPmHAd'}]},
        {title: 'More', items: [{label: 'Blog', to: '/blog'}]},
      ],
      copyright:
        '©2013~2026 OSSRS Community<br />Official Address: 4711 Yonge St, North York, ON M2N 7E4, Canada',
    },
    prism: {theme: prismThemes.github, darkTheme: prismThemes.dracula},
  } satisfies Preset.ThemeConfig,
};

export default config;
