ALTER TABLE rooms ADD COLUMN max_babies smallint NOT NULL DEFAULT 0 CHECK(max_babies BETWEEN 0 AND 10);
ALTER TABLE reservations ADD COLUMN babies smallint NOT NULL DEFAULT 0 CHECK(babies BETWEEN 0 AND 10);
DO $$ DECLARE capacity_constraint text; BEGIN
  SELECT conname INTO STRICT capacity_constraint FROM pg_constraint WHERE conrelid='rooms'::regclass AND contype='c'
    AND pg_get_constraintdef(oid) LIKE '%max_occupancy%' AND pg_get_constraintdef(oid) LIKE '%max_adults%' AND pg_get_constraintdef(oid) LIKE '%max_children%';
  EXECUTE format('ALTER TABLE rooms DROP CONSTRAINT %I',capacity_constraint);
END $$;
ALTER TABLE rooms ADD CONSTRAINT rooms_capacity_total CHECK(max_occupancy <= max_adults + max_children + max_babies);
ALTER TABLE rooms ADD COLUMN internal_code text NOT NULL DEFAULT '' CHECK(length(internal_code)<=40);
ALTER TABLE rooms ADD COLUMN room_type text NOT NULL DEFAULT '' CHECK(length(room_type)<=100);
ALTER TABLE rooms ADD COLUMN floor text NOT NULL DEFAULT '' CHECK(length(floor)<=40);
ALTER TABLE rooms ADD COLUMN bathroom text CHECK(bathroom IN ('private','shared'));
ALTER TABLE rooms ADD COLUMN access_type text CHECK(access_type IN ('step_free','stairs','lift'));
ALTER TABLE rooms ADD COLUMN accessibility_pt text NOT NULL DEFAULT '' CHECK(length(accessibility_pt)<=2000);
ALTER TABLE rooms ADD COLUMN accessibility_en text NOT NULL DEFAULT '' CHECK(length(accessibility_en)<=2000);
ALTER TABLE rooms ADD COLUMN beds_single smallint CHECK(beds_single BETWEEN 0 AND 20);
ALTER TABLE rooms ADD COLUMN beds_double smallint CHECK(beds_double BETWEEN 0 AND 20);
ALTER TABLE rooms ADD COLUMN beds_queen smallint CHECK(beds_queen BETWEEN 0 AND 20);
ALTER TABLE rooms ADD COLUMN beds_king smallint CHECK(beds_king BETWEEN 0 AND 20);
ALTER TABLE rooms ADD COLUMN beds_bunk smallint CHECK(beds_bunk BETWEEN 0 AND 20);
ALTER TABLE rooms ADD COLUMN beds_sofa smallint CHECK(beds_sofa BETWEEN 0 AND 20);
ALTER TABLE rooms ADD COLUMN cots smallint CHECK(cots BETWEEN 0 AND 10);
ALTER TABLE rooms ADD COLUMN amenities jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(amenities)='array');
