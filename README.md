# My Pet Drive

Москва, ул. Ленина, 10
Москва, ул. Пушкина, 5

## TODO

Админу можно отправить любой текст - поправить sendConfirmNotif и sendCancelNotif в [route.js](./frontend/src/scripts/route.js)

## Traefik

```bash
export USER_NAME=admin

export PASSWORD=70bb0c937e6b640e6803bd919664d

export HASHED_PASSWORD=$(openssl passwd -apr1 $PASSWORD)

echo $HASHED_PASSWORD

export DOMAIN=mypetdrive.ru

export EMAIL=

docker network create traefik-public

docker compose -f docker-compose.traefik.yml up -d
```
