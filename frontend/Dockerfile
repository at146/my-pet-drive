# ---------- Builder ----------
FROM node:24.8-bookworm-slim AS builder

WORKDIR /app

COPY package*.json /app/

COPY frontend/package.json /app/frontend/

WORKDIR /app/frontend

RUN npm ci

COPY ./frontend /app/frontend/

ARG VITE_API_URL=${VITE_API_URL}
ARG VITE_TELEGRAM_BOT_LOGIN=${VITE_TELEGRAM_BOT_LOGIN}

RUN npm run build

# ---------- Runner ----------
FROM nginx:1 AS runner

RUN rm -rf /usr/share/nginx/html/index.html

COPY --from=builder /app/frontend/dist/ /usr/share/nginx/html

COPY ./frontend/nginx.conf /etc/nginx/conf.d/default.conf
