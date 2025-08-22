FROM node:18-alpine

ENV NODE_ENV=production
WORKDIR /app

# Root lockfile + backend package.json kopyala
COPY package.json package-lock.json ./
COPY packages/backend/package.json ./packages/backend/package.json

# Yalnızca backend workspace'ini prod olarak kur
RUN npm ci --workspace @justdesk/backend --omit=dev --ignore-scripts

# Backend kaynak kodunu getir
COPY packages/backend/ ./packages/backend/

WORKDIR /app/packages/backend
EXPOSE 3001
CMD ["node", "src/server.js"]