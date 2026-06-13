FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev

# ── build ─────────────────────────────────────────────────────────────────────
FROM base AS builder
COPY package*.json tsconfig*.json ./
RUN npm ci
COPY src/ ./src/
COPY bin/ ./bin/
RUN npm run build

# ── runner ────────────────────────────────────────────────────────────────────
FROM base AS runner

RUN addgroup --system --gid 1001 orlix && \
    adduser  --system --uid 1001 --ingroup orlix orlix

COPY --from=deps    /app/node_modules ./node_modules
COPY --from=builder /app/dist         ./dist

USER orlix

VOLUME ["/home/orlix/.orlix"]

ENTRYPOINT ["node", "dist/bin/orlix.js"]
CMD        ["run", "--interval", "60"]
