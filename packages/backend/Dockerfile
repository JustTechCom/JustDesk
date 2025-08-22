# ---------- Backend ----------
FROM node:18-alpine AS backend

ENV NODE_ENV=production
WORKDIR /app/packages/backend

# Sadece backend manifestlerini kopyala
COPY packages/backend/package.json packages/backend/package-lock.json ./

# Sadece backend bağımlılıklarını kur (workspace'e gerek yok)
RUN npm ci --omit=dev --ignore-scripts

# Uygulama kodunu kopyala
COPY packages/backend/ ./

# Sağlık: container dışından port veriyorsan ENV ile al; default 3001
ENV PORT=3001
EXPOSE 3001

# Node direkt JS dosyanı çalıştıracak
CMD ["node", "src/server.js"]
