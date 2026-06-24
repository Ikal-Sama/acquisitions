# CLAUDE.md — Acquisitions Project Rules

> This file defines **project-specific** rules for Claude when working inside
> the `acquisitions` repository. It overrides generic behavior. Read this
> before doing anything non-trivial in this codebase.

---

## 1. What this project is

`acquisitions` is a **Node.js / Express 5** REST API written in **ESM
JavaScript** ("type": "module" in `package.json`).

- **Persistence:** Postgres via **Drizzle ORM** (`drizzle-orm/neon-http`).
- **Database hosting:**
  - **Dev** → [Neon Local](https://neon.tech) (Docker proxy + ephemeral
    branch) via `docker-compose.dev.yml`.
  - **Prod** → [Neon Cloud](https://neon.tech) serverless via
    `docker-compose.prod.yml` with `DATABASE_URL`.
- **Auth:** JWT (HttpOnly cookies via `cookie-parser`) + `bcrypt`.
- **Validation:** `zod`.
- **Security:** [`@arcjet/node`](https://arcjet.com) — shield, bot
  detection, sliding-window rate limiting (applied via
  `src/middleware/security.middleware.js`).
- **Logging:** `winston` → `logs/error.log`, `logs/combined.log`, plus a
  colored console transport in non-production.
- **Hardening:** `helmet`, `cors`, `cookie-parser`, `morgan` (combined
  format → winston).
- **Lint/format:** `eslint` + `prettier` (single quotes, semicolons,
  2-space indent, LF, `printWidth: 80`, `arrowParens: avoid`).
- **Container:** Multi-stage `Dockerfile` (Node 22 Alpine), runs as
  non-root `node` user, with a `/health` `HEALTHCHECK`.

The repo root has three top-level pieces: `src/`, `drizzle/` (generated
SQL migrations), and the Docker / env scaffolding.

---

## 2. Architecture & folder conventions

```
src/
├── app.js               # Express app: middleware wiring + route mounts
├── server.js            # http.createServer wrapper around app
├── index.js             # entry: loads dotenv + runs server.js
├── config/              # database, logger, arcjet — load once, share
│   ├── database.js
│   ├── logger.js
│   └── arcjet.js
├── routes/              # Express routers (thin, delegate to controllers)
├── controllers/         # HTTP-shaped logic: req → res, Zod validation, errors
├── services/            # Business logic: db calls, hashing, JWT issuance
├── middleware/          # security.middleware.js (Arcjet rate limit / shield / bots)
├── models/              # Drizzle schema definitions (*.model.js)
├── validations/         # Zod schemas (auth.validation.js, etc.)
├── utils/               # format.js, jwt.js, cookies.js (pure helpers)
└── logs/                # not committed; written by Winston
```

### Imports

`package.json` defines **path aliases** (`#config/*`, `#logger/*`,
`#controllers/*`, `#services/*`, `#middleware/*`, `#models/*`,
`#routes/*`, `#utils/*`, `#validations/*`). **Always use them** in new
code instead of relative `../../../` paths. Example:

```js
import logger from '#config/logger.js';
import { getAllUsers } from '#services/users.service.js';
```

Existing inconsistency: a few files use relative paths (e.g.
`auth.service.js` imports `../models/user.model.js`). When editing those
files, **do not churn** the imports unless the surrounding file is being
substantively refactored — match the file's existing style.

### Layering rules

- **routes/** → only wires URL → controller. No business logic.
- **controllers/** → parse req, run Zod `safeParse`, call services,
  shape the response, set cookies, log via `winston`, forward errors
  with `next(e)`.
- **services/** → pure-ish business logic. DB calls, bcrypt, etc. Throw
  on failure; controllers translate exceptions into HTTP statuses.
- **validations/** → Zod schemas only.
- **utils/** → no I/O, no `req`/`res`. `format.js`, `cookies.js`,
  `jwt.js` are the only current members; keep utils dependency-free
  where possible.
- **config/** → singletons (`db`, `logger`, `arcjet`). Import from
  here; do **not** re-instantiate `winston` or `arcjet` elsewhere.

---

## 3. What to do

- **Use ESM imports** with the `.js` extension everywhere
  (`import x from './foo.js'`). This is required for native ESM + Node's
  resolver.
- **Validate request bodies with Zod** using `safeParse` and return
  `400 { error: 'Validation failed', details: formatValidationError(...) }`
  on failure — match `auth.controller.js`'s style.
- **Hash passwords with `bcrypt`** via
  `services/auth.service.js#hashPassword` (cost 10). Never store
  plaintext. Never log passwords or hashes.
- **Sign JWTs** via `utils/jwt.js#jwttoken.sign` and set them with
  `cookies.set(res, 'token', token)`. Default expiry is `1d`.
- **Use `logger` (winston)** for all server logs. `logger.info`,
  `logger.error`, `logger.warn`. Do not mix in `console.log` for
  production code paths.
- **Forward errors with `next(e)`** in controllers so the centralized
  error handler can shape them. Catch known business errors (e.g.
  `'User not found'`, `'Invalid credentials'`, `'User with this email
already exists'`) and translate to `401`/`409` before falling through.
- **Add new tables** by creating a `*.model.js` in `src/models/` and
  running `npm run db:generate` (Drizzle Kit picks them up via
  `drizzle.config.js`'s `schema: './src/models/*.js'`). For prod,
  apply with `npm run db:migrate`. Avoid `db:push` in prod.
- **Write Drizzle queries using the schema object**, not raw SQL. Use
  the typed column refs (`users.email`, `users.id`).
- **Keep responses consistent.** JSON, camelCase fields, `{ message,
data, count? }` shape as already used in `users.controller.js`.
- **Mount new routers in `app.js`** under `/api/<resource>`.
- **Run `npm run lint` and `npm run format`** before considering work
  done. Match the repo's prettier settings (single quotes, semis,
  2-space, `arrowParens: 'avoid'`, LF).
- **Add a route entry in `routes/*.route.js`**, a controller in
  `controllers/*.controller.js`, and a service in
  `services/*.service.js` — follow the same naming convention as
  existing files.

---

## 4. What NOT to do

- **Do not commit secrets.** `.env.development` and `.env.production`
  are git-ignored for a reason. Never read them into version control,
  and never paste real values into chat output. The `JWT_SECRET` default
  fallback in `utils/jwt.js` is a development-only placeholder — flag
  it loudly if you see it referenced in production paths.
- **Do not change `DATABASE_URL` semantics per environment in code.**
  The dev stack hardcodes the Neon Local URL in
  `docker-compose.dev.yml`; the prod stack reads it from
  `.env.production`. Don't add code that branches on
  `process.env.NODE_ENV` for DB selection beyond what
  `config/database.js` already does for the Neon fetch endpoint.
- **Do not set `NEON_API_KEY`, `NEON_PROJECT_ID`, or
  `PARENT_BRANCH_ID` in production.** They are dev-only.
- **Do not switch DB drivers.** The project intentionally uses
  `@neondatabase/serverless` (HTTP, edge-friendly) via
  `drizzle-orm/neon-http`. Do not add `pg`/`postgres`/`mysql2` or
  replace the driver.
- **Do not import `console.log` in app code paths.** Use `logger`.
  `console.log` is currently only acceptable in `server.js`'s listen
  banner and `security.middleware.js`'s catch — replace if you are
  refactoring those.
- **Do not use relative `../../../` paths in new files.** Use the
  `#<bucket>/*` aliases defined in `package.json`.
- **Do not write CommonJS** (`require`, `module.exports`). This is an
  ESM-only project.
- **Do not skip Zod validation** at controller boundaries. Even
  internal-only handlers should validate; trust nothing that crosses
  a process or module boundary.
- **Do not leak sensitive fields.** Never return `password` from a
  service response — see the explicit column selection in
  `auth.service.js#authenticateUser` and `createUser` that omits it.
  Mirror that pattern.
- **Do not disable Arcjet rules** (`shield`, `detectBot`,
  `slidingWindow`) without an explicit user request. The global
  instance in `config/arcjet.js` and the per-role limit in
  `middleware/security.middleware.js` are intentional.
- **Do not change Helmet/CORS defaults casually.** They are applied
  globally in `app.js` and are part of the hardening baseline.
- **Do not add `db:push` as a default path in prod.** Drizzle Kit
  migrate (`db:migrate`) is the supported prod path.
- **Do not commit `node_modules/`, `logs/`, `.env*` (non-example)
  files.** Check `.gitignore` if unsure.
- **Do not edit files under `drizzle/meta/`** by hand — those are
  generated by `drizzle-kit`. Edit the model and re-generate.
- **Do not modify `Dockerfile` multi-stage structure** without
  understanding that the `runtime` stage runs as the non-root `node`
  user and expects `/app/logs` to be writable (it's pre-created with
  `chown`).
- **Do not remove the `HEALTHCHECK`** from the Dockerfile; it's used
  by `docker-compose.prod.yml`.
- **Do not use `network_mode: host` on macOS/Windows Docker Desktop
  without flagging it.** It is in `docker-compose.dev.yml` for a
  specific reason (systemd-resolved DNS workaround on Kubuntu).
  Removing it breaks Neon Local on Linux; on macOS the project uses
  gRPC FUSE for a different reason. Don't "fix" it generically.
- **Do not write tests yet** if a test framework isn't set up. No
  `tests/` directory or `vitest`/`jest` config exists yet — if you
  need tests, propose the framework first.

---

## 5. Coding conventions (quick reference)

| Concern      | Rule                                                                         |
| ------------ | ---------------------------------------------------------------------------- |
| Quotes       | Single quotes (`'`)                                                          |
| Semicolons   | Always                                                                       |
| Indent       | 2 spaces, no tabs                                                            |
| Line endings | LF (`linebreak-style: unix`)                                                 |
| Line width   | 80 chars (Prettier `printWidth`)                                             |
| Arrow parens | `avoid` (no parens around single param: `x => x.id`)                         |
| Imports      | ESM with `.js` extension; prefer `#alias/*` paths                            |
| Async errors | `try/catch` + `logger.error(...)` + `next(e)` in controllers                 |
| Validation   | `zod.<schema>.safeParse(req.body)`                                           |
| DB driver    | `drizzle-orm/neon-http` via `@neondatabase/serverless`                       |
| Passwords    | `bcrypt` cost 10; never log; never return                                    |
| Auth         | JWT in HttpOnly cookie (`sameSite: 'strict'`, secure in prod)                |
| Logging      | `winston` (`#config/logger.js`)                                              |
| Lint         | `npm run lint`                                                               |
| Format       | `npm run format`                                                             |
| HTTP errors  | `{ error, details? }` JSON; status from controller                           |
| New env vars | Add to `.env.example`, `.env.development.example`, `.env.production.example` |

---

## 6. Workflow / commands Claude may run

These are known-good for this project. Stay inside this list unless
the user explicitly authorizes something else:

- `npm run dev` — local Node 22 + `--watch` (requires a `DATABASE_URL`
  in `.env` or running Neon Local).
- `npm run lint` / `npm run lint:fix`
- `npm run format` / `npm run format:check`
- `npm run db:generate` / `db:push` / `db:migrate` / `db:studio`
- `npm run dev:docker` — wraps `docker-compose.dev.yml` start
- `npm run prod:docker` — wraps `docker-compose.prod.yml` start
- `docker compose -f docker-compose.dev.yml --env-file .env.development up --build`
- `docker compose -f docker-compose.dev.yml logs -f app`
- `docker compose -f docker-compose.dev.yml down`

**Do not** start the prod stack locally without confirming with the
user — it talks to Neon Cloud with real credentials.

---

## 7. Before finishing any task

Checklist before declaring work done:

1. `npm run lint` — passes with zero errors.
2. `npm run format:check` — passes.
3. If you touched a model: `npm run db:generate` and confirm the new
   migration under `drizzle/` is sensible.
4. New routes hit `app.js`; new tables have a model; new business
   logic lives in `services/`.
5. No secrets in code, logs, or responses.
6. Error paths return structured JSON, not raw stack traces.
7. Validation runs at the controller boundary for any new endpoint.
