CREATE TABLE "course_bundle_items" (
	"bundle_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	CONSTRAINT "course_bundle_items_bundle_id_course_id_pk" PRIMARY KEY("bundle_id","course_id"),
	CONSTRAINT "course_bundle_items_not_itself" CHECK ("course_bundle_items"."bundle_id" <> "course_bundle_items"."course_id")
);
--> statement-breakpoint
ALTER TABLE "shopier_purchases" ADD COLUMN "bundle_id" uuid;--> statement-breakpoint
ALTER TABLE "course_bundle_items" ADD CONSTRAINT "course_bundle_items_bundle_id_courses_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_bundle_items" ADD CONSTRAINT "course_bundle_items_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_bundle_items_course_idx" ON "course_bundle_items" USING btree ("course_id");--> statement-breakpoint
ALTER TABLE "shopier_purchases" ADD CONSTRAINT "shopier_purchases_bundle_id_courses_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;