# Servidor (API) do Safety Nexo: NestJS + Prisma, com Chromium para os PDFs e poppler para ler PDFs enviados.
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/api/package.json apps/api/package.json
RUN npm ci -w apps/api -w packages/design-tokens --include-workspace-root
COPY apps/api ./apps/api
RUN cd apps/api && npx prisma generate && npx nest build

FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends chromium poppler-utils openssl ca-certificates fonts-dejavu-core fonts-liberation fonts-noto-color-emoji \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production CHROMIUM_PATH=/usr/bin/chromium ARQUIVOS_DIR=/data/arquivos LOGOS_DIR=/data/logos PORT=8080
COPY --from=build /app /app
WORKDIR /app/apps/api
EXPOSE 8080
# Aplica as migrações do banco e sobe o servidor.
CMD ["sh", "-c", "mkdir -p /data/arquivos /data/logos && npx prisma migrate deploy && node dist/main.js"]
