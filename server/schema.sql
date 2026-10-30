CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 60),
  dates text[] NOT NULL CHECK (cardinality(dates) BETWEEN 1 AND 30),
  time_start integer NOT NULL CHECK (time_start BETWEEN 0 AND 23),
  time_end integer NOT NULL CHECK (time_end BETWEEN 1 AND 24),
  owner_token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (time_start < time_end)
);

CREATE TABLE IF NOT EXISTS availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 20),
  slots text[] NOT NULL,
  response_token_hash text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS availability_room_id_created_at_idx
  ON availability (room_id, created_at);

-- Idempotent upgrade: preserve legacy responses; they have no ownership token.
BEGIN;
ALTER TABLE availability ADD COLUMN IF NOT EXISTS response_token_hash text;
ALTER TABLE availability DROP CONSTRAINT IF EXISTS availability_room_id_name_key;
ALTER TABLE availability DROP CONSTRAINT IF EXISTS availability_slots_check;
CREATE UNIQUE INDEX IF NOT EXISTS availability_room_response_token_idx
  ON availability (room_id, response_token_hash);
COMMIT;
