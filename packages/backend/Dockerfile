# -------- Build stage --------
FROM node:18-alpine AS builder
ENV NODE_ENV=production
WORKDIR /app

# Root manifest
COPY package.json package-lock.json ./

# Workspace manifestleri (backend + shared)
COPY packages/backend/package.json  packages/backend/
COPY packages/shared/package.json   packages/shared/

# Prod bağımlılıkları – script tetikleme!
RUN npm ci --workspaces --include-workspace-root --omit=dev --ignore-scripts

# Kaynak kod
COPY . .

# Eğer backend TypeScript ise ŞUNU AÇ:
# RUN npm run build -w @justdesk/backend

# -------- Runtime stage --------
FROM node:18-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Güvenli kullanıcı
RUN addgroup -g 1001 -S nodejs \
 && adduser -S backend -u 1001

# Sadece gerekenler
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./

# Sahiplik
RUN chown -R backend:nodejs /app
USER backend

EXPOSE 3001
ENV PORT=3001

# JS kullanıyorsan:
CMD ["node", "packages/backend/src/server.js"]

# TS kullanıyorsan (ve build satırını açtıysan):
# CMD ["node", "packages/backend/dist/server.js"]
