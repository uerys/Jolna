FROM node:20-slim AS builder

WORKDIR /app

# Install latest pnpm and required build tools for native dependencies
RUN npm install -g pnpm@latest \
    && apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json pnpm-lock.yaml ./
# Copy patches directory to ensure pnpm install succeeds with patched dependencies
COPY patches ./patches
RUN pnpm install --no-frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application (client to dist/public, server to dist/index.js)
RUN pnpm run build

# Runner stage
FROM node:20-slim AS runner

WORKDIR /app

# Copy the built artifacts and node_modules from the builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# Drizzle files are typically needed if running database migrations
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts 

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start script
CMD ["node", "dist/index.js"]