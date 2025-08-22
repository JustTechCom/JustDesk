FROM node:18-alpine

WORKDIR /app

# Kaynak kodunu kopyala
COPY . .

# Direkt bağımlılıkları kur
RUN npm install express \
    compression \
    cors \
    dotenv \
    express-rate-limit \
    helmet \
    ioredis \
    isomorphic-dompurify \
    joi \
    socket.io \
    uuid \
    winston \
    sanitize-html

# DevDependencies’leri de istiyorsan (örn test için):
# RUN npm install --save-dev eslint husky jest nodemon supertest

# Kullanıcı ayarları
RUN addgroup -g 1001 -S nodejs \
  && adduser -S backend -u 1001 \
  && chown -R backend:nodejs /app

USER backend

EXPOSE 3001

CMD ["node", "packages/backend/src/server.js"]
