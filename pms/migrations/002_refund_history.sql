-- Refunds may arrive before checkout completion or out of order.
CREATE TABLE stripe_refund_totals (
  payment_intent_id text PRIMARY KEY,
  refunded_cents integer NOT NULL CHECK (refunded_cents >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
