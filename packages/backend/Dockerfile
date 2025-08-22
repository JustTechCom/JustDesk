# ---------- Backend ----------
FROM node:18-alpine

WORKDIR /app/packages/backend

COPY package*.json ./
RUN npm install --omit=dev

COPY packages/backend/ ./

EXPOSE 3001

CMD ["node", "src/server.js"]