ALTER TABLE alert_events ADD COLUMN destination text NOT NULL DEFAULT 'operations'
  CHECK(destination IN ('operations','technical'));
UPDATE alert_events SET destination='technical' WHERE kind IN ('reservation_email','auth_email');
DROP INDEX alert_events_pending;
CREATE INDEX alert_events_pending ON alert_events(destination,available_at,id)
  WHERE delivery_status IN ('pending','sending');
ALTER TABLE alert_delivery_channels DROP CONSTRAINT alert_delivery_channels_id_check;
UPDATE alert_delivery_channels SET id='telegram:operations' WHERE id='telegram';
ALTER TABLE alert_delivery_channels ADD CONSTRAINT alert_delivery_channels_id_check
  CHECK(id IN ('telegram:operations','telegram:technical'));
CREATE OR REPLACE FUNCTION record_operational_alert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO alert_events(kind,entity_type,entity_id,state,destination)
    VALUES(TG_ARGV[0],TG_TABLE_NAME,NEW.id::text,NEW.status,
      CASE WHEN TG_ARGV[0] IN ('reservation_email','auth_email') THEN 'technical' ELSE 'operations' END);
  ELSIF TG_TABLE_NAME='reservations' AND (to_jsonb(NEW)->>'revision') IS DISTINCT FROM (to_jsonb(OLD)->>'revision') THEN
    INSERT INTO alert_events(kind,entity_type,entity_id,state,destination)
    VALUES('reservation',TG_TABLE_NAME,NEW.id::text,'changed','operations');
  END IF;
  RETURN NEW;
END;
$$;
