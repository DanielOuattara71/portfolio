CREATE TYPE "public"."alert_severity" AS ENUM('warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."alert_status" AS ENUM('open', 'acknowledged', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."backup_result" AS ENUM('success', 'failed', 'pending');--> statement-breakpoint
CREATE TYPE "public"."backup_trigger" AS ENUM('scheduled', 'manual');--> statement-breakpoint
CREATE TYPE "public"."check_target" AS ENUM('web', 'api', 'db', 'storage');--> statement-breakpoint
CREATE TYPE "public"."incident_status" AS ENUM('open', 'acknowledged', 'resolved');--> statement-breakpoint
CREATE TABLE "alert" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"rule" varchar(80) NOT NULL,
	"severity" "alert_severity" NOT NULL,
	"status" "alert_status" DEFAULT 'open' NOT NULL,
	"first_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_at" timestamp with time zone DEFAULT now() NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backup" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"trigger" "backup_trigger" NOT NULL,
	"triggered_by" text,
	"object_key" text,
	"bytes" integer,
	"sha256" varchar(64),
	"schema_version" varchar(20),
	"row_counts" jsonb,
	"result" "backup_result" DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp with time zone,
	"restore_tested_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "incident" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"number" varchar(20) NOT NULL,
	"title" varchar(240) NOT NULL,
	"severity" "alert_severity" NOT NULL,
	"status" "incident_status" DEFAULT 'open' NOT NULL,
	"alert_id" bigint,
	"opened_by" text,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolution" text,
	CONSTRAINT "incident_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "incident_note" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"incident_id" bigint NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"author_id" text,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_check" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"target" "check_target" NOT NULL,
	"ok" boolean NOT NULL,
	"status_code" integer,
	"ms" integer,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "incident_note" ADD CONSTRAINT "incident_note_incident_id_incident_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incident"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alert_rule_status_idx" ON "alert" USING btree ("rule","status");--> statement-breakpoint
CREATE INDEX "alert_last_idx" ON "alert" USING btree ("last_at");--> statement-breakpoint
CREATE INDEX "backup_started_idx" ON "backup" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "incident_status_idx" ON "incident" USING btree ("status","opened_at");--> statement-breakpoint
CREATE INDEX "incident_note_incident_idx" ON "incident_note" USING btree ("incident_id","at");--> statement-breakpoint
CREATE INDEX "service_check_target_at_idx" ON "service_check" USING btree ("target","at");