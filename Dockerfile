FROM node:20-alpine AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build && pnpm prune --prod

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/package.json /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["pnpm", "run", "start"]
