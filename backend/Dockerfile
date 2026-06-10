# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install system deps for Prisma
RUN apk add --no-cache openssl libc6-compat

# Install ALL deps (including devDeps for TypeScript build)
COPY package*.json ./
RUN npm ci

# Generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Build TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Install system deps
RUN apk add --no-cache openssl libc6-compat

# Copy package files and install PROD only deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy generated Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy prisma schema (needed for migrate deploy)
COPY prisma ./prisma

# Regenerate Prisma client in production image
RUN npx prisma generate

# Copy compiled JS output
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Migrate DB then start server using Railway's $PORT
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
