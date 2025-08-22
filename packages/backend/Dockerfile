FROM node:18-alpine

ENV NODE_ENV=production
WORKDIR /app

# 1) ROOT manifestlerini ve WORKSPACE manifestlerini ÖNCE kopyala
# (npm ci workspaces çözümlemesi için hepsini görmeli)
COPY package.json package-lock.json lerna.json ./
COPY packages/backend/package.json ./packages/backend/package.json
COPY packages/frontend/package.json ./packages/frontend/package.json

# 2) Tüm workspaceleri prod olarak kur
# --include-workspace-root: root bağımlılıkları da resolve edilsin
# --ignore-scripts: build scriptleri bu aşamada koşmasın (opsiyonel)
RUN npm ci --workspaces --include-workspace-root --omit=dev --ignore-scripts

# 3) SADECE backend kaynak kodunu kopyala (node_modules zaten /app altında)
COPY packages/backend/ ./packages/backend/

# 4) Backend'i çalıştır
WORKDIR /app/packages/backend
# Hoisted node_modules'ı da çözüme kat (bazı ortamlar için faydalı)
ENV NODE_PATH=/app/node_modules
EXPOSE 3001
CMD ["node", "src/server.js"]