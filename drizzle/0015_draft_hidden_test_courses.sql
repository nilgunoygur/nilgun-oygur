-- The site's own status now decides what is on sale; hiding a product from the Shopier store no longer hides its course.
-- These [TEST] courses were published only because their hidden products kept them off the production site, so they
-- become drafts. 51076812 (Kuantum demo, ₺1) stays published: the owner wants it live for a real end-to-end purchase.
UPDATE "courses" SET "status" = 'draft' WHERE "status" = 'published' AND "shopier_product_id" IN ('51075059', '51076813', '51076814', '51076937');
