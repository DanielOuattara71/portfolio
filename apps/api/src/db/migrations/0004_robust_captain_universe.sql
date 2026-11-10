CREATE TYPE "public"."media_folder" AS ENUM('projets', 'profil', 'cv', 'logos', 'divers');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('image', 'pdf');--> statement-breakpoint
CREATE TYPE "public"."media_status" AS ENUM('uploading', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "media_status" DEFAULT 'uploading' NOT NULL,
	"kind" "media_kind" NOT NULL,
	"folder" "media_folder" DEFAULT 'divers' NOT NULL,
	"name" varchar(160) NOT NULL,
	"mime" varchar(80) NOT NULL,
	"bytes" integer,
	"width" integer,
	"height" integer,
	"sha256" varchar(64),
	"upload_key" text NOT NULL,
	"original_key" text,
	"variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"alt" jsonb DEFAULT '{"fr":null,"en":null}'::jsonb NOT NULL,
	"caption" jsonb DEFAULT '{"fr":null,"en":null}'::jsonb NOT NULL,
	"credit" varchar(160),
	"is_public" boolean DEFAULT false NOT NULL,
	"replaced_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" varchar(200),
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "media_list_idx" ON "media" USING btree ("status","folder","created_at");--> statement-breakpoint
CREATE INDEX "media_uploader_idx" ON "media" USING btree ("uploaded_by","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "media_sha256_uq" ON "media" USING btree ("sha256") WHERE "media"."status" = 'ready' and "media"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE "content_ref" ADD CONSTRAINT "content_ref_ref_media_id_media_id_fk" FOREIGN KEY ("ref_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;