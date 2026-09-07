# SRS Docs2

This is the clean-room successor prototype for the SRS documentation website. It is
built with [Docusaurus](https://docusaurus.io/), a modern static website generator.

The initial checkpoint deliberately retains the Docusaurus sample content. SRS content,
localization, versioning, routes, and deployment behavior will be introduced in reviewed
migration phases rather than copied into the framework all at once.

## Installation

```bash
npm install
```

**Note**: feel free to use the package manager of your choice.

## Local Development

```bash
npm run start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

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
