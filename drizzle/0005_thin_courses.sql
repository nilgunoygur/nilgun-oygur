ALTER TABLE "courses" DROP CONSTRAINT "courses_published_sellable";--> statement-breakpoint
ALTER TABLE "courses" DROP CONSTRAINT "courses_price_valid";--> statement-breakpoint
ALTER TABLE "courses" DROP CONSTRAINT "courses_compare_at_valid";--> statement-breakpoint
ALTER TABLE "courses" DROP CONSTRAINT "courses_currency_try";--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "shopier_product_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "status" SET DEFAULT 'published';--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "cover";--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "price_kurus";--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "compare_at_price_kurus";--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "currency";--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "sales_end_at";--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "related_training_slug";--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "shopier_url";