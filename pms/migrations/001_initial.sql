-- All stays use local calendar dates in Europe/Lisbon. Checkout is exclusive.
CREATE TABLE IF NOT EXISTS pms_migrations (
  version integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE houses (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired')),
  address_line1 text,
  address_line2 text,
  postal_code text,
  locality text,
  country_code char(2) NOT NULL DEFAULT 'PT',
  timezone text NOT NULL DEFAULT 'Europe/Lisbon',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rooms (
  id uuid PRIMARY KEY,
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE RESTRICT,
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired')),
  max_adults smallint NOT NULL CHECK (max_adults BETWEEN 1 AND 20),
  max_children smallint NOT NULL DEFAULT 0 CHECK (max_children BETWEEN 0 AND 20),
  max_occupancy smallint NOT NULL CHECK (max_occupancy BETWEEN 1 AND 30),
  min_nights smallint NOT NULL DEFAULT 1 CHECK (min_nights BETWEEN 1 AND 365),
  max_nights smallint NOT NULL DEFAULT 30 CHECK (max_nights BETWEEN 1 AND 365),
  payment_policy text NOT NULL DEFAULT 'full' CHECK (payment_policy IN ('full','deposit','pay_later')),
  deposit_percent smallint CHECK (deposit_percent BETWEEN 1 AND 99),
  check_in_from time,
  check_in_until time,
  check_out_until time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (house_id, slug),
  CHECK (max_nights >= min_nights),
  CHECK (max_occupancy <= max_adults + max_children),
  CHECK ((payment_policy = 'deposit') = (deposit_percent IS NOT NULL))
);
CREATE INDEX rooms_house_id_idx ON rooms(house_id);

CREATE TABLE nightly_rates (
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  stay_date date NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency char(3) NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  closed_to_arrival boolean NOT NULL DEFAULT false,
  closed_to_departure boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, stay_date)
);

CREATE TABLE booking_policies (
  version text PRIMARY KEY,
  active boolean NOT NULL DEFAULT false,
  terms_pt text NOT NULL CHECK (length(trim(terms_pt)) >= 20),
  terms_en text NOT NULL CHECK (length(trim(terms_en)) >= 20),
  cancellation_pt text NOT NULL CHECK (length(trim(cancellation_pt)) >= 20),
  cancellation_en text NOT NULL CHECK (length(trim(cancellation_en)) >= 20),
  privacy_url text NOT NULL CHECK (privacy_url ~ '^https?://'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_active_booking_policy ON booking_policies(active) WHERE active;

CREATE TABLE reservations (
  id uuid PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  check_in date NOT NULL,
  check_out date NOT NULL,
  adults smallint NOT NULL CHECK (adults BETWEEN 1 AND 20),
  children smallint NOT NULL DEFAULT 0 CHECK (children BETWEEN 0 AND 20),
  guest_name text NOT NULL CHECK (length(trim(guest_name)) BETWEEN 2 AND 160),
  guest_email text NOT NULL CHECK (length(guest_email) BETWEEN 3 AND 254),
  guest_phone text,
  guest_country_code char(2),
  guest_notes text CHECK (length(guest_notes) <= 2000),
  locale text NOT NULL DEFAULT 'pt' CHECK (locale IN ('pt','en')),
  source text NOT NULL CHECK (source IN ('direct','admin')),
  status text NOT NULL CHECK (status IN ('pending_checkout','awaiting_payment','confirmed','checked_in','checked_out','cancelled','expired','payment_review')),
  currency char(3) NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  accommodation_cents integer NOT NULL CHECK (accommodation_cents >= 0),
  fees_cents integer NOT NULL DEFAULT 0 CHECK (fees_cents >= 0),
  tax_cents integer NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  discount_cents integer NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  payment_due_cents integer NOT NULL CHECK (payment_due_cents >= 0),
  payment_policy text NOT NULL CHECK (payment_policy IN ('full','deposit','pay_later')),
  policy_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  terms_accepted_at timestamptz,
  privacy_acknowledged_at timestamptz,
  hold_expires_at timestamptz,
  stripe_checkout_session_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  cancellation_reason text,
  CHECK (check_out > check_in),
  CHECK (total_cents = accommodation_cents + fees_cents + tax_cents - discount_cents),
  CHECK (payment_due_cents <= total_cents),
  CHECK (status NOT IN ('pending_checkout','awaiting_payment') OR hold_expires_at IS NOT NULL)
);
CREATE INDEX reservations_room_dates_idx ON reservations(room_id, check_in, check_out);
CREATE INDEX reservations_status_idx ON reservations(status);

CREATE TABLE inventory_nights (
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  stay_date date NOT NULL,
  reservation_id uuid REFERENCES reservations(id) ON DELETE RESTRICT,
  block_id uuid,
  rate_cents integer CHECK (rate_cents IS NULL OR rate_cents >= 0),
  PRIMARY KEY (room_id, stay_date),
  CHECK ((reservation_id IS NOT NULL AND block_id IS NULL) OR (reservation_id IS NULL AND block_id IS NOT NULL))
);
CREATE INDEX inventory_nights_reservation_idx ON inventory_nights(reservation_id);

CREATE TABLE availability_blocks (
  id uuid PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  check_in date NOT NULL,
  check_out date NOT NULL,
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 2 AND 500),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (check_out > check_in)
);
ALTER TABLE inventory_nights ADD CONSTRAINT inventory_nights_block_fk
  FOREIGN KEY (block_id) REFERENCES availability_blocks(id) ON DELETE RESTRICT;
CREATE INDEX inventory_nights_block_idx ON inventory_nights(block_id);

CREATE TABLE payments (
  id uuid PRIMARY KEY,
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE RESTRICT,
  provider text NOT NULL DEFAULT 'stripe' CHECK (provider = 'stripe'),
  provider_payment_intent_id text UNIQUE,
  provider_checkout_session_id text UNIQUE,
  status text NOT NULL CHECK (status IN ('pending','paid','failed','refunded','partially_refunded','review')),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  refunded_cents integer NOT NULL DEFAULT 0 CHECK (refunded_cents >= 0),
  currency char(3) NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  method text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (refunded_cents <= amount_cents)
);
CREATE INDEX payments_reservation_idx ON payments(reservation_id);

CREATE TABLE stripe_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error text
);

CREATE TABLE audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_entity_idx ON audit_log(entity_type, entity_id);
