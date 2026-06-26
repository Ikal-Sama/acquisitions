# syntax=docker/dockerfile:1.7
# ---------- Build stage ----------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy pre-installed node_modules from host (avoids npm network issues in Docker)
COPY package.json package-lock.json* ./
COPY node_modules ./node_modules

# Copy the rest of the source
COPY . .

# Pre-generate Drizzle artifacts (optional, harmless if not used at runtime)
RUN npm run db:generate || true

# Prune dev dependencies for the runtime image
RUN npm prune --omit=dev

# ---------- Runtime stage ----------
FROM node:22-alpine AS runtime

WORKDIR /app

# Run as the non-root "node" user that ships with the base image
ENV NODE_ENV=production \
    PORT=3000 \
    NPM_CONFIG_LOGLEVEL=warn

# Copy production-ready artifacts from the builder
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/drizzle.config.js ./drizzle.config.js
COPY --from=builder --chown=node:node /app/drizzle ./drizzle
COPY --from=builder --chown=node:node /app/src ./src

# Pre-create the logs directory and chown it to the node user so the
# Winston file transports (logs/error.log, logs/combined.log) can write
# when the app runs as USER node. Without this, winston throws EACCES
# on mkdir('logs') at startup and the container enters a crash loop.
RUN mkdir -p /app/logs && chown -R node:node /app/logs

USER node

EXPOSE 3000

# Lightweight healthcheck using the same Node binary that's already in the image
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+ (process.env.PORT||3000) +'/health', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "src/server.js"]
