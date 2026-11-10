CREATE TYPE "public"."content_status" AS ENUM('draft', 'in_review', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('settings', 'block', 'project', 'skill', 'domain', 'service', 'step', 'experience', 'education', 'certification');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('fr', 'en');--> statement-breakpoint
CREATE TYPE "public"."content_version_kind" AS ENUM('import', 'checkpoint', 'published', 'restored');--> statement-breakpoint
CREATE TABLE "content_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "content_type" NOT NULL,
	"key" varchar(80) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"working" jsonb NOT NULL,
	"working_revision" integer DEFAULT 1 NOT NULL,
	"working_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"working_updated_by" text,
	"published_version_id" uuid,
	"pending_fields" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "content_item_archived_unpublished" CHECK ("content_item"."status" <> 'archived' or "content_item"."published_version_id" is null)
);
--> statement-breakpoint
CREATE TABLE "content_ref" (
	"item_id" uuid NOT NULL,
	"field" varchar(80) NOT NULL,
	"ref_item_id" uuid,
	"ref_media_id" uuid,
	"published" boolean NOT NULL,
	CONSTRAINT "content_ref_one_target" CHECK (("content_ref"."ref_item_id" is null) <> ("content_ref"."ref_media_id" is null))
);
--> statement-breakpoint
CREATE TABLE "content_slug" (
	"item_id" uuid NOT NULL,
	"type" "content_type" NOT NULL,
	"locale" "locale" NOT NULL,
	"slug" varchar(80) NOT NULL,
	CONSTRAINT "content_slug_item_id_locale_pk" PRIMARY KEY("item_id","locale")
);
--> statement-breakpoint
CREATE TABLE "content_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"kind" "content_version_kind" NOT NULL,
	"data" jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redirect" (
	"type" "content_type" NOT NULL,
	"locale" "locale" NOT NULL,
	"from_slug" varchar(80) NOT NULL,
	"item_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redirect_type_locale_from_slug_pk" PRIMARY KEY("type","locale","from_slug")
);
--> statement-breakpoint
ALTER TABLE "content_ref" ADD CONSTRAINT "content_ref_item_id_content_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."content_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_ref" ADD CONSTRAINT "content_ref_ref_item_id_content_item_id_fk" FOREIGN KEY ("ref_item_id") REFERENCES "public"."content_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_slug" ADD CONSTRAINT "content_slug_item_id_content_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."content_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_version" ADD CONSTRAINT "content_version_item_id_content_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."content_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redirect" ADD CONSTRAINT "redirect_item_id_content_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."content_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_item_type_key_uq" ON "content_item" USING btree ("type","key");--> statement-breakpoint
CREATE INDEX "content_item_list_idx" ON "content_item" USING btree ("type","status","position");--> statement-breakpoint
CREATE INDEX "content_ref_item_idx" ON "content_ref" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "content_ref_ref_item_idx" ON "content_ref" USING btree ("ref_item_id");--> statement-breakpoint
CREATE INDEX "content_ref_media_idx" ON "content_ref" USING btree ("ref_media_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_slug_uq" ON "content_slug" USING btree ("type","locale","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "content_version_item_number_uq" ON "content_version" USING btree ("item_id","number");