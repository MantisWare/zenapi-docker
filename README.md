# [Zenapi](https://github.com/MantisWare/zenapi) containerized

API creation made simple, secure and fast.

## Quickstart (recommended)

1. `git clone https://github.com/MantisWare/zenapi-docker && cd zenapi-docker`
2. Run using `docker-compose up`

## Pull from Docker Hub - (No Longer Supported)

```bash
docker pull zenapi/zenapi
```

### Then run image

Start a database (e.g. MongoDB)

```bash
docker run -e MONGO_INITDB_DATABASE=zenapi \
           -v `pwd`/db/:/data/db \
           --name zenapi-mongo \
           -d mongo
```

Start zenapi

```bash
docker run -e APP_NAME=zenapi-app \
           -e DATABASE_CLIENT=mongo \
           -e DATABASE_HOST=zenapi-mongo \
           -e DATABASE_PORT=27017 \
           -e DATABASE_NAME=zenapi \
           -v `pwd`/zenapi-app:/usr/src/api/zenapi-app \
           --link zenapi-mongo:mongo \
           -p 5050:5050 \
           --name zenapi -d zenapi/zenapi
```

You should be able to access your Zenapi installation at [localhost:5050](http://localhost:5050).

## Use as base image

```Dockerfile
FROM MantisWare/zenapi
```

## Environment variables

- `APP_NAME` to override the `zenapi-app` generated folder name (you should also update the volumes paths).
- `DATABASE_CLIENT` a database providers supported by Zenapi: MongoDB, Postgres, MySQL, Sqlite3 and Redis.
- `DATABASE_HOST` database service name.
- `DATABASE_PORT` depends on your database client.
- `DATABASE_NAME` initializes a database with specific name (default zenapi). When using MongoDB, you should also update the `MONGO_INITDB_DATABASE` environment in the db service.
- `DATABASE_USERNAME` set the username of the database connection.
- `DATABASE_PASSWORD` set the password of the database connection.
- `DATABASE_SRV` boolean for SRV.
- `DATABASE_SSL` boolean for SSL.
- `DATABASE_AUTHENTICATION_DATABASE` set the authentification.
