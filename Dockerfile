FROM node:20-alpine AS builder

WORKDIR /app

# Install latest pnpm to avoid corepack version mismatch / exit code 254 issues
RUN npm install -g pnpm@latest

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application (client to dist/public, server to dist/index.js)
RUN pnpm run build

# Runner stage
FROM node:20-alpine AS runner

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