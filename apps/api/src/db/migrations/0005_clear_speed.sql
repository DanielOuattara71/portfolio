ALTER TABLE "contact_messages" ADD COLUMN "read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "answered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "contact_messages_status_idx" ON "contact_messages" USING btree ("status");