# Public URL model

Docs2 preserves the complete generated page-route model of legacy release `v1.0.481`. The current
candidate contains all legacy documents, blog posts, standalone pages, components, and assets;
there is no remaining Docusaurus sample-document placeholder set.

## Canonical route shape

```text
https://ossrs.io/lts/<locale>/docs/<version>/<document>
```

- Locales: `en-us`, `zh-cn`
- Versions: `v4`, `v5`, `v6`, `v7`, `v8`
- `current` source (`docs/`) represents SRS 8 and is published at `v8`.
- SRS 6 remains the stable/default documentation version.
- All locale prefixes are explicit, including English.

Examples using the migrated Introduction:

```text
/lts/en-us/docs/v6/doc/introduction
/lts/zh-cn/docs/v6/doc/introduction
/lts/en-us/docs/v8/doc/introduction
/lts/zh-cn/docs/v8/doc/introduction
```

The legacy sidebar groups do not leak into public document URLs. Main documents remain flat under
`/doc/`, for example:

```text
/lts/en-us/docs/v8/doc/getting-started
/lts/en-us/docs/v8/doc/getting-started-cdk
/lts/en-us/docs/v8/doc/getting-started-build
/lts/en-us/docs/v8/doc/getting-started-oryx
/lts/en-us/docs/v8/doc/getting-started-ai
/lts/en-us/docs/v8/doc/rtmp
/lts/en-us/docs/v8/doc/hls
```

Navigation grouping is independent from the flat `/doc/<document>` public path.

Standalone pages sit beside—not inside—the docs and blog route spaces, including:

```text
/lts/en-us/security-advisories
/lts/zh-cn/security-advisories
```

## Source layout

- SRS 8 source: `docs/` (92 English documents)
- Frozen sources: `versioned_docs/version-{4.0,5.0,6.0,7.0}/` (81/89/89/92 English documents)
- Frozen sidebars: `versioned_sidebars/`
- Chinese translations live under `i18n/zh-cn/`, with matching current/v8 and frozen v4-v7
  document trees, 34 blog posts, 11 standalone content pages, and localized UI metadata.
- Legacy navigation hyperlinks are converted to relative references so local, staging, locale,
  and version context is preserved. Literal absolute URLs inside fenced copy/paste examples are
  retained only where an independently usable public URL is the example itself.

Generated route sets are checked exactly against the recorded production inventories: 178 v4,
194 v5, 194 v6, 200 v7, 200 v8, 215 blog/tag, and 28 standalone routes (1,209 total).

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
also applies the Docs2 default-language policy: `/`, `/lts`, `/lts/`, and locale-less routes all
redirect to English.
Use `npm run serve:raw` only when diagnosing Docusaurus itself.

## Server-owned compatibility redirects

Docusaurus owns generated locale/version URLs. The outer production web server owns compatibility
redirects. Docs2's chosen policy sends `/`, `/lts`, `/lts/`, and locale-less docs/blog/standalone
routes to English at `/lts/en-us/...`; malformed nested-locale repair still preserves the explicit
locale encoded in the malformed route. The local compatibility preview implements these rules;
final deployment must apply and verify the same policy at the server layer.
