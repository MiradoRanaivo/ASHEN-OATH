# ASHEN OATH API

Backend Node.js + Express + TypeScript. The API is separated from the Phaser client so that gameplay remains available when the API is offline.

## Requirements

- Node.js LTS
- npm
- PostgreSQL 13 or newer

## Local setup

1. Create a PostgreSQL database named `ashen_oath` (or update `DATABASE_URL`).
2. Copy `.env.example` to `.env` and adjust the database credentials.
3. Install dependencies and apply database migrations:

```bash
cd server
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

Health check: `GET http://localhost:3000/api/health`. The health route intentionally does not require PostgreSQL, so basic API availability remains independent from database availability.

## Database

- `users` stores account identifiers and password hashes only; plaintext passwords must never be stored.
- Username and email uniqueness is case-insensitive.
- `sessions` stores only a SHA-256 hash of the opaque session token, never the browser token itself.
- Migrations are SQL files in `src/db/migrations` and are tracked in `schema_migrations`. They run in filename order and each migration is transactional.

## Authentication architecture (implementation roadmap)

Authentication will be added in small, independently tested increments:

1. API foundation and environment validation (completed).
2. PostgreSQL connection, migrations, and user/session schema (current step).
3. Registration with input validation and Argon2id password hashing.
4. Login and opaque server-side sessions.
5. HttpOnly cookie handling, authentication middleware, current-user and logout endpoints.
6. Security tests, rate limiting, CSRF protection, and client integration.

The planned browser authentication mechanism is a server-side session identified by a cryptographically random opaque cookie. Passwords will never be stored in plaintext. Session identifiers and secrets must never be exposed to the Phaser client or committed to Git.

## Configuration

Copy `.env.example` to `.env`. Never commit real environment files or production secrets.
