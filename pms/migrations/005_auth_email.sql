CREATE TABLE auth_email_jobs (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES pms_auth_user(id) ON DELETE CASCADE,
  payload text,
  status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sent','failed','expired','cancelled')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK ((status='queued') = (payload IS NOT NULL))
);
CREATE INDEX auth_email_jobs_queue_idx ON auth_email_jobs(available_at) WHERE status='queued';
