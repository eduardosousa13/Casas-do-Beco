CREATE TABLE pms_staff (
  user_id text PRIMARY KEY REFERENCES pms_auth_user(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','manager','cleaner','viewer')),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE houses ADD COLUMN revision integer NOT NULL DEFAULT 1;
ALTER TABLE rooms ADD COLUMN revision integer NOT NULL DEFAULT 1;
ALTER TABLE houses ADD COLUMN description_pt text NOT NULL DEFAULT '';
ALTER TABLE houses ADD COLUMN description_en text NOT NULL DEFAULT '';
ALTER TABLE rooms ADD COLUMN name_en text NOT NULL DEFAULT '';
ALTER TABLE rooms ADD COLUMN description_pt text NOT NULL DEFAULT '';
ALTER TABLE rooms ADD COLUMN description_en text NOT NULL DEFAULT '';
