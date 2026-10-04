CREATE TABLE "shopier_refunds" (
	"id" text PRIMARY KEY NOT NULL,
	"shopier_order_id" text NOT NULL,
	"type" text NOT NULL,
	"amount_kurus" integer NOT NULL,
	"currency" text NOT NULL,
	"refunded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "shopier_refunds_type_valid" CHECK ("shopier_refunds"."type" IN ('full', 'partial')),
	CONSTRAINT "shopier_refunds_amount_valid" CHECK ("shopier_refunds"."amount_kurus" >= 0)
);
--> statement-breakpoint
ALTER TABLE "course_access" ADD COLUMN "extended_from_id" uuid;--> statement-breakpoint
ALTER TABLE "provider_events" ADD COLUMN "resource_id" text;--> statement-breakpoint
CREATE INDEX "shopier_refunds_order_idx" ON "shopier_refunds" USING btree ("shopier_order_id");--> statement-breakpoint
ALTER TABLE "course_access" ADD CONSTRAINT "course_access_extended_from_id_course_access_id_fk" FOREIGN KEY ("extended_from_id") REFERENCES "public"."course_access"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- Recover existing extension links only when the dates prove the relationship.
UPDATE course_access AS next_grant
SET extended_from_id = (
  SELECT previous.id
  FROM course_access AS previous
  JOIN shopier_purchases AS purchase ON purchase.id = next_grant.source_purchase_id
  WHERE previous.user_id = next_grant.user_id
    AND previous.course_id = next_grant.course_id
    AND previous.id <> next_grant.id
    AND previous.revocation_reason = 'extended_by_purchase'
    AND previous.starts_at = next_grant.starts_at
    AND previous.expires_at = next_grant.expires_at - purchase.access_duration_days * interval '24 hours'
    AND previous.created_at <= next_grant.created_at
  ORDER BY previous.created_at DESC, previous.id
  LIMIT 1
)
WHERE next_grant.source_purchase_id IS NOT NULL;
