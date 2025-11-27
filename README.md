# My Pet Drive

## Traefik

```bash
export USER_NAME=admin

export PASSWORD=70bb0c937e6b640e6803bd919664d

export HASHED_PASSWORD=$(openssl passwd -apr1 $PASSWORD)

echo $HASHED_PASSWORD

export DOMAIN=my-domain.com

export EMAIL=

docker network create traefik-public

docker compose -f docker-compose.traefik.yml up -d
```
