# ─── CivilIQ API — Multi-stage Dockerfile ────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ─── Dependencies stage ───────────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci

# ─── Development stage ────────────────────────────────────────────────────────
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
EXPOSE 4000
CMD ["npm", "run", "start:dev"]

# ─── Build stage ─────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat dumb-init

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs && \
    chown -R nestjs:nodejs /app

USER nestjs
EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
