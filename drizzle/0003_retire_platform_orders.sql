ALTER TABLE "order_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "orders" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "order_items" CASCADE;--> statement-breakpoint
DROP TABLE "orders" CASCADE;--> statement-breakpoint
ALTER TABLE "course_access" DROP CONSTRAINT "course_access_source_once";--> statement-breakpoint
ALTER TABLE "course_access" DROP CONSTRAINT "course_access_source_valid";--> statement-breakpoint
ALTER TABLE "course_access" DROP CONSTRAINT IF EXISTS "course_access_source_order_id_user_id_orders_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "course_access" DROP CONSTRAINT IF EXISTS "course_access_source_order_id_course_id_order_items_order_id_course_id_fk";
--> statement-breakpoint
ALTER TABLE "course_access" DROP COLUMN "source_order_id";--> statement-breakpoint
ALTER TABLE "course_access" ADD CONSTRAINT "course_access_source_valid" CHECK (("course_access"."source_purchase_id" IS NOT NULL AND "course_access"."granted_by" IS NULL) OR ("course_access"."source_purchase_id" IS NULL AND "course_access"."granted_by" IS NOT NULL AND "course_access"."grant_reason" IS NOT NULL AND length(trim("course_access"."grant_reason")) > 0));--> statement-breakpoint
DROP TYPE "public"."order_status";