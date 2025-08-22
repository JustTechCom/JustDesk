FROM node:18-alpine

ENV NODE_ENV=production
WORKDIR /app

# Backend manifestleri (lockfile DAHİL!)
COPY packages/backend/package.json packages/backend/package-lock.json ./

# Sadece prod bağımlılıklar
RUN npm ci --omit=dev --ignore-scripts

# Kaynak kod
COPY packages/backend/ ./

EXPOSE 3001
CMD ["node", "src/server.js"]