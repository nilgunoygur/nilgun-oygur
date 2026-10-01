ALTER TABLE "lesson_files" DROP CONSTRAINT "lesson_files_kind_valid";--> statement-breakpoint
ALTER TABLE "lesson_files" DROP CONSTRAINT "lesson_files_audio_duration";--> statement-breakpoint
DROP INDEX "lesson_files_one_audio";--> statement-breakpoint
ALTER TABLE "video_assets" ADD COLUMN "peaks" jsonb;--> statement-breakpoint
ALTER TABLE "lesson_files" DROP COLUMN "kind";--> statement-breakpoint
ALTER TABLE "lesson_files" DROP COLUMN "duration_seconds";--> statement-breakpoint
ALTER TABLE "lesson_files" DROP COLUMN "peaks";