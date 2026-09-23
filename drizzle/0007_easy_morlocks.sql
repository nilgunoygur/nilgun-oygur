CREATE TABLE "article_edits" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"image" text NOT NULL,
	"date_label" text NOT NULL,
	"duration" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_edits_status_valid" CHECK ("article_edits"."status" IN ('draft', 'published'))
);
