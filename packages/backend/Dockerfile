# ---------- Backend ----------
FROM node:18-alpine AS backend

ENV NODE_ENV=production
WORKDIR /app/packages/backend

COPY  . .
RUN npm install


ENV PORT=3001
EXPOSE 3001
CMD ["node", "src/server.js"]


