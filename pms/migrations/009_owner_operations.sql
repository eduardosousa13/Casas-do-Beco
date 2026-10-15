ALTER TABLE reservations ADD COLUMN revision integer NOT NULL DEFAULT 1;
ALTER TABLE reservations ADD COLUMN internal_notes text NOT NULL DEFAULT '' CHECK (length(internal_notes)<=4000);
ALTER TABLE reservations ADD COLUMN settlement_cents integer CHECK (settlement_cents>=0);
ALTER TABLE reservations ADD COLUMN arrival_time text CHECK (arrival_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
CREATE TABLE owner_operations (
  id uuid PRIMARY KEY, actor text NOT NULL, payload_hash text NOT NULL,
  result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE reservation_emails (
  id uuid PRIMARY KEY, reservation_id uuid NOT NULL REFERENCES reservations(id),
  kind text NOT NULL CHECK (kind IN ('confirmation','changed','cancelled','payment','refund')),
  event_key text NOT NULL UNIQUE, recipient text NOT NULL, subject text NOT NULL, body text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','cancelled')),
  attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE INDEX reservation_emails_queue ON reservation_emails(available_at) WHERE status='queued';
CREATE TABLE payment_commands (
  id uuid PRIMARY KEY, reservation_id uuid NOT NULL REFERENCES reservations(id),
  payment_id uuid REFERENCES payments(id), kind text NOT NULL CHECK (kind IN ('balance','refund')),
  amount_cents integer NOT NULL CHECK (amount_cents>0), actor text NOT NULL, reason text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','pending','succeeded','failed','review','expired')),
  provider_id text UNIQUE, checkout_url text, attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_open_balance ON payment_commands(reservation_id) WHERE kind='balance' AND status IN ('queued','pending','review');
CREATE INDEX payment_commands_reservation ON payment_commands(reservation_id);
ALTER TABLE payments ADD COLUMN command_id uuid UNIQUE REFERENCES payment_commands(id);
ALTER TABLE payments ADD COLUMN fee_cents integer;
ALTER TABLE payments ADD COLUMN net_cents integer;
CREATE TABLE refund_records (
  provider_id text PRIMARY KEY, payment_id uuid NOT NULL REFERENCES payments(id),
  amount_cents integer NOT NULL CHECK(amount_cents>0), status text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refund_records_payment ON refund_records(payment_id);
