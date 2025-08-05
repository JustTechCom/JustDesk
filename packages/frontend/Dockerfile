# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
# Use wildcard on package-lock.json to avoid build errors when the lockfile is absent
COPY package.json package-lock.json* ./
RUN npm install

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV NODE_ENV production

CMD ["node", "server.js"]
 