# ============================================
# ColdStorage Backend — Docker Configuration
# ============================================

# ── Build stage ──────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./
COPY prisma.config.ts ./

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npx tsc

# ── Production stage ─────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy Prisma schema + generated client
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy compiled JS from builder
COPY --from=builder /app/dist ./dist

# Create uploads directory
RUN mkdir -p uploads

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 coldapp && \
    chown -R coldapp:nodejs /app
USER coldapp

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
