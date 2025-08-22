FROM node:18-alpine

ENV NODE_ENV=production
WORKDIR /app

# Manifesti kopyala
COPY packages/backend/package.json ./

# Lockfile olmadığından ci yerine install
RUN npm install --ignore-scripts \
 && npm prune --omit=dev || true

# Kaynak kodu kopyala
COPY packages/backend/ ./

EXPOSE 3001
CMD ["node", "src/server.js"]