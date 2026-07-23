# Fleet Management API

API RESTful para la gestión de flotas de transporte construida con NestJS, Prisma y PostgreSQL.

## Tabla de Contenidos

- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración de la Base de Datos](#configuración-de-la-base-de-datos)
- [Ejecutar la Aplicación](#ejecutar-la-aplicación)
- [Pruebas](#pruebas)
- [Documentación de la API](#documentación-de-la-api)
- [Uso de pgAdmin4](#uso-de-pgadmin4)
- [Variables de Entorno](#variables-de-entorno)
- [Scripts Disponibles](#scripts-disponibles)

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado lo siguiente:

- [Node.js](https://nodejs.org/) (versión 18 o superior)
- [PostgreSQL](https://www.postgresql.org/) (versión 12 o superior)
- [Git](https://git-scm.com/)
- [pgAdmin4](https://www.pgadmin.org/) (opcional, para inspección de la base de datos)

## Instalación

1. Clona el repositorio:

```bash
git clone <URL_DEL_REPOSITORIO>
cd flotaAPIs
```

2. Instala las dependencias:

```bash
npm install
```

3. Configura las variables de entorno:

Copia el archivo `.env.example` a `.env` y ajusta los valores según tu entorno:

```bash
cp .env.example .env
```

El archivo `.env` debería contener:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=tu_contraseña
POSTGRES_DB=flota_api
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_SCHEMA=public
DATABASE_URL="postgresql://postgres:tu_contraseña@localhost:5432/flota_api?schema=public"
JWT_SECRET="tu_secreto_jwt"
JWT_REFRESH_SECRET="tu_secreto_refresh"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3300
```

> **Nota:** La variable `DATABASE_URL` se construye automáticamente a partir de las otras variables, pero puedes sobrescribirla si es necesario.

## Configuración de la Base de Datos

1. Asegúrate de que el servicio de PostgreSQL esté en ejecución y que la base de datos especificada en `.env` exista. Puedes crearla con:

```bash
createdb -Usuariopostgres -h localhost -p 5432 -U postgres flota_api
```

2. Ejecuta las migraciones de Prisma para crear las tablas:

```bash
npm run prisma:migrate
```

3. (Opcional) Ejecuta el seed para poblar la base de datos con datos de ejemplo:

```bash
npm run seed
```

## Ejecutar la Aplicación

### Modo de Desarrollo

```bash
npm run start:dev
```

La aplicación estará disponible en `http://localhost:3300`.

### Modo de Producción

1. Construye la aplicación:

```bash
npm run build
```

2. Inicia la aplicación:

```bash
npm run start:prod
```

La aplicación estará disponible en `http://localhost:3300`.

## Pruebas

Ejecuta las pruebas unitarias y de integración:

```bash
npm run test
```

Para ejecutar las pruebas con cobertura:

```bash
npm run test:cov
```

Para ejecutar las pruebas end-to-end (e2e):

```bash
npm run test:e2e
```

## Documentación de la API

Una vez que la aplicación esté en ejecución, puedes acceder a la documentación interactiva de la API mediante Swagger UI:

```
http://localhost:3300/api/docs
```

## Uso de pgAdmin4

Para inspeccionar la base de datos con pgAdmin4:

1. Abre pgAdmin4 y conéctate a tu servidor PostgreSQL.
2. Crea una nueva conexión si no existe:
   - Host: `localhost`
   - Puerto: `5432`
   - Base de datos: `flota_api`
   - Usuario: `postgres`
   - Contraseña: `tu_contraseña`
3. Navega hasta la base de datos `flota_api` y luego a `Schemas > public > Tables` para ver las tablas creadas por Prisma.

## Variables de Entorno

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `POSTGRES_USER` | Usuario de PostgreSQL | `postgres` |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL | (requerido) |
| `POSTGRES_DB` | Nombre de la base de datos | `flota_api` |
| `POSTGRES_HOST` | Host de PostgreSQL | `localhost` |
| `POSTGRES_PORT` | Puerto de PostgreSQL | `5432` |
| `POSTGRES_SCHEMA` | Esquema de la base de datos | `public` |
| `DATABASE_URL` | URL de conexión a la base de datos | Construida automáticamente |
| `JWT_SECRET` | Secreto para firmar tokens JWT | (requerido) |
| `JWT_REFRESH_SECRET` | Secreto para firmar tokens de actualización JWT | (requerido) |
| `JWT_EXPIRES_IN` | Tiempo de expiración de los tokens JWT | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Tiempo de expiración de los tokens de actualización | `7d` |
| `PORT` | Puerto en el que la aplicación escucha | `3300` |

## Scripts Disponibles

En el archivo `package.json`, encontrarás los siguientes scripts útiles:

- `npm run build`: Compila la aplicación TypeScript a JavaScript.
- `npm run start`: Inicia la aplicación compilada.
- `npm run start:dev`: Inicia la aplicación en modo de desarrollo con recarga en caliente.
- `npm run start:prod`: Inicia la aplicación en modo de producción.
- `npm run prisma:generate`: Genera el cliente de Prisma.
- `npm run prisma:migrate`: Ejecuta las migraciones pendientes.
- `npm run prisma:seed`: Ejecuta el seed de datos.
- `npm run prisma:validate`: Valida el esquema de Prisma.
- `npm run lint`: Ejecuta ESLint para corregir errores de estilo.
- `npm run test`: Ejecuta las pruebas con Jest.
- `npm run test:cov`: Ejecuta las pruebas con cobertura.
- `npm run test:e2e`: Ejecuta las pruebas end-to-end.

## Licencia

Este proyecto está bajo la licencia UNLICENSED.

## Soporte

Si tienes alguna pregunta o problema, por favor abre un issue en el repositorio.