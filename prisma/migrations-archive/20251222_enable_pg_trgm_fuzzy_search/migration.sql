-- Enable pg_trgm extension for fuzzy search (supported by Neon)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN trigram index on Product.title for fuzzy search
CREATE INDEX IF NOT EXISTS "Product_title_trgm_idx"
ON "Product" USING gin (title gin_trgm_ops);

-- Create GIN trigram index on Product.description for fuzzy search
CREATE INDEX IF NOT EXISTS "Product_description_trgm_idx"
ON "Product" USING gin (description gin_trgm_ops);
