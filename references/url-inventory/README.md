# Vendored URL migration contract

These lists enumerate the exact public `ossrs.io` page routes the migrated site must keep
serving. They are the inputs to `npm run check:urls` and `npm run check:preview`.

They are **vendored** here so that a clean clone of this repository — including the
isolated `docker build .` used to produce a release image — can validate the route
contract without reaching outside the repository.

## Canonical source

The complete contract (redirect tables, sitemaps, browser assets, known-failure
baselines, and per-version diffs) lives in the SRS Docs skill repository under
`skills/srs-docs/references/url-inventory/`. Only the seven lists the automated checks
consume are copied here.

`npm run check:inventory` compares this copy against the canonical one byte for byte
whenever the canonical copy is reachable, and skips with a message when it is not — for
example inside the build container. Refresh this directory from the canonical source
rather than editing these files in place.

## Files

| File | Contents |
| --- | --- |
| `docs-v4.txt` … `docs-v8.txt` | Documentation page routes for each frozen and current version |
| `blog-and-tags.txt` | Blog post, listing, and tag routes |
| `standalone-pages.txt` | Homepage and standalone page routes |
