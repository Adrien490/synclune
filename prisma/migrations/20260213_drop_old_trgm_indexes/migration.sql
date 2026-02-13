-- Drop old trigram indexes now that unaccent indexes are in place
DROP INDEX IF EXISTS "Product_title_trgm_idx";
DROP INDEX IF EXISTS "Product_description_trgm_idx";
