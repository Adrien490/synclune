-- Extension unaccent for accent-insensitive search
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Immutable wrapper required for functional indexes
-- (native unaccent() is STABLE, not IMMUTABLE)
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent('public.unaccent', $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- New GIN indexes on unaccented expressions
-- Keep old indexes temporarily for zero-downtime deployment
CREATE INDEX "Product_title_unaccent_trgm_idx"
  ON "Product" USING gin (immutable_unaccent(title) gin_trgm_ops);

CREATE INDEX "Product_description_unaccent_trgm_idx"
  ON "Product" USING gin (immutable_unaccent(COALESCE(description, '')) gin_trgm_ops);
