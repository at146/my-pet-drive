# Deployment

Этот проект разворачивается с помощью Docker Compose на удалённом сервере.

Ниже описан базовый сценарий деплоя в продакшн/стейджинг‑окружение с использованием Traefik как внешнего прокси и Docker Compose для стека приложения.

### 1. Подготовка сервера и домена

- **Сервер**: подготовьте удалённый сервер (VPS/VM), установите на него Linux и обновите систему.
- **Docker**: установите Docker Engine и Docker Compose, следуя официальной документации Docker.
- **DNS**:
  - настройте основной домен, указывающий на IP сервера, например `my-pet-drive.example.com`;
  - настройте wildcard‑поддомен `*.my-pet-drive.example.com`, чтобы использовать разные поддомены для компонентов:
    - `dashboard.my-pet-drive.example.com` — frontend;
    - `api.my-pet-drive.example.com` — backend;
    - `traefik.my-pet-drive.example.com` — Traefik dashboard;
    - опционально: `adminer.my-pet-drive.example.com` или другие сервисы.

### 2. Публичный Traefik

Для обработки входящих соединений (HTTP/HTTPS), автоматического получения сертификатов Let’s Encrypt и маршрутизации запросов используется Traefik.

#### 2.1. Каталог и compose‑файл для Traefik

На удалённом сервере создайте каталог под Traefik:

```bash
mkdir -p /root/code/traefik-public/
```

Скопируйте подготовленный `compose.traefik.yml` на сервер (пример с rsync из локального репозитория):

```bash
rsync -a compose.traefik.yml root@your-server.example.com:/root/code/traefik-public/
```

#### 2.2. Общая публичная сеть Docker

Создайте docker‑сеть `traefik-public`, через которую Traefik будет «видеть» остальные стеки:

```bash
docker network create traefik-public
```

Эта сеть должна быть подключена как к Traefik, так и к стеку вашего приложения (указывается в соответствующих `compose` файлах).

#### 2.3. Переменные окружения для Traefik

Перед запуском Traefik на сервере задайте переменные окружения:

```bash
export USER_NAME=admin             # логин для basic‑auth к Traefik dashboard
export PASSWORD=changethis        # простой пароль, замените на свой
export HASHED_PASSWORD=$(openssl passwd -apr1 $PASSWORD)
export DOMAIN=my-pet-drive.example.com
export EMAIL=admin@example.com    # опционально, e‑mail для Let's Encrypt (НЕ @example.com)
```

Проверьте значение:

```bash
echo $HASHED_PASSWORD
```

#### 2.4. Запуск Traefik

Перейдите в каталог с файлом `compose.traefik.yml` и поднимите стек:

```bash
cd /root/code/traefik-public/
docker compose -f compose.traefik.yml up -d
```

### 3. Копирование кода приложения на сервер

Из локальной машины (из корня репозитория `my-pet-drive`) скопируйте код на сервер, игнорируя файлы из `.gitignore`:

```bash
rsync -av --filter=":- .gitignore" ./ root@your-server.example.com:/root/code/app/
```

Код приложения на сервере далее предполагается в каталоге `/root/code/app/`.

### 4. Переменные окружения приложения

В проекте используются переменные окружения.

#### 4.1. Основные переменные окружения

На сервере задайте переменные окружения (через `export`, `.env` или системный unit‑файл — по вашим предпочтениям). Базовый набор:

```bash
export ENVIRONMENT=production
export DOMAIN=my-pet-drive.example.com
export STACK_NAME=my-pet-drive
export BACKEND_CORS_ORIGINS="https://${DOMAIN},https://api.${DOMAIN}"
export VITE_TELEGRAM_BOT_LOGIN="changethis"
export VITE_API_URL="https://api.${DOMAIN}"
export SHEETDB_URL="changethis"
export BOT_TOKEN="changethis"
export ADMIN_CHAT="changethis"
export DRIVERS_CHAT="changethis"
export MERCHANT="changethis"
export PASS1="changethis"
export DOCKER_IMAGE_BACKEND="changethis"
export DOCKER_IMAGE_FRONTEND="changethis"
```

Дополнительно, по необходимости:

- `PORT` — порт для backend.
- `TAG` — тег для образов docker.

### 5. Деплой с помощью Docker Compose

После копирования кода и установки переменных окружения зайдите на сервер:

```bash
ssh root@your-server.example.com
cd /root/code/app/
```

Соберите и поднимите стек (пример для основного `compose.yml` без override‑файлов для разработки):

```bash
docker compose -f compose.yml build
docker compose -f compose.yml up -d
```

Убедитесь, что:

- все контейнеры запущены (`docker ps`);
- Traefik видит ваш стек и маршруты соответствуют ожидаемым хостнеймам/лейблам.

### 6. CI/CD с GitHub Actions (опционально)

Вы можете:

- поднять self‑hosted GitHub Actions runner на вашем сервере под отдельным пользователем (например, `github`);
- добавить его как раннер к репозиторию и пометить нужными лейблами (`staging`, `production` и т.п.);
- настроить workflow‑файлы в `.github/workflows` для:
  - деплоя в `staging` при пуше в соответствующую ветку;
  - деплоя в `production` при выпуске релиза.

В Github Secrets репозитория рекомендуется хранить значения:

- `VITE_TELEGRAM_BOT_LOGIN`
- `SHEETDB_URL`
- `BOT_TOKEN`
- `ADMIN_CHAT`
- `DRIVERS_CHAT`
- `MERCHANT`
- `PASS1`

### 7. Основные URL‑адреса (пример)

При домене `my-pet-drive.example.com` ожидаются следующие URL:

- **Traefik dashboard**: `https://traefik.my-pet-drive.example.com`
- **Frontend**: `https://my-pet-drive.example.com`
- **Backend API docs**: `https://api.my-pet-drive.example.com/docs`
- **Backend API base URL**: `https://api.my-pet-drive.example.com`

При использовании стейджинга вы можете зарезервировать домены вида:

- `https://staging.my-pet-drive.example.com`
- `https://api.staging.my-pet-drive.example.com`

