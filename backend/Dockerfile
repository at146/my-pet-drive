# ---------- Builder ----------
FROM node:25.3-bookworm-slim AS builder

WORKDIR /app

COPY package*.json /app/

RUN npm ci

COPY . /app/
RUN npm run build

# ---------- Runner ----------
FROM node:25.3-bookworm-slim AS runner

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

ENV PORT=3000
EXPOSE 3000

USER node

CMD ["node", "dist/app.js"]
