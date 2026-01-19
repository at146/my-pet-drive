# ---------- Builder ----------
FROM node:25.3-bookworm-slim AS builder

WORKDIR /app

COPY package*.json /app/

RUN npm ci

COPY . /app/

ARG VITE_API_URL=${VITE_API_URL}
ARG VITE_TELEGRAM_BOT_LOGIN=${VITE_TELEGRAM_BOT_LOGIN}

RUN npm run build

# ---------- Runner ----------
FROM nginx:1 AS runner

RUN rm -rf /usr/share/nginx/html/index.html

COPY --from=builder /app/dist/ /usr/share/nginx/html

COPY ./nginx.conf /etc/nginx/conf.d/default.conf
