# --- JustDesk Backend (lockfile yok, workspaces'e bulaşma) ---
FROM node:18-alpine

ENV NODE_ENV=production
WORKDIR /app/packages/backend

# 1) Sadece backend manifestini kopyala
COPY packages/backend/package.json ./

# 2) Lockfile yok -> npm install; dev'leri env ile zaten atlıyoruz (NODE_ENV=production)
RUN npm install --ignore-scripts \
  && node -e "require('express'); console.log('express OK')"  # fail-fast test

# 3) Kaynak kodu kopyala
COPY packages/backend/ ./

# 4) (kritik) 0.0.0.0'a bind etmen lazım (server.js içinde)
#    app.listen(process.env.PORT || 3001, '0.0.0.0')
ENV PORT=3001
EXPOSE 3001

CMD ["node", "src/server.js"]