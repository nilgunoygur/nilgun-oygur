CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email"),
	CONSTRAINT "newsletter_subscribers_email_normalized" CHECK ("newsletter_subscribers"."email" = lower(trim("newsletter_subscribers"."email")) AND length("newsletter_subscribers"."email") BETWEEN 3 AND 254)
);
--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_created_idx" ON "newsletter_subscribers" USING btree ("created_at");