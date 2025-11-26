# ---------- Builder ----------
FROM node:24.8-bookworm-slim AS builder

WORKDIR /app

COPY package*.json /app/

RUN npm ci

COPY . /app/
RUN npm run build

# ---------- Runner ----------
FROM nginx:1 AS runner

RUN rm -rf /usr/share/nginx/html/index.html

COPY --from=builder /app/dist/ /usr/share/nginx/html

COPY ./nginx.conf /etc/nginx/conf.d/default.conf
