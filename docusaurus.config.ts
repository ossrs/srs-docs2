import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'SRS Docs2',
  tagline: 'The next-generation SRS documentation',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Keep the existing public SRS URL namespace. Each locale overrides this
  // base URL below so English is explicit too: /lts/en-us/ and /lts/zh-cn/.
  url: 'https://ossrs.io',
  baseUrl: '/lts/',

  organizationName: 'ossrs',
  projectName: 'srs-docs2',

  onBrokenLinks: 'throw',

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
          // Preserve the V1 route contract. `current` is SRS 8 while SRS 6
          // remains the stable/default version selected by docs navigation.
          lastVersion: '6.0',
          versions: {
            current: {
              label: '8.0 (Unstable)',
              path: 'v8',
            },
            '7.0': {
              label: '7.0 (Unstable)',
              path: 'v7',
            },
            '6.0': {
              label: '6.0 (Stable)',
              path: 'v6',
            },
            '5.0': {
              label: '5.0 (Archived)',
              path: 'v5',
            },
            '4.0': {
              label: '4.0 (Archived)',
              path: 'v4',
            },
          },
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/ossrs/srs-docs2/edit/main/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'SRS Docs2',
      logo: {
        alt: 'SRS Docs2 Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
        {to: '/security-advisories', label: 'Security', position: 'left'},
        {
          type: 'docsVersionDropdown',
          position: 'right',
          dropdownActiveClassDisabled: true,
        },
        {type: 'localeDropdown', position: 'right'},
        {
          href: 'https://github.com/ossrs/srs',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Tutorial',
              to: '/docs/v6/doc/introduction',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/docusaurus',
            },
            {
              label: 'Discord',
              href: 'https://discordapp.com/invite/docusaurus',
            },
            {
              label: 'X',
              href: 'https://x.com/docusaurus',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: 'Security',
              to: '/security-advisories',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/ossrs/srs',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} SRS Docs2. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
