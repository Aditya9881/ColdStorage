-- `unique_id` is used by authentication and operational workflows but was not
-- present in the original baseline migration. Keep this additive so existing
-- databases and fresh CI databases converge safely.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "unique_id" VARCHAR(20);
CREATE UNIQUE INDEX IF NOT EXISTS "users_unique_id_key" ON "users"("unique_id");
