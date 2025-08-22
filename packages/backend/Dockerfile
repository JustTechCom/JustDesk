FROM node:18-alpine

# İmajı daha deterministik yapmak için
ENV NODE_ENV=production

WORKDIR /app

# 1) Sadece manifestleri kopyala (root + backend)
COPY package.json package-lock.json ./
COPY packages/backend/package.json ./packages/backend/package.json

# 2) Tek seferde tüm workspaceler için prod bağımlılıkları kur
RUN npm ci --omit=dev --workspaces --include-workspace-root

# 3) Kaynak kodu kopyala
COPY . .

# 4) Non-root kullanıcı
RUN addgroup -g 1001 -S nodejs \
 && adduser -S backend -u 1001 \
 && chown -R backend:nodejs /app

USER backend
EXPOSE 3001

CMD ["node", "packages/backend/src/server.js"]
