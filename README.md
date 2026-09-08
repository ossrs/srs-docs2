# SRS Docs2

This is the Docusaurus 3 successor to the legacy SRS documentation website. The current migration
candidate contains the complete bilingual SRS documentation, frozen v4-v7 versions, current/v8
content, blog, standalone pages, navigation, components, and static assets from legacy release
`v1.0.481`. Framework-compatibility and link changes are intentionally mechanical; content
modernization belongs in separately reviewed changes after migration.

## Installation

```bash
npm install
```

**Note**: feel free to use the package manager of your choice.

## Local Development

Use `npm run start:en` or `npm run start:zh` for single-locale authoring. For acceptance testing,
build both locales and run the compatibility preview:

```bash
npm run build
npm run serve
```

Then open <http://127.0.0.1:3000/lts/>.

## Build

```bash
npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

The complete local validation sequence is:

```bash
npm run typecheck
npm run build
npm run check:translations
npm run check:urls
npm run serve
npm run check:preview
```

## Docker HTTP image

Build a self-contained image containing both the English and Chinese production
sites:

```bash
docker build -t srs-docs2:local .
```

The container listens for HTTP on port `8080`. To expose it as local port
`8080`:

```bash
docker run --rm --name srs-docs2 -p 8080:8080 srs-docs2:local
```

Then open <http://127.0.0.1:8080/lts/>. To publish it on a server's standard
HTTP port instead, map host port `80` to the container's unprivileged port:

```bash
docker run -d --restart unless-stopped --name srs-docs2 \
  -p 80:8080 srs-docs2:local
```

The image serves HTTP only. TLS certificates and HTTPS termination are
intentionally outside the container for now.
