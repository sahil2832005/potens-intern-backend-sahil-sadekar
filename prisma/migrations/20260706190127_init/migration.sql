-- CreateTable
CREATE TABLE "log_entries" (
    "id" BIGSERIAL NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "prev_hash" TEXT NOT NULL,
    "entry_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "log_entries_entry_hash_key" ON "log_entries"("entry_hash");

-- CreateIndex
CREATE INDEX "log_entries_actor_idx" ON "log_entries"("actor");

-- CreateIndex
CREATE INDEX "log_entries_created_at_idx" ON "log_entries"("created_at");
