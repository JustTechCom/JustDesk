# ---- deps stage: sadece backend bağımlılıkları ----
FROM node:18-alpine AS deps
WORKDIR /app

# Backend manifestlerini kopyala
# package-lock backend klasöründe yoksa bu satır sorun çıkarmaz
COPY packages/backend/package.json ./package.json
COPY packages/backend/package-lock.json ./package-lock.json

# Lock varsa ci, yoksa install
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev; \
    else \
      npm install --omit=dev; \
    fi

# ---- runtime stage ----
FROM node:18-alpine
ENV NODE_ENV=production
WORKDIR /app

# node_modules ve kaynak kod
COPY --from=deps /app/node_modules ./node_modules
COPY packages/backend/ ./

# Non-root
RUN addgroup -g 1001 -S nodejs \
 && adduser -S backend -u 1001 \
 && chown -R backend:nodejs /app
USER backend

EXPOSE 3001
CMD ["node", "src/server.js"]
