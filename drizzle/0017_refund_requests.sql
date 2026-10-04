CREATE TABLE "refund_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"amount_kurus" integer,
	"shopier_refund_id" text,
	"owner_note" text,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refund_requests_status_valid" CHECK ("refund_requests"."status" IN ('pending', 'approved', 'declined')),
	CONSTRAINT "refund_requests_decision_consistent" CHECK (("refund_requests"."status" = 'pending') = ("refund_requests"."decided_at" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_purchase_id_shopier_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."shopier_purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_decided_by_academy_owners_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."academy_owners"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "refund_requests_pending_unique" ON "refund_requests" USING btree ("purchase_id") WHERE "refund_requests"."status" = 'pending';