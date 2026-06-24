# Acquisitions — Docker & Neon Setup

This project is a Node.js / Express + Drizzle ORM service that talks to a
**Postgres** database. It runs in two modes:

| Environment | Database                    | How it runs                                      |
| ----------- | --------------------------- | ------------------------------------------------ |
| Development | **Neon Local** (in Docker)  | `docker-compose.dev.yml` + ephemeral branch      |
| Production  | **Neon Cloud** (serverless) | `docker-compose.prod.yml` against `DATABASE_URL` |

The same image is used in both — only the environment variables change.

---

## 1. Prerequisites

- Docker Engine 24+ and Docker Compose v2
- A [Neon](https://console.neon.tech) account with a project
- A Neon **API key** (`Settings → API keys`)
- Your Neon **Project ID** (`Settings → General`)
- The ID of the branch you want to use as the **parent** for ephemeral
  dev branches (usually your `main` branch — `Settings → Branches`)

> ⚠️ On macOS Docker Desktop, use the **gRPC FUSE** file sharing driver
> (Settings → Experimental features / File sharing). Neon Local relies on
> `git` to detect the current branch, and VirtioFS can break that.

---

## 2. Environment files

Two files are **not** committed (they are in `.gitignore`):

- `.env.development` — read by `docker-compose.dev.yml`
- `.env.production` — read by `docker-compose.prod.yml`

Two example files are committed — copy them and fill in real values:

```bash
cp .env.development.example .env.development
cp .env.production.example  .env.production
```

### `.env.development`

```dotenv
NEON_API_KEY=...
NEON_PROJECT_ID=...
PARENT_BRANCH_ID=...   # parent for the ephemeral dev branch
ARCJET_KEY=...
```

`DATABASE_URL` is **not** required here — `docker-compose.dev.yml` injects
the Neon Local URL into the app container:

```
postgres://neon:npg@neon-local:5432/neondb?sslmode=require
```

(`neon-local` resolves to the proxy container on the compose network;
`neon`/`npg` are the default credentials baked into the Neon Local image;
`neondb` is the default database name.)

### `.env.production`

```dotenv
DATABASE_URL=postgres://neondb_owner:<password>@ep-xxx-pooler.<region>.aws.neon.tech/neondb?sslmode=require
ARCJET_KEY=...
NODE_ENV=production
LOG_LEVEL=info
PORT=3000
```

This URL is the one shown on the Neon dashboard under
`Project → Connection details`.

---

## 3. Running locally (Neon Local)

```bash
# 1. Fill in your Neon API key / project id / parent branch id
$EDITOR .env.development

# 2. Build and start the stack
docker compose -f docker-compose.dev.yml --env-file .env.development up --build
```

What you get:

- A `neon-local` container exposing Postgres on `localhost:5432`
- An **ephemeral** branch created from `PARENT_BRANCH_ID` on start
- The `app` container running your code on `http://localhost:3000`,
  connected to the proxy at `neon-local:5432`

The branch is destroyed automatically when the stack stops
(`DELETE_BRANCH=true`). To keep the branch between runs, set
`DELETE_BRANCH=false` in `docker-compose.dev.yml` and mount
`./.neon_local:/tmp/.neon_local` plus `./.git/HEAD:/tmp/.git/HEAD:ro`
on the `neon-local` service — Neon Local will then reuse one branch
per Git branch.

### Useful commands

```bash
# Tail logs from the app only
docker compose -f docker-compose.dev.yml logs -f app

# Open a psql shell against the ephemeral branch
docker compose -f docker-compose.dev.yml exec neon-local \
  psql "postgres://neon:npg@localhost:5432/neondb?sslmode=require"

# Tear everything down (this deletes the ephemeral branch)
docker compose -f docker-compose.dev.yml down
```

### Notes on SSL

Neon Local issues a self-signed certificate. The bundled
`@neondatabase/serverless` driver (which this app uses via Drizzle)
accepts self-signed certificates automatically when talking to the
local proxy, so the supplied `DATABASE_URL` ends in `sslmode=require`
and you do **not** need to set `NODE_EXTRA_CA_CERTS`.

If you ever swap to the classic `pg` driver, add
`?sslmode=require&sslcert=` to the URL **and** set
`ssl: { rejectUnauthorized: false }` in the client.

---

## 4. Running in production (Neon Cloud)

The production image is identical; only the environment differs.

```bash
# 1. Populate real secrets
$EDITOR .env.production

# 2. Build + run
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

What's different from dev:

- `DATABASE_URL` points at the **Neon Cloud** pooled connection string.
- `NODE_ENV=production` is set; the `Dockerfile`'s `runtime` stage is
  used (no dev deps, non-root user, `HEALTHCHECK`).
- There is **no** `neon-local` service. The `app` container talks
  directly to Neon over TLS.
- Secrets come exclusively from `.env.production` (or the orchestrator's
  secret store). Nothing is baked into the image.

### Cloud deployment (ECS, Fly.io, Render, Kubernetes, etc.)

You don't need `docker-compose.prod.yml` to deploy — you only need the
`app` service from it. Inject the same three variables:

- `NODE_ENV=production`
- `DATABASE_URL` — from Neon
- `ARCJET_KEY` — from Arcjet

`PARENT_BRANCH_ID`, `NEON_API_KEY`, and `NEON_PROJECT_ID` are
**development-only** and must never be set in production.

### Run database migrations in production

Drizzle migrations are baked into the image under `/app/drizzle`. To
apply them against the live database:

```bash
docker run --rm \
  --env-file .env.production \
  acquisitions:prod \
  npx drizzle-kit migrate
```

`db:push` is fine for local dev; prefer `db:migrate` in production.

---

## 5. How `DATABASE_URL` is selected

| Stack                      | Source                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| `docker-compose.dev.yml`   | Hardcoded in the compose file to `postgres://neon:npg@neon-local:5432/neondb?sslmode=require` |
| `docker-compose.prod.yml`  | `DATABASE_URL` from `.env.production` (Neon Cloud)                                            |
| Bare `npm run dev` on host | `DATABASE_URL` from the local `.env` (or the Neon Cloud URL if you skip Docker)               |

Switching between them is purely an environment-variable swap — no
code changes required.

---

## 6. File map

```
Dockerfile                  # multi-stage Node 22 Alpine build
.dockerignore
docker-compose.dev.yml      # app + neon-local
docker-compose.prod.yml     # app only, Neon Cloud DATABASE_URL
.env.development.example    # copy to .env.development
.env.production.example     # copy to .env.production
```

---

## 7. Troubleshooting

- **`connection refused` on `neon-local:5432`** — the proxy takes a few
  seconds to provision the ephemeral branch on first start. The `app`
  container has `depends_on: { neon-local: { condition: service_started }}`;
  if you see this, re-run with `docker compose logs neon-local`.
- **`NEON_API_KEY` invalid** — make sure the key is from
  `Settings → API keys` (not a password) and has access to the project.
- **Branch not deleted** — check `DELETE_BRANCH` is set to `true`
  (the default) in `docker-compose.dev.yml`.
- **macOS: "fatal: not a git repository"** — switch Docker Desktop's
  file sharing to **gRPC FUSE** (see Prerequisites).
