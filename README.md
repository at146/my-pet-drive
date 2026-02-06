# My Pet Drive

Сервис заказа такси для перевозки питомцев. Клиенты оформляют заказы через веб-приложение с авторизацией в Telegram, выбирают маршрут на карте и тариф, оплачивают через Robokassa. Заказы сохраняются в Google Sheets, водители и администратор получают уведомления в Telegram.

## Основные возможности

- **Оформление заказа** — выбор точек маршрута на карте, тарифы (eco, opti, maxi), расчёт стоимости
- **Авторизация** — вход через Telegram Web App
- **Оплата** — интеграция с Robokassa
- **Хранение заказов** — Google Sheets через SheetDB API
- **Уведомления** — Telegram-бот для водителей и администратора

## Стек технологий

### Frontend
- **Vite** — сборка и dev-сервер
- **Vanilla HTML/JS** — без фреймворков
- **Leaflet** — интерактивные карты
- **Nginx** — отдача статики в production

### Backend
- **Node.js** + **Express 5**
- **TypeScript**
- **nodemon** — hot reload в разработке
- **CORS**, **crypto-js** (подпись платежей), **dotenv**, **node-fetch**

### Инфраструктура и инструменты
- **SheetDB** — API поверх Google Sheets как база заказов
- **Telegram Bot API** — уведомления водителям и админу
- **Robokassa** — приём оплаты
- **Biome** — линтер и форматирование
- **npm workspaces** — монорепозиторий (frontend + backend)

### Деплой
- **Docker** + **Docker Compose** (`compose.yml`, `compose.override.yml`)
- **Traefik** — внешний reverse proxy (`compose.traefik.yml`, общая сеть `traefik-public`)
- **GitHub Actions** — CI/CD (см. `.github/workflows/`)
- **Документация по деплою** — подробная инструкция в `deployment.md`

## Структура проекта

```
├── backend/               # Express API (Node.js + Express 5, TypeScript)
│   ├── src/
│   │   ├── routes/        # orders, payment, telegram, utils
│   │   └── services/      # order, sheetdb, telegram
│   └── Dockerfile
├── frontend/              # SPA на Vite, отдаётся через Nginx
│   ├── drive.html         # основная страница
│   ├── order.html         # отклик на заказ
│   ├── route.html         # маршрут
│   ├── nginx.conf         # конфиг Nginx для фронтенда
│   └── Dockerfile
├── compose.yml            # основной стек backend+frontend, подключение к traefik-public
├── compose.override.yml   # локальная разработка (порты, без TLS)
├── compose.traefik.yml    # публичный Traefik-прокси (dashboard + HTTPS)
├── deployment.md          # подробное руководство по продакшн‑деплою
├── .github/workflows/     # CI/CD и вспомогательные workflows
└── .env.example           # пример переменных окружения (в т.ч. Docker‑образы)
```

## Локальный запуск

1. Скопировать `.env.example` в `.env` и заполнить значения.
2. Установить зависимости: `npm install`
3. Запуск в dev:
   - `npm run dev:frontend`, `npm run dev:backend`
4. Или через Docker: `docker compose up --build`

## Переменные окружения

См. `.env.example` — нужны: `SHEETDB_URL`, `BOT_TOKEN`, `DRIVERS_CHAT`, `ADMIN_CHAT`, `BACKEND_CORS_ORIGINS`, Robokassa (`MERCHANT`, `PASS1`), `VITE_API_URL`, `VITE_TELEGRAM_BOT_LOGIN`.
