# Acquisitions

A Node.js / Express + Drizzle ORM REST API talking to **Postgres**. Runs via
Docker Compose (dev/prod) or on **Kubernetes** (Minikube or cloud).

| Mode          | Database                         | How to run                                                  |
| ------------- | -------------------------------- | ----------------------------------------------------------- |
| Dev (Docker)  | **Neon Local** (ephemeral proxy) | `npm run dev:docker`                                        |
| Prod (Docker) | **Neon Cloud** (serverless)      | `docker compose -f docker-compose.prod.yml up`              |
| Local K8s     | **In-cluster Postgres 16**       | `./scripts/k8s-minikube.sh up:local`                        |
| Cloud K8s     | **Neon Cloud** (serverless)      | `./scripts/k8s-minikube.sh up` (requires `.env.production`) |

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

## 5. Publishing the Docker image

Tag and push to your registry for use in Kubernetes or other orchestrators:

```bash
# Tag with your registry and desired tag
docker tag acquisitions:prod docker.io/<username>/acquisitions:latest
docker tag acquisitions:prod docker.io/<username>/acquisitions:<version>

# Push
docker push docker.io/<username>/acquisitions:latest
```

The production image is built via:

```bash
docker build --target runtime -t acquisitions:prod .
```

Update `k8s/deployment.yaml` and `k8s/migration-job.yaml` to reference your
published image (`image: <username>/acquisitions:latest`) before deploying
to a remote cluster.

---

## 6. Kubernetes — Minikube (local)

### One-command deploy

```bash
# Uses Neon Cloud (requires .env.production with DATABASE_URL)
./scripts/k8s-minikube.sh up

# Uses an in-cluster Postgres 16 (no cloud dependencies)
./scripts/k8s-minikube.sh up:local
```

Both commands: build the image, load it into Minikube, apply manifests,
run migrations, and deploy the app.

### Other script commands

```bash
./scripts/k8s-minikube.sh down     # remove workloads (keeps namespace + secrets)
./scripts/k8s-minikube.sh status   # show pods, services, and the app URL
./scripts/k8s-minikube.sh logs     # tail app logs
```

### Access the API

```bash
# Option A: Port-forward
kubectl port-forward -n acquisitions svc/acquisitions-service 3000:3000
curl http://localhost:3000/health

# Option B: Minikube tunnel
minikube service acquisitions-service -n acquisitions --url
# → http://127.0.0.1:<random-port>
```

Both options survive laptop sleep; after a reboot run `minikube start` first.

### K8s manifests (`k8s/`)

| File                       | Purpose                                     |
| -------------------------- | ------------------------------------------- |
| `namespace.yaml`           | `acquisitions` namespace                    |
| `configmap.yaml`           | Non-sensitive env vars (`NODE_ENV`, etc.)   |
| `secret.yaml`              | `DATABASE_URL`, `ARCJET_KEY`, `JWT_SECRET`  |
| `secret.example.yaml`      | Template for creating secrets via `kubectl` |
| `deployment.yaml`          | App deployment (Neon Cloud)                 |
| `service.yaml`             | NodePort service for the app                |
| `migration-job.yaml`       | Runs `drizzle-kit migrate` on deploy        |
| `postgres.yaml`            | In-cluster Postgres 16 StatefulSet          |
| `postgres-service.yaml`    | ClusterIP service for Postgres              |
| `local/deployment.yaml`    | App deployment (local Postgres)             |
| `local/migration-job.yaml` | Migration job using local Postgres          |

The local variants (`k8s/local/`) hardcode `DATABASE_URL` to
`postgres://acquisitions:acquisitions@postgres:5432/acquisitions` and do
not require a ConfigMap or external secrets.

---

## 7. How `DATABASE_URL` is selected

| Stack                      | Source                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| `docker-compose.dev.yml`   | Hardcoded in the compose file to `postgres://neon:npg@neon-local:5432/neondb?sslmode=require` |
| `docker-compose.prod.yml`  | `DATABASE_URL` from `.env.production` (Neon Cloud)                                            |
| Bare `npm run dev` on host | `DATABASE_URL` from the local `.env` (or the Neon Cloud URL if you skip Docker)               |

Switching between them is purely an environment-variable swap — no
code changes required.

---

## 8. File map

```
Dockerfile                     # multi-stage Node 22 Alpine build
.dockerignore
docker-compose.dev.yml         # app + neon-local
docker-compose.prod.yml        # app only, Neon Cloud DATABASE_URL
.env.development.example       # copy to .env.development
.env.production.example        # copy to .env.production
scripts/
├── dev.sh                     # entry for npm run dev:docker
├── prod.sh                    # entry for npm run prod:docker
├── k8s-minikube.sh            # deploy to minikube (up/up:local/down/status/logs)
├── migrate.js                 # migrate via drizzle-orm/neon-http
└── migrate.local.js           # migrate via drizzle-orm/node-postgres (for local K8s Postgres)
k8s/
├── namespace.yaml             # acquisitions namespace
├── configmap.yaml             # non-sensitive env vars
├── secret.yaml                # sensitive env vars (committed for dev convenience)
├── secret.example.yaml        # template for cloud deployment
├── deployment.yaml            # app deployment (Neon Cloud)
├── service.yaml               # NodePort service
├── migration-job.yaml         # migration job (Neon Cloud)
├── postgres.yaml              # in-cluster Postgres StatefulSet
├── postgres-service.yaml      # Postgres ClusterIP service
└── local/
    ├── deployment.yaml        # app deployment (local Postgres)
    └── migration-job.yaml     # migration job (local Postgres)
```

---

## 9. Troubleshooting

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
