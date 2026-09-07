# Public URL model

Docs2 preserves the path model of the current SRS documentation before any real content is
migrated. The Docusaurus sample documents are intentionally copied into every frozen version so
the locale and version machinery can be tested independently of content migration.

## Canonical route shape

```text
https://ossrs.io/lts/<locale>/docs/<version>/<document>
```

- Locales: `en-us`, `zh-cn`
- Versions: `v4`, `v5`, `v6`, `v7`, `v8`
- `current` source (`docs/`) represents SRS 8 and is published at `v8`.
- SRS 6 remains the stable/default documentation version.
- All locale prefixes are explicit, including English.

Examples using the current mock document:

```text
/lts/en-us/docs/v6/doc/introduction
/lts/zh-cn/docs/v6/doc/introduction
/lts/en-us/docs/v8/doc/introduction
/lts/zh-cn/docs/v8/doc/introduction
```

Mock source folders organize the sidebar as **Getting Started** and **Main Protocols**, but those
folder names do not leak into public document URLs. Every mock doc has an explicit V1-aligned flat
slug under `/doc/`, for example:

```text
/lts/en-us/docs/v8/doc/getting-started
/lts/en-us/docs/v8/doc/getting-started-cdk
/lts/en-us/docs/v8/doc/getting-started-build
/lts/en-us/docs/v8/doc/getting-started-oryx
/lts/en-us/docs/v8/doc/getting-started-ai
/lts/en-us/docs/v8/doc/rtmp
/lts/en-us/docs/v8/doc/hls
```

This follows the V1 rule demonstrated by `/docs/v8/doc/getting-started-cdk`: navigation grouping is
independent from the flat `/doc/<document>` public path.

Standalone pages sit beside—not inside—the docs and blog route spaces. The first representative
standalone page preserves the V1 security routes:

```text
/lts/en-us/security-advisories
/lts/zh-cn/security-advisories
```

## Source layout

- SRS 8 mock source: `docs/`
- Frozen mock sources: `versioned_docs/version-{4.0,5.0,6.0,7.0}/`
- Frozen sidebars: `versioned_sidebars/`
- Chinese mock translations live under `i18n/zh-cn/`. Current/v8 docs, each frozen v4-v7
  version, blog posts and metadata, the Markdown standalone page, navigation, footer, framework
  UI, and custom homepage text all have separate Chinese sources. No real SRS content has been
  migrated.

## Build and preview

```bash
npm run typecheck
npm run build
npm run check:urls
npm run check:translations
npm run serve
npm run check:preview
npm run start:en
npm run start:zh
```

The two locale-specific development commands use their production-compatible prefixes:
`/lts/en-us/` and `/lts/zh-cn/`.

`npm run serve` starts the compatibility preview. Unlike the raw Docusaurus static server, it
also reproduces the important entry redirects, including `/` to English and `/lts/` to Chinese.
Use `npm run serve:raw` only when diagnosing Docusaurus itself.

## Server-owned compatibility redirects

Docusaurus owns generated locale/version URLs. The outer production web server owns compatibility
redirects such as `/` to `/lts/en-us/`, `/lts` to `/lts/zh-cn/`, locale-less docs/blog routes to
Chinese, and malformed nested-locale repair. The local compatibility preview reproduces those
important rules so development entry points behave like production; final deployment will still
implement and verify them at the server layer.
