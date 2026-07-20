# ---- build ----
FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Faz o Nitro gerar um servidor Node.js comum (.output/server/index.mjs) em vez
# do preset "cloudflare" usado por padrão pela Lovable. Ver nitro.config.ts.
ENV NITRO_PRESET=node-server
RUN bun run build

# ---- runtime ----
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build /app/.output ./.output

EXPOSE 3000
USER node
CMD ["node", ".output/server/index.mjs"]
