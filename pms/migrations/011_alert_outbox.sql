-- Transport-independent outbox. No guest names, emails, phones or credentials.
-- Delivery will be enabled separately after a destination is approved.
CREATE TABLE alert_events (
  id bigserial PRIMARY KEY,
  kind text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  state text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX alert_events_pending ON alert_events(available_at,id) WHERE delivered_at IS NULL;
CREATE FUNCTION record_operational_alert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO alert_events(kind,entity_type,entity_id,state)
    VALUES(TG_ARGV[0],TG_TABLE_NAME,NEW.id::text,NEW.status);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reservation_alert AFTER INSERT OR UPDATE OF status ON reservations
FOR EACH ROW EXECUTE FUNCTION record_operational_alert('reservation');
CREATE TRIGGER payment_alert AFTER INSERT OR UPDATE OF status ON payments
FOR EACH ROW EXECUTE FUNCTION record_operational_alert('payment');
CREATE TRIGGER command_alert AFTER INSERT OR UPDATE OF status ON payment_commands
FOR EACH ROW EXECUTE FUNCTION record_operational_alert('payment_command');
CREATE TRIGGER mail_alert AFTER INSERT OR UPDATE OF status ON reservation_emails
FOR EACH ROW EXECUTE FUNCTION record_operational_alert('reservation_email');
