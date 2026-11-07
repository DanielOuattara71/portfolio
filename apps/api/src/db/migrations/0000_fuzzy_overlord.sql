CREATE TYPE "public"."contact_profile" AS ENUM('recruiter', 'client', 'other');--> statement-breakpoint
CREATE TYPE "public"."contact_status" AS ENUM('new', 'read', 'answered', 'archived');--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"profile" "contact_profile" NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(254) NOT NULL,
	"company" varchar(160),
	"role" varchar(160),
	"project_types" text[] DEFAULT '{}'::text[] NOT NULL,
	"timeline" varchar(120),
	"message" text NOT NULL,
	"locale" varchar(5) NOT NULL,
	"status" "contact_status" DEFAULT 'new' NOT NULL
);
--> statement-breakpoint
CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages" USING btree ("created_at");