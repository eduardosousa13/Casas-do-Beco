-- Contact intake and durable delivery live in one row. No public read endpoint.
CREATE TABLE contact_messages (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL CHECK(length(name) BETWEEN 2 AND 100),
  email text NOT NULL CHECK(length(email) BETWEEN 3 AND 254),
  phone text NOT NULL DEFAULT '' CHECK(length(phone)<=40),
  subject text NOT NULL CHECK(subject IN ('nascente','poente','geral','outra')),
  message text NOT NULL CHECK(length(message) BETWEEN 10 AND 3000),
  notification_recipient text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sent','failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
  available_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX contact_messages_pending ON contact_messages(available_at,id) WHERE status='queued';
CREATE INDEX contact_messages_received ON contact_messages(created_at DESC,id);
-- Only final delivery failures reach the technical group, without the message.
CREATE FUNCTION record_contact_email_failure() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status='failed' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO alert_events(kind,entity_type,entity_id,state,destination)
      VALUES('contact_email','contact_messages',NEW.id::text,'failed','technical');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER contact_email_alert AFTER UPDATE OF status ON contact_messages
FOR EACH ROW EXECUTE FUNCTION record_contact_email_failure();
