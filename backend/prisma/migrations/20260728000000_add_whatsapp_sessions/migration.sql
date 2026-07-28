-- CreateTable
CREATE TABLE "whatsapp_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" VARCHAR(15) NOT NULL,
    "user_id" UUID,
    "current_flow" VARCHAR(50),
    "flow_step" INTEGER NOT NULL DEFAULT 0,
    "flow_data" JSONB,
    "last_message_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_sessions_phone_key" ON "whatsapp_sessions"("phone");
CREATE INDEX "whatsapp_sessions_user_id_idx" ON "whatsapp_sessions"("user_id");
CREATE INDEX "whatsapp_sessions_last_message_at_idx" ON "whatsapp_sessions"("last_message_at");
