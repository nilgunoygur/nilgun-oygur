ALTER TYPE "public"."lesson_kind" ADD VALUE 'audio';--> statement-breakpoint
CREATE TABLE "lesson_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"pathname" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"duration_seconds" integer,
	"peaks" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_files_pathname_unique" UNIQUE("pathname"),
	CONSTRAINT "lesson_files_kind_valid" CHECK ("lesson_files"."kind" IN ('audio', 'document')),
	CONSTRAINT "lesson_files_size_valid" CHECK ("lesson_files"."size_bytes" > 0),
	CONSTRAINT "lesson_files_audio_duration" CHECK ("lesson_files"."kind" <> 'audio' OR ("lesson_files"."duration_seconds" IS NOT NULL AND "lesson_files"."duration_seconds" > 0))
);
--> statement-breakpoint
ALTER TABLE "lesson_files" ADD CONSTRAINT "lesson_files_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_files_one_audio" ON "lesson_files" USING btree ("lesson_id") WHERE "lesson_files"."kind" = 'audio';--> statement-breakpoint
CREATE INDEX "lesson_files_lesson_idx" ON "lesson_files" USING btree ("lesson_id","created_at");