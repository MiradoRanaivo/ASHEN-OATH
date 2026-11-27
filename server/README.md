# ASHEN OATH API

Backend Node.js + Express + TypeScript. The API is separated from the Phaser client so that gameplay remains available when the API is offline.

## Requirements

- Node.js LTS
- npm

## Local setup

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Health check: `GET http://localhost:3000/api/health`.

## Authentication architecture (implementation roadmap)

Authentication will be added in small, independently tested increments:

1. API foundation and environment validation (current step).
2. PostgreSQL connection, migrations, and user/session schema.
3. Registration with input validation and Argon2id password hashing.
4. Login and opaque server-side sessions.
5. HttpOnly cookie handling, authentication middleware, current-user and logout endpoints.
6. Security tests, rate limiting, CSRF protection, and client integration.

The planned browser authentication mechanism is a server-side session identified by a cryptographically random opaque cookie. Passwords will never be stored in plaintext. Session identifiers and secrets must never be exposed to the Phaser client or committed to Git.

## Configuration

Copy `.env.example` to `.env`. Never commit real environment files or production secrets.
