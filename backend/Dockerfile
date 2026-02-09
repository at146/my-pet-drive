# ---------- Builder ----------
FROM node:25.6-bookworm-slim AS builder

WORKDIR /app

COPY package*.json /app/

COPY backend/package.json /app/backend/

WORKDIR /app/backend

RUN npm ci

COPY ./backend /app/backend/

RUN npm run build
RUN npm prune --omit=dev

# ---------- Runner ----------
FROM node:25.6-bookworm-slim AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./backend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist

ENV PORT=3000
EXPOSE 3000

USER node

CMD ["node", "backend/dist/app.js"]
