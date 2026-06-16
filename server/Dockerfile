# --- build stage ---
FROM node:20-slim AS build
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
RUN pnpm install --frozen-lockfile=false
COPY shared ./shared
COPY server ./server
RUN pnpm --filter @charity-net/shared build
RUN pnpm --filter @charity-net/server build

# --- runtime stage ---
FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable && useradd -m -u 10001 appuser
COPY --from=build /repo/package.json /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/shared/package.json ./shared/package.json
COPY --from=build /repo/shared/dist ./shared/dist
COPY --from=build /repo/server/package.json ./server/package.json
COPY --from=build /repo/server/dist ./server/dist
RUN pnpm install --prod --frozen-lockfile=false
USER appuser
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server/dist/index.js"]
