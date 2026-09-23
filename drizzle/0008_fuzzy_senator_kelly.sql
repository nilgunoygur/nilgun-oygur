CREATE TABLE "banner_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"draft" jsonb NOT NULL,
	"published" jsonb,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "banner_settings_singleton" CHECK ("banner_settings"."id" = 1)
);
