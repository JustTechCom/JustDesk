# =========================
#  Build stage
# =========================
FROM node:18-alpine AS builder
ENV NODE_ENV=production
WORKDIR /app

# 1) Root manifestleri kopyala
COPY package.json package-lock.json ./

# 2) Workspace manifestleri – backend'in ihtiyaç duyabileceği iç paketler dahil
# (frontend'i runtime'a taşımıyoruz ama manifestlerini kopyalamak install çözümlemesine yardımcı olur)
COPY packages/*/package.json packages/

# 3) Prod bağımlılıkları kur (script tetiklemeden!)
#    Workspaces'i tam görmesi için include-workspace-root ile
RUN npm ci --workspaces --include-workspace-root --omit=dev --ignore-scripts

# 4) Tüm kaynak kodu kopyala
COPY . .

# (Backend TypeScript DEĞİL — server.js CommonJS. Derleme gerekmiyor.)


# =========================
#  Runtime stage
# =========================
FROM node:18-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Güvenli kullanıcı
RUN addgroup -g 1001 -S nodejs \
 && adduser -S backend -u 1001

# Builder’dan sadece gerekli dosyaları al
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./

# Sahiplik
RUN chown -R backend:nodejs /app
USER backend

# Opsiyonel: healthcheck (backend'e /health koyduysan aç)
# HEALTHCHECK --interval=30s --timeout=3s \
#   CMD wget -qO- http://localhost:3001/health || exit 1

EXPOSE 3001
ENV PORT=3001

# CommonJS server (require kullanıyor)
CMD ["node", "packages/backend/src/server.js"]
