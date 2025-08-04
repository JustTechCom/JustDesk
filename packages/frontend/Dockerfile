# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy workspace package manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/frontend/package.json packages/frontend/

# Install dependencies for workspaces
RUN npm install --workspaces

# Copy source files
COPY packages/shared packages/shared
COPY packages/frontend packages/frontend

# Build the application
WORKDIR /app/packages/frontend
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy built application
COPY --from=builder /app/packages/frontend/public ./public
COPY --from=builder /app/packages/frontend/.next/standalone ./
COPY --from=builder /app/packages/frontend/.next/static ./.next/static

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "server.js"]

