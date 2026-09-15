CREATE TYPE "public"."course_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('pending', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."lesson_kind" AS ENUM('video', 'live');--> statement-breakpoint
CREATE TYPE "public"."live_status" AS ENUM('scheduled', 'rescheduled', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'failed', 'needs_review', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."publication_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."video_status" AS ENUM('waiting', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_provider_identity" UNIQUE("provider_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_reason_required" CHECK (length(trim("admin_audit_log"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "course_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"course_id" uuid NOT NULL,
	"source_order_id" uuid,
	"granted_by" text,
	"grant_reason" text,
	"starts_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revocation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_access_source_once" UNIQUE("source_order_id","course_id"),
	CONSTRAINT "course_access_dates_valid" CHECK ("course_access"."expires_at" > "course_access"."starts_at"),
	CONSTRAINT "course_access_source_valid" CHECK (("course_access"."source_order_id" IS NOT NULL AND "course_access"."granted_by" IS NULL) OR ("course_access"."source_order_id" IS NULL AND "course_access"."granted_by" IS NOT NULL AND "course_access"."grant_reason" IS NOT NULL AND length(trim("course_access"."grant_reason")) > 0)),
	CONSTRAINT "course_access_revocation_reason" CHECK ("course_access"."revoked_at" IS NULL OR ("course_access"."revocation_reason" IS NOT NULL AND length(trim("course_access"."revocation_reason")) > 0))
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover" text,
	"price_kurus" integer NOT NULL,
	"currency" text DEFAULT 'TRY' NOT NULL,
	"access_duration_days" integer DEFAULT 365 NOT NULL,
	"sales_end_at" timestamp with time zone,
	"related_training_slug" text,
	"status" "course_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug"),
	CONSTRAINT "courses_price_valid" CHECK ("courses"."price_kurus" > 0),
	CONSTRAINT "courses_currency_try" CHECK ("courses"."currency" = 'TRY'),
	CONSTRAINT "courses_duration_valid" CHECK ("courses"."access_duration_days" > 0)
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"user_id" text NOT NULL,
	"lesson_id" uuid NOT NULL,
	"last_position_seconds" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id"),
	CONSTRAINT "progress_position_valid" CHECK ("lesson_progress"."last_position_seconds" >= 0)
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"kind" "lesson_kind" NOT NULL,
	"is_preview" boolean DEFAULT false NOT NULL,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"video_asset_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lessons_course_slug" UNIQUE("course_id","slug"),
	CONSTRAINT "lessons_id_kind" UNIQUE("id","kind"),
	CONSTRAINT "lessons_position_valid" CHECK ("lessons"."position" >= 0),
	CONSTRAINT "published_video_has_asset" CHECK ("lessons"."status" <> 'published' OR "lessons"."kind" <> 'video' OR "lessons"."video_asset_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "live_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"lesson_kind" "lesson_kind" DEFAULT 'live' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"zoom_join_url" text NOT NULL,
	"zoom_passcode" text NOT NULL,
	"status" "live_status" DEFAULT 'scheduled' NOT NULL,
	"calendar_sequence" integer DEFAULT 0 NOT NULL,
	"reminder_sent_at" timestamp with time zone,
	"recording_published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "live_sessions_lesson_id_unique" UNIQUE("lesson_id"),
	CONSTRAINT "live_session_kind" CHECK ("live_sessions"."lesson_kind" = 'live'),
	CONSTRAINT "live_duration_valid" CHECK ("live_sessions"."duration_minutes" > 0),
	CONSTRAINT "calendar_sequence_valid" CHECK ("live_sessions"."calendar_sequence" >= 0)
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modules_id_course" UNIQUE("id","course_id"),
	CONSTRAINT "modules_position_valid" CHECK ("modules"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"course_title" text NOT NULL,
	"price_kurus" integer NOT NULL,
	"currency" text DEFAULT 'TRY' NOT NULL,
	"access_duration_days" integer NOT NULL,
	CONSTRAINT "order_items_order_course" UNIQUE("order_id","course_id"),
	CONSTRAINT "order_items_price_valid" CHECK ("order_items"."price_kurus" > 0),
	CONSTRAINT "order_items_currency_try" CHECK ("order_items"."currency" = 'TRY'),
	CONSTRAINT "order_items_duration_valid" CHECK ("order_items"."access_duration_days" > 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"platform_order_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"shopier_payment_id" text,
	"amount_kurus" integer NOT NULL,
	"currency" text DEFAULT 'TRY' NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"legal_versions" jsonb NOT NULL,
	"consent_accepted_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_platform_order_id_unique" UNIQUE("platform_order_id"),
	CONSTRAINT "orders_shopier_payment_id_unique" UNIQUE("shopier_payment_id"),
	CONSTRAINT "orders_id_user" UNIQUE("id","user_id"),
	CONSTRAINT "orders_amount_valid" CHECK ("orders"."amount_kurus" > 0),
	CONSTRAINT "orders_currency_try" CHECK ("orders"."currency" = 'TRY'),
	CONSTRAINT "orders_paid_at_required" CHECK ("orders"."status" NOT IN ('paid', 'refunded') OR "orders"."paid_at" IS NOT NULL),
	CONSTRAINT "orders_legal_versions_required" CHECK (jsonb_typeof("orders"."legal_versions") = 'object' AND "orders"."legal_versions" ?& ARRAY['distanceSales', 'preliminaryInformation', 'immediateDigitalDelivery'] AND length(trim("orders"."legal_versions"->>'distanceSales')) > 0 AND length(trim("orders"."legal_versions"->>'preliminaryInformation')) > 0 AND length(trim("orders"."legal_versions"->>'immediateDigitalDelivery')) > 0 AND jsonb_typeof("orders"."legal_versions"->'distanceSales') = 'string' AND jsonb_typeof("orders"."legal_versions"->'preliminaryInformation') = 'string' AND jsonb_typeof("orders"."legal_versions"->'immediateDigitalDelivery') = 'string')
);
--> statement-breakpoint
CREATE TABLE "academy_owners" (
	"user_id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"event_identity" text NOT NULL,
	"verified_payload_hash" text NOT NULL,
	"status" "event_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"error_details" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_event_identity" UNIQUE("provider","event_identity"),
	CONSTRAINT "provider_attempts_valid" CHECK ("provider_events"."attempt_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	CONSTRAINT "two_factor_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mux_upload_id" text,
	"mux_asset_id" text,
	"signed_playback_id" text,
	"status" "video_status" DEFAULT 'waiting' NOT NULL,
	"duration_seconds" integer,
	"aspect_ratio" text,
	"failure_details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_assets_mux_upload_id_unique" UNIQUE("mux_upload_id"),
	CONSTRAINT "video_assets_mux_asset_id_unique" UNIQUE("mux_asset_id"),
	CONSTRAINT "video_assets_signed_playback_id_unique" UNIQUE("signed_playback_id"),
	CONSTRAINT "video_duration_valid" CHECK ("video_assets"."duration_seconds" IS NULL OR "video_assets"."duration_seconds" >= 0),
	CONSTRAINT "video_ready_identifiers" CHECK ("video_assets"."status" <> 'ready' OR ("video_assets"."mux_asset_id" IS NOT NULL AND "video_assets"."signed_playback_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_access" ADD CONSTRAINT "course_access_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_access" ADD CONSTRAINT "course_access_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_access" ADD CONSTRAINT "course_access_granted_by_academy_owners_user_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."academy_owners"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_access" ADD CONSTRAINT "course_access_source_order_id_user_id_orders_id_user_id_fk" FOREIGN KEY ("source_order_id","user_id") REFERENCES "public"."orders"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_access" ADD CONSTRAINT "course_access_source_order_id_course_id_order_items_order_id_course_id_fk" FOREIGN KEY ("source_order_id","course_id") REFERENCES "public"."order_items"("order_id","course_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_video_asset_id_video_assets_id_fk" FOREIGN KEY ("video_asset_id") REFERENCES "public"."video_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_course_id_modules_id_course_id_fk" FOREIGN KEY ("module_id","course_id") REFERENCES "public"."modules"("id","course_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_lesson_id_lesson_kind_lessons_id_kind_fk" FOREIGN KEY ("lesson_id","lesson_kind") REFERENCES "public"."lessons"("id","kind") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_owners" ADD CONSTRAINT "academy_owners_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_resource_idx" ON "admin_audit_log" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_access_unrevoked_unique" ON "course_access" USING btree ("user_id","course_id") WHERE "course_access"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "course_access_course_idx" ON "course_access" USING btree ("course_id","expires_at");--> statement-breakpoint
CREATE INDEX "lessons_module_position_idx" ON "lessons" USING btree ("module_id","position");--> statement-breakpoint
CREATE INDEX "live_sessions_schedule_idx" ON "live_sessions" USING btree ("status","starts_at");--> statement-breakpoint
CREATE INDEX "modules_course_position_idx" ON "modules" USING btree ("course_id","position");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_attention_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");