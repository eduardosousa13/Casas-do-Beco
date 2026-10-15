CREATE TABLE public_checkout_requests (
  request_key uuid PRIMARY KEY, payload_hash text NOT NULL,
  reservation_id uuid NOT NULL UNIQUE REFERENCES reservations(id),
  quote jsonb NOT NULL, session_params jsonb, checkout_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public_request_limits (
  key text PRIMARY KEY, window_start timestamptz NOT NULL, hits integer NOT NULL
);
CREATE TABLE worker_health (
  id text PRIMARY KEY, last_seen timestamptz NOT NULL
);

ALTER TABLE payment_commands ADD COLUMN session_params jsonb;
