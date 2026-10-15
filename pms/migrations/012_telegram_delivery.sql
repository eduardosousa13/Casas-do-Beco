ALTER TABLE alert_events
  ADD COLUMN delivery_status text NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending','sending','sent','skipped','dead')),
  ADD COLUMN lease_token uuid,
  ADD COLUMN lease_until timestamptz,
  ADD COLUMN last_error_code text;
UPDATE alert_events SET delivery_status='sent' WHERE delivered_at IS NOT NULL;
DROP INDEX alert_events_pending;
CREATE INDEX alert_events_pending ON alert_events(available_at,id)
  WHERE delivery_status IN ('pending','sending');
CREATE TABLE alert_delivery_channels (
  id text PRIMARY KEY CHECK(id='telegram'),
  config_hash text NOT NULL,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid,
  lease_until timestamptz,
  blocked_reason text,
  last_success_at timestamptz
);
-- Changes to stay dates/room/financial details increment reservation revision.
-- Record the change even when its booking status stays the same.
CREATE OR REPLACE FUNCTION record_operational_alert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO alert_events(kind,entity_type,entity_id,state)
    VALUES(TG_ARGV[0],TG_TABLE_NAME,NEW.id::text,NEW.status);
  ELSIF TG_TABLE_NAME='reservations' AND (to_jsonb(NEW)->>'revision') IS DISTINCT FROM (to_jsonb(OLD)->>'revision') THEN
    INSERT INTO alert_events(kind,entity_type,entity_id,state)
    VALUES('reservation',TG_TABLE_NAME,NEW.id::text,'changed');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER reservation_alert ON reservations;
CREATE TRIGGER reservation_alert AFTER INSERT OR UPDATE OF status,revision ON reservations
FOR EACH ROW EXECUTE FUNCTION record_operational_alert('reservation');
CREATE TRIGGER auth_mail_alert AFTER INSERT OR UPDATE OF status ON auth_email_jobs
FOR EACH ROW EXECUTE FUNCTION record_operational_alert('auth_email');
