FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev
RUN npm install --only=production


# Copy source files
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001

# Set ownership
RUN chown -R backend:nodejs /app

USER backend

EXPOSE 3001

CMD ["node", "packages/backend/src/server.js"]


