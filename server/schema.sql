CREATE TABLE IF NOT EXISTS projects (id uuid PRIMARY KEY, document jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
