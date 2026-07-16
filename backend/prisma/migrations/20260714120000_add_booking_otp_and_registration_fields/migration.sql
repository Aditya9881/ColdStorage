-- Align the migration history with the operational booking, OTP, and
-- registration fields already represented in prisma/schema.prisma.

-- Extend the existing user lifecycle.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'UserStatus' AND e.enumlabel = 'PENDING_KYC'
  ) THEN
    ALTER TYPE "UserStatus" ADD VALUE 'PENDING_KYC';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'UserStatus' AND e.enumlabel = 'KYC_SUBMITTED'
  ) THEN
    ALTER TYPE "UserStatus" ADD VALUE 'KYC_SUBMITTED';
  END IF;
END $$;

-- OTP records support passwordless login, registration verification, and
-- future dispatch/reset flows.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OtpPurpose') THEN
    CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'REGISTER', 'DISPATCH', 'RESET_PASSWORD');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "phone_otp" (
    "id" UUID NOT NULL,
    "phone" VARCHAR(15) NOT NULL,
    "otp" VARCHAR(72) NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phone_otp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "phone_otp_phone_purpose_idx" ON "phone_otp"("phone", "purpose");

-- Owner registration fields were added to the application schema after the
-- initial database migration.
ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "cs_registration_number" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "fssai_number" VARCHAR(20),
    ADD COLUMN IF NOT EXISTS "company_registration_number" VARCHAR(50);

-- Storage-booking lifecycle.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BookingStatus') THEN
    CREATE TYPE "BookingStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'ARRIVED',
    'WEIGHING',
    'STORED',
    'DISPATCH_REQUESTED',
    'DISPATCHING',
    'DISPATCHED',
    'COMPLETED',
    'CANCELLED',
    'REJECTED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "bookings" (
    "id" UUID NOT NULL,
    "booking_number" VARCHAR(30) NOT NULL,
    "qr_code_data" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "farmer_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "chamber_id" UUID,
    "commodity_category" "CommodityCategory" NOT NULL,
    "commodity_name" VARCHAR(100) NOT NULL,
    "estimated_weight_kg" DECIMAL(12,2) NOT NULL,
    "estimated_bags" INTEGER,
    "preferred_date" DATE NOT NULL,
    "preferred_slot" VARCHAR(20),
    "storage_duration" INTEGER,
    "arrived_at" TIMESTAMPTZ,
    "scanned_by" UUID,
    "actual_weight_kg" DECIMAL(12,2),
    "actual_bags" INTEGER,
    "weighed_at" TIMESTAMPTZ,
    "rate_per_unit" DECIMAL(10,2),
    "total_amount" DECIMAL(12,2),
    "advance_paid" DECIMAL(12,2),
    "dispatch_requested_at" TIMESTAMPTZ,
    "dispatched_at" TIMESTAMPTZ,
    "dispatch_weight_kg" DECIMAL(12,2),
    "dispatch_note" TEXT,
    "lot_id" UUID,
    "farmer_note" TEXT,
    "owner_note" TEXT,
    "cancel_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "bookings_booking_number_key" ON "bookings"("booking_number");
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_lot_id_key" ON "bookings"("lot_id");
CREATE INDEX IF NOT EXISTS "bookings_farmer_id_idx" ON "bookings"("farmer_id");
CREATE INDEX IF NOT EXISTS "bookings_facility_id_idx" ON "bookings"("facility_id");
CREATE INDEX IF NOT EXISTS "bookings_status_idx" ON "bookings"("status");
CREATE INDEX IF NOT EXISTS "bookings_preferred_date_idx" ON "bookings"("preferred_date");
CREATE INDEX IF NOT EXISTS "bookings_booking_number_idx" ON "bookings"("booking_number");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_farmer_id_fkey') THEN
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_farmer_id_fkey"
      FOREIGN KEY ("farmer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_facility_id_fkey') THEN
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_facility_id_fkey"
      FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_chamber_id_fkey') THEN
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_chamber_id_fkey"
      FOREIGN KEY ("chamber_id") REFERENCES "chambers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_scanned_by_fkey') THEN
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_scanned_by_fkey"
      FOREIGN KEY ("scanned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_lot_id_fkey') THEN
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_lot_id_fkey"
      FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
