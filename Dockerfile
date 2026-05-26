FROM node:20-alpine AS builder

WORKDIR /app

# Install required build tools for native dependencies
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy EVERYTHING first to guarantee no files are missing
COPY . .

# Install dependencies using npm
ENV CI=true
RUN npm install --legacy-peer-deps

# Build the application (client to dist/public, server to dist/index.js)
RUN npm run build


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