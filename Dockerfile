FROM node:20-alpine AS builder

WORKDIR /app

# Install required build tools (for native deps) and latest pnpm
RUN apk add --no-cache python3 make g++ git \
    && npm install -g pnpm@latest

# Copy EVERYTHING first to guarantee patches and config files are present
COPY . .

# Install dependencies using pnpm
# Using --no-frozen-lockfile avoids cross-platform lockfile mismatch issues
ENV CI=true
RUN pnpm install --no-frozen-lockfile

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