ALTER TABLE "user" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "district" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "postcode" text;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_phone_e164" CHECK ("user"."phone" IS NULL OR "user"."phone" ~ '^\+[1-9][0-9]{7,14}$');--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_postcode_valid" CHECK ("user"."postcode" IS NULL OR "user"."postcode" ~ '^[0-9]{5}$');