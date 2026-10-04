-- Hidden Shopier products no longer keep a course off the site, so the published [TEST] courses become drafts; 51076812 (Kuantum demo, ₺1) stays live.
UPDATE "courses" SET "status" = 'draft' WHERE "status" = 'published' AND "shopier_product_id" IN ('51075059', '51076813', '51076814', '51076937');
