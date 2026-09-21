CREATE TABLE "shopier_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shopier_order_id" text NOT NULL,
	"course_id" uuid NOT NULL,
	"buyer_email" text NOT NULL,
	"amount_kurus" integer NOT NULL,
	"currency" text NOT NULL,
	"access_duration_days" integer NOT NULL,
	"purchased_at" timestamp with time zone NOT NULL,
	"user_id" text,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shopier_purchases_order_course" UNIQUE("shopier_order_id","course_id"),
	CONSTRAINT "shopier_purchases_id_user" UNIQUE("id","user_id"),
	CONSTRAINT "shopier_purchases_id_course" UNIQUE("id","course_id"),
	CONSTRAINT "shopier_purchases_email_normalized" CHECK ("shopier_purchases"."buyer_email" = lower(trim("shopier_purchases"."buyer_email")) AND length("shopier_purchases"."buyer_email") > 0),
	CONSTRAINT "shopier_purchases_amount_valid" CHECK ("shopier_purchases"."amount_kurus" >= 0),
	CONSTRAINT "shopier_purchases_duration_valid" CHECK ("shopier_purchases"."access_duration_days" > 0),
	CONSTRAINT "shopier_purchases_claim_consistent" CHECK (("shopier_purchases"."user_id" IS NULL) = ("shopier_purchases"."claimed_at" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "course_access" ADD COLUMN "source_purchase_id" uuid;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "shopier_product_id" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "shopier_url" text;--> statement-breakpoint
ALTER TABLE "shopier_purchases" ADD CONSTRAINT "shopier_purchases_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopier_purchases" ADD CONSTRAINT "shopier_purchases_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shopier_purchases_unclaimed_email_idx" ON "shopier_purchases" USING btree ("buyer_email") WHERE "shopier_purchases"."user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "course_access" ADD CONSTRAINT "course_access_purchase_user_fk" FOREIGN KEY ("source_purchase_id","user_id") REFERENCES "public"."shopier_purchases"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_access" ADD CONSTRAINT "course_access_purchase_course_fk" FOREIGN KEY ("source_purchase_id","course_id") REFERENCES "public"."shopier_purchases"("id","course_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_access" ADD CONSTRAINT "course_access_source_purchase_id_unique" UNIQUE("source_purchase_id");--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_shopier_product_id_unique" UNIQUE("shopier_product_id");--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_published_sellable" CHECK ("courses"."status" <> 'published' OR ("courses"."shopier_product_id" IS NOT NULL AND "courses"."shopier_url" IS NOT NULL));