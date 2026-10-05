ALTER TABLE "live_sessions" ALTER COLUMN "zoom_join_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD COLUMN "zoom_meeting_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
-- Existing sessions: the meeting number from a zoom.us/j/<number> link; others stay empty until the owner enters one.
UPDATE "live_sessions" SET "zoom_meeting_id" = coalesce(substring("zoom_join_url" from '/[jsw]/(\d{9,11})(?:\D|$)'), '');--> statement-breakpoint
ALTER TABLE "live_sessions" ALTER COLUMN "zoom_meeting_id" DROP DEFAULT;
