-- CreateEnum
CREATE TYPE "UserDocType" AS ENUM ('AADHAAR_FRONT', 'AADHAAR_BACK', 'PAN_CARD', 'GST_CERTIFICATE', 'BUSINESS_LICENSE', 'PHOTO_ID', 'OTHER');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "aadhaar_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kyc_rejection_reason" TEXT,
ADD COLUMN     "kyc_submitted_at" TIMESTAMPTZ,
ADD COLUMN     "kyc_verified_by" UUID;

-- CreateTable
CREATE TABLE "user_documents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "document_type" "UserDocType" NOT NULL,
    "document_number" VARCHAR(50),
    "file_url" VARCHAR(512) NOT NULL,
    "thumbnail_url" VARCHAR(512),
    "file_size_bytes" INTEGER,
    "mime_type" VARCHAR(50),
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "rejection_reason" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_documents_user_id_idx" ON "user_documents"("user_id");

-- CreateIndex
CREATE INDEX "user_documents_status_idx" ON "user_documents"("status");

-- CreateIndex
CREATE INDEX "user_documents_document_type_idx" ON "user_documents"("document_type");

-- AddForeignKey
ALTER TABLE "user_documents" ADD CONSTRAINT "user_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_documents" ADD CONSTRAINT "user_documents_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
