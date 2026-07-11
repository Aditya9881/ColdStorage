-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'OWNER', 'STAFF', 'FARMER', 'BUYER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "FacilityStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "StorageType" AS ENUM ('BAG', 'BULK', 'HYBRID');

-- CreateEnum
CREATE TYPE "ChamberStatus" AS ENUM ('OPERATIONAL', 'MAINTENANCE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "CommodityCategory" AS ENUM ('POTATO', 'ONION', 'VEGETABLES', 'FRUITS', 'DAIRY', 'FROZEN_SEAFOOD', 'FROZEN_MEAT', 'PROCESSED_FOOD', 'SEEDS', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('FSSAI_REGISTRATION', 'STATE_HORTICULTURE_LICENSE', 'POLLUTION_CONSENT', 'FIRE_SAFETY_CERTIFICATE', 'WDRA_REGISTRATION', 'GST_CERTIFICATE', 'BUSINESS_REGISTRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('PER_DAY_PER_MT', 'PER_MONTH_PER_MT', 'PER_SEASON', 'FLAT_RATE');

-- CreateEnum
CREATE TYPE "PricingStatus" AS ENUM ('ACTIVE', 'PENDING_APPROVAL', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('INTAKE_PENDING', 'STORED', 'PARTIALLY_RELEASED', 'FULLY_RELEASED', 'EXPIRED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "QualityGrade" AS ENUM ('A', 'B', 'C', 'REJECTED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INTAKE', 'PARTIAL_RELEASE', 'FULL_RELEASE', 'QUALITY_UPDATE', 'WEIGHT_ADJUSTMENT', 'TRANSFER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'SOLD', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DISPATCHED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TEMPERATURE_ALERT', 'LOT_EXPIRY_WARNING', 'INVOICE_OVERDUE', 'CHAMBER_CAPACITY_WARNING', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(15) NOT NULL,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "registration_number" VARCHAR(100),
    "facility_id" UUID,
    "avatar_url" VARCHAR(512),
    "preferred_lang" VARCHAR(5) NOT NULL DEFAULT 'en',
    "address_line1" VARCHAR(255),
    "address_line2" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "pincode" VARCHAR(6),
    "aadhaar_number" VARCHAR(12),
    "pan_number" VARCHAR(10),
    "kyc_verified" BOOLEAN NOT NULL DEFAULT false,
    "kyc_verified_at" TIMESTAMPTZ,
    "land_holding" VARCHAR(100),
    "khasra_number" VARCHAR(50),
    "village_name" VARCHAR(100),
    "district" VARCHAR(100),
    "gst_number" VARCHAR(15),
    "business_name" VARCHAR(255),
    "business_type" VARCHAR(100),
    "password_hash" VARCHAR(255) NOT NULL,
    "last_login_at" TIMESTAMPTZ,
    "push_token" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token" VARCHAR(512) NOT NULL,
    "device_info" JSONB,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "registration_number" VARCHAR(100),
    "address_line1" VARCHAR(255) NOT NULL,
    "address_line2" VARCHAR(255),
    "city" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "pincode" VARCHAR(6) NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "total_capacity_mt" DECIMAL(12,2) NOT NULL,
    "storage_type" "StorageType" NOT NULL DEFAULT 'BAG',
    "status" "FacilityStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "operating_since" DATE,
    "owner_id" UUID NOT NULL,
    "contact_phone" VARCHAR(15),
    "contact_email" VARCHAR(255),
    "verified_at" TIMESTAMPTZ,
    "verified_by" UUID,
    "verification_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chambers" (
    "id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "chamber_number" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100),
    "capacity_mt" DECIMAL(10,2) NOT NULL,
    "occupied_mt" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "target_temp_min" DECIMAL(5,2),
    "target_temp_max" DECIMAL(5,2),
    "target_humidity_min" DECIMAL(5,2),
    "target_humidity_max" DECIMAL(5,2),
    "commodity_category" "CommodityCategory",
    "status" "ChamberStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "storage_type" "StorageType" NOT NULL DEFAULT 'BAG',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "chambers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_documents" (
    "id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "document_number" VARCHAR(100),
    "file_url" VARCHAR(512) NOT NULL,
    "issued_date" DATE,
    "expiry_date" DATE,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "review_notes" TEXT,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" UUID NOT NULL,

    CONSTRAINT "facility_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_pricing" (
    "id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "commodity_category" "CommodityCategory" NOT NULL,
    "pricing_model" "PricingModel" NOT NULL,
    "rate_amount" DECIMAL(10,2) NOT NULL,
    "rate_currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "PricingStatus" NOT NULL DEFAULT 'ACTIVE',
    "admin_approved" BOOLEAN NOT NULL DEFAULT false,
    "max_allowed_rate" DECIMAL(10,2),
    "effective_from" DATE NOT NULL,
    "effective_until" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "facility_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_lots" (
    "id" UUID NOT NULL,
    "lot_number" VARCHAR(50) NOT NULL,
    "receipt_number" VARCHAR(50) NOT NULL,
    "qr_code_data" VARCHAR(512),
    "facility_id" UUID NOT NULL,
    "chamber_id" UUID NOT NULL,
    "depositor_id" UUID NOT NULL,
    "commodity_category" "CommodityCategory" NOT NULL,
    "commodity_name" VARCHAR(100) NOT NULL,
    "intake_weight_kg" DECIMAL(12,2) NOT NULL,
    "current_weight_kg" DECIMAL(12,2) NOT NULL,
    "bag_count" INTEGER,
    "quality_grade" "QualityGrade",
    "quality_notes" TEXT,
    "moisture_content" DECIMAL(5,2),
    "intake_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_release" DATE,
    "actual_release_date" TIMESTAMPTZ,
    "status" "LotStatus" NOT NULL DEFAULT 'INTAKE_PENDING',
    "applied_rate" DECIMAL(10,2),
    "pricing_model" "PricingModel",
    "total_rent_accrued" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_rent_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "inventory_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "weight_kg" DECIMAL(12,2) NOT NULL,
    "bag_count" INTEGER,
    "notes" TEXT,
    "gate_pass_number" VARCHAR(50),
    "authorized_by" UUID,
    "depositor_approved" BOOLEAN NOT NULL DEFAULT false,
    "performed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performed_by" UUID NOT NULL,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "facility_id" UUID NOT NULL,
    "depositor_id" UUID NOT NULL,
    "lot_id" UUID,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "billing_period_start" DATE,
    "billing_period_end" DATE,
    "issue_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" DATE NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "user_role" "UserRole",
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temperature_readings" (
    "id" UUID NOT NULL,
    "chamber_id" UUID NOT NULL,
    "temperature" DECIMAL(5,2) NOT NULL,
    "humidity" DECIMAL(5,2),
    "sensor_id" VARCHAR(50),
    "is_alert" BOOLEAN NOT NULL DEFAULT false,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temperature_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "action_url" VARCHAR(512),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "reference_number" VARCHAR(100),
    "notes" TEXT,
    "paid_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_listings" (
    "id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "asking_price_per_kg" DECIMAL(10,2) NOT NULL,
    "min_quantity_kg" DECIMAL(12,2),
    "description" TEXT,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "listed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "market_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "quantity_kg" DECIMAL(12,2) NOT NULL,
    "agreed_price_per_kg" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "otp_code" VARCHAR(72),
    "otp_expires_at" TIMESTAMPTZ,
    "approved_at" TIMESTAMPTZ,
    "rejected_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_reviews" (
    "id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "facility_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_receipts" (
    "id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "receipt_number" VARCHAR(50) NOT NULL,
    "wdra_repo_id" VARCHAR(100),
    "is_negotiable" BOOLEAN NOT NULL DEFAULT true,
    "is_pledged" BOOLEAN NOT NULL DEFAULT false,
    "pledged_to" VARCHAR(255),
    "pledge_amount" DECIMAL(12,2),
    "pledge_date" TIMESTAMPTZ,
    "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "warehouse_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrow_transactions" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "buyer_paid_at" TIMESTAMPTZ,
    "seller_released_at" TIMESTAMPTZ,
    "loan_deduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_to_seller" DECIMAL(12,2),
    "pg_reference_id" VARCHAR(100),
    "pg_provider" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "escrow_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iot_devices" (
    "id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "chamber_id" UUID,
    "device_id" VARCHAR(100) NOT NULL,
    "device_type" VARCHAR(50) NOT NULL,
    "mqtt_topic" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_heartbeat" TIMESTAMPTZ,
    "firmware_version" VARCHAR(20),
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "iot_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_registration_number_key" ON "users"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_aadhaar_number_key" ON "users"("aadhaar_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_pan_number_key" ON "users"("pan_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_gst_number_key" ON "users"("gst_number");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_facility_id_idx" ON "users"("facility_id");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refresh_token_key" ON "user_sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_registration_number_key" ON "facilities"("registration_number");

-- CreateIndex
CREATE INDEX "facilities_status_idx" ON "facilities"("status");

-- CreateIndex
CREATE INDEX "facilities_state_idx" ON "facilities"("state");

-- CreateIndex
CREATE INDEX "facilities_owner_id_idx" ON "facilities"("owner_id");

-- CreateIndex
CREATE INDEX "facilities_latitude_longitude_idx" ON "facilities"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "chambers_facility_id_idx" ON "chambers"("facility_id");

-- CreateIndex
CREATE INDEX "chambers_status_idx" ON "chambers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "chambers_facility_id_chamber_number_key" ON "chambers"("facility_id", "chamber_number");

-- CreateIndex
CREATE INDEX "facility_documents_facility_id_idx" ON "facility_documents"("facility_id");

-- CreateIndex
CREATE INDEX "facility_documents_status_idx" ON "facility_documents"("status");

-- CreateIndex
CREATE INDEX "facility_documents_expiry_date_idx" ON "facility_documents"("expiry_date");

-- CreateIndex
CREATE INDEX "facility_pricing_facility_id_idx" ON "facility_pricing"("facility_id");

-- CreateIndex
CREATE INDEX "facility_pricing_commodity_category_idx" ON "facility_pricing"("commodity_category");

-- CreateIndex
CREATE INDEX "facility_pricing_status_idx" ON "facility_pricing"("status");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_lots_lot_number_key" ON "inventory_lots"("lot_number");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_lots_receipt_number_key" ON "inventory_lots"("receipt_number");

-- CreateIndex
CREATE INDEX "inventory_lots_facility_id_idx" ON "inventory_lots"("facility_id");

-- CreateIndex
CREATE INDEX "inventory_lots_chamber_id_idx" ON "inventory_lots"("chamber_id");

-- CreateIndex
CREATE INDEX "inventory_lots_depositor_id_idx" ON "inventory_lots"("depositor_id");

-- CreateIndex
CREATE INDEX "inventory_lots_status_idx" ON "inventory_lots"("status");

-- CreateIndex
CREATE INDEX "inventory_lots_commodity_category_idx" ON "inventory_lots"("commodity_category");

-- CreateIndex
CREATE INDEX "inventory_lots_intake_date_idx" ON "inventory_lots"("intake_date");

-- CreateIndex
CREATE INDEX "inventory_transactions_lot_id_idx" ON "inventory_transactions"("lot_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_transaction_type_idx" ON "inventory_transactions"("transaction_type");

-- CreateIndex
CREATE INDEX "inventory_transactions_performed_at_idx" ON "inventory_transactions"("performed_at");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_facility_id_idx" ON "invoices"("facility_id");

-- CreateIndex
CREATE INDEX "invoices_depositor_id_idx" ON "invoices"("depositor_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_due_date_idx" ON "invoices"("due_date");

-- CreateIndex
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items"("invoice_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "temperature_readings_chamber_id_idx" ON "temperature_readings"("chamber_id");

-- CreateIndex
CREATE INDEX "temperature_readings_recorded_at_idx" ON "temperature_readings"("recorded_at");

-- CreateIndex
CREATE INDEX "temperature_readings_chamber_id_recorded_at_idx" ON "temperature_readings"("chamber_id", "recorded_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_paid_at_idx" ON "payments"("paid_at");

-- CreateIndex
CREATE INDEX "market_listings_seller_id_idx" ON "market_listings"("seller_id");

-- CreateIndex
CREATE INDEX "market_listings_lot_id_idx" ON "market_listings"("lot_id");

-- CreateIndex
CREATE INDEX "market_listings_status_idx" ON "market_listings"("status");

-- CreateIndex
CREATE INDEX "market_listings_asking_price_per_kg_idx" ON "market_listings"("asking_price_per_kg");

-- CreateIndex
CREATE INDEX "orders_listing_id_idx" ON "orders"("listing_id");

-- CreateIndex
CREATE INDEX "orders_buyer_id_idx" ON "orders"("buyer_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "facility_reviews_facility_id_idx" ON "facility_reviews"("facility_id");

-- CreateIndex
CREATE INDEX "facility_reviews_rating_idx" ON "facility_reviews"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "facility_reviews_facility_id_user_id_key" ON "facility_reviews"("facility_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_receipts_lot_id_key" ON "warehouse_receipts"("lot_id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_receipts_receipt_number_key" ON "warehouse_receipts"("receipt_number");

-- CreateIndex
CREATE INDEX "warehouse_receipts_status_idx" ON "warehouse_receipts"("status");

-- CreateIndex
CREATE INDEX "warehouse_receipts_is_pledged_idx" ON "warehouse_receipts"("is_pledged");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_transactions_order_id_key" ON "escrow_transactions"("order_id");

-- CreateIndex
CREATE INDEX "escrow_transactions_status_idx" ON "escrow_transactions"("status");

-- CreateIndex
CREATE INDEX "escrow_transactions_order_id_idx" ON "escrow_transactions"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "iot_devices_device_id_key" ON "iot_devices"("device_id");

-- CreateIndex
CREATE INDEX "iot_devices_facility_id_idx" ON "iot_devices"("facility_id");

-- CreateIndex
CREATE INDEX "iot_devices_chamber_id_idx" ON "iot_devices"("chamber_id");

-- CreateIndex
CREATE INDEX "iot_devices_is_active_idx" ON "iot_devices"("is_active");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chambers" ADD CONSTRAINT "chambers_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_documents" ADD CONSTRAINT "facility_documents_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_documents" ADD CONSTRAINT "facility_documents_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_documents" ADD CONSTRAINT "facility_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_pricing" ADD CONSTRAINT "facility_pricing_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_pricing" ADD CONSTRAINT "facility_pricing_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_chamber_id_fkey" FOREIGN KEY ("chamber_id") REFERENCES "chambers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_depositor_id_fkey" FOREIGN KEY ("depositor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_authorized_by_fkey" FOREIGN KEY ("authorized_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_depositor_id_fkey" FOREIGN KEY ("depositor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temperature_readings" ADD CONSTRAINT "temperature_readings_chamber_id_fkey" FOREIGN KEY ("chamber_id") REFERENCES "chambers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "market_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_reviews" ADD CONSTRAINT "facility_reviews_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_reviews" ADD CONSTRAINT "facility_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_receipts" ADD CONSTRAINT "warehouse_receipts_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_transactions" ADD CONSTRAINT "escrow_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iot_devices" ADD CONSTRAINT "iot_devices_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iot_devices" ADD CONSTRAINT "iot_devices_chamber_id_fkey" FOREIGN KEY ("chamber_id") REFERENCES "chambers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
