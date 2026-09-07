# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build and validate both locale trees before creating the runtime image.
RUN npm run typecheck \
    && npm run check:translations \
    && npm run build \
    && npm run check:urls


FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

# The generated site and compatibility HTTP server have no runtime npm dependencies.
COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/scripts/serve-compatible.mjs ./scripts/serve-compatible.mjs

USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "require('node:http').get('http://127.0.0.1:8080/lts/en-us/', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"]

CMD ["node", "scripts/serve-compatible.mjs", "--host", "0.0.0.0", "--port", "8080", "--dir", "build"]
