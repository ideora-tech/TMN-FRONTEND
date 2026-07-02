# ── Stage 1: Dependencies ─────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

ARG BACKEND_INTERNAL_URL=http://backend:4019
ENV BACKEND_URL=$BACKEND_INTERNAL_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ── Stage 3: Runtime (ringan, hanya file yang dibutuhkan) ─────────────────────
FROM node:20-alpine AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3003

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy hasil build standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3003

CMD ["node", "server.js"]
