# ---------- Backend ----------
FROM node:18-alpine AS backend

ENV NODE_ENV=production
WORKDIR /app/packages/backend

# Sadece var olan manifesti kopyala
COPY packages/backend/package.json ./

# Lock yoksa npm ci çalışmaz; install kullan
RUN npm install --omit=dev --ignore-scripts

# Uygulama kodunu kopyala
COPY packages/backend/ ./

ENV PORT=3001
EXPOSE 3001
CMD ["node", "src/server.js"]
