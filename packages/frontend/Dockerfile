# ---- Build stage ----
FROM node:18-alpine AS builder
WORKDIR /app

# 1) Kök manifest’leri kopyala
COPY package.json package-lock.json* lerna.json ./

# 2) Workspace paket manifest’lerini kopyala
COPY packages/shared/package.json    packages/shared/
COPY packages/backend/package.json   packages/backend/
COPY packages/frontend/package.json  packages/frontend/

# 3) Artık npm workspaces devrede, yüklemeyi yap
RUN npm install

# 4) Tüm kaynak kodu kopyala ve build et
COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:18-alpine AS runner
WORKDIR /app

# Non-root kullanıcı oluştur
RUN addgroup -g 1001 -S nodejs \
 && adduser -S nextjs -u 1001

# Build sonrası dosyaları al
COPY --from=builder /app/public            ./public
COPY --from=builder /app/.next/standalone  ./
COPY --from=builder /app/.next/static      ./.next/static

# Sahiplik ayarları
RUN chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENV PORT=3000 NODE_ENV=production

CMD ["node", "server.js"]
