FROM node:18-alpine

WORKDIR /app

# 1) Root + backend manifestlerini kopyala
COPY package.json package-lock.json ./
COPY packages/backend/package.json ./packages/backend/package.json

# 2) Prod bağımlılıkları tek seferde kur
RUN npm ci --omit=dev --workspaces --include-workspace-root

# 3) Tüm source'u kopyala
COPY . .

# Non-root user
RUN addgroup -g 1001 -S nodejs \
  && adduser -S backend -u 1001 \
  && chown -R backend:nodejs /app

USER backend

EXPOSE 3001

CMD ["node", "packages/backend/src/server.js"]
