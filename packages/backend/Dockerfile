# ---------- Backend ----------
FROM node:18-alpine

WORKDIR /app

# 1. Sadece backend manifestlerini kopyala
COPY packages/backend/package*.json ./ 

# 2. Bağımlılıkları kur
RUN npm install --omit=dev

# 3. Backend kodunu kopyala
COPY packages/backend/ ./

EXPOSE 3001

CMD ["node", "src/server.js"]