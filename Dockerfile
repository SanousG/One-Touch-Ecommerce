# syntax=docker/dockerfile:1

# Imagen base con OpenSSL para los motores de Prisma 7.
FROM node:24-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Dependencias reproducibles (incluye devDependencies: CLI de Prisma y tsx).
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Build de Next.js en modo standalone + cliente de Prisma.
FROM deps AS builder
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json next-env.d.ts ./
COPY next.config.ts ./
COPY public ./public
COPY src ./src
RUN npx prisma generate
RUN npm run build

# Imagen de herramientas: migraciones (prisma migrate deploy) y seed controlado.
FROM base AS migrator
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY prisma.config.ts tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
COPY worker ./worker
RUN npx prisma generate
CMD ["npm", "run", "db:migrate:deploy"]

# Imagen final de ejecución: solo el output standalone de Next.js.
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN groupadd --gid 1001 nextjs \
    && useradd --uid 1001 --gid nextjs --home-dir /home/nextjs --create-home --shell /bin/sh nextjs
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
RUN mkdir -p /app/storage/product-images /app/storage/payment-vouchers /app/storage/whatsapp-media && chown -R nextjs:nextjs /app/storage
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
