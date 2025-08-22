# ---- Build stage ----
FROM node:18-alpine AS builder
WORKDIR /app

# 1) Root manifestleri (workspaces/lerna) kopyala
COPY package.json package-lock.json* lerna.json ./

# 2) Workspace manifestleri (yalnızca gerekenler)
COPY packages/shared/package.json    packages/shared/
COPY packages/backend/package.json   packages/backend/
COPY packages/frontend/package.json  packages/frontend/

# 3) Bağımlılıkları kur (deterministik)
RUN npm ci --workspaces --include-workspace-root

# 4) Kaynak kodu kopyala
COPY . .

# 5) Sadece frontend’i build et (Next 14, output=standalone olmalı)
#    next.config.js içinde: module.exports = { output: 'standalone' }
RUN npm run build -w @justdesk/frontend


# ---- Production stage ----
FROM node:18-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Non-root kullanıcı
RUN addgroup -g 1001 -S nodejs \
 && adduser -S nextjs -u 1001

# --- Standalone dosyalarını doğru yerlere kopyala ---
# .next/standalone ağacının KENDİ klasör yapısını koruyarak /app'e taşıyoruz.
# Bu yapıda "packages/frontend/server.js" ve minimal node_modules bulunur.
COPY --from=builder /app/packages/frontend/.next/standalone ./ 

# Static ve public dosyaları, runtime'da beklenen yollara kopyala
COPY --from=builder /app/packages/frontend/public                    ./packages/frontend/public
COPY --from=builder /app/packages/frontend/.next/static              ./packages/frontend/.next/static

# Sahiplik
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV PORT=3000

# Monorepo'da standalone server giriş noktası:
# /app/packages/frontend/server.js
CMD ["node", "packages/frontend/server.js"]
