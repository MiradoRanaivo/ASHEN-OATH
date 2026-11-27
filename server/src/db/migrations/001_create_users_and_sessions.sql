CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username varchar(24) NOT NULL,
  email varchar(254) NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_username_length CHECK (char_length(username) BETWEEN 3 AND 24),
  CONSTRAINT users_email_length CHECK (char_length(email) BETWEEN 5 AND 254),
  CONSTRAINT users_password_hash_not_empty CHECK (length(password_hash) > 0)
);

CREATE UNIQUE INDEX users_username_lower_unique
  ON users (lower(username));

CREATE UNIQUE INDEX users_email_lower_unique
  ON users (lower(email));

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);
