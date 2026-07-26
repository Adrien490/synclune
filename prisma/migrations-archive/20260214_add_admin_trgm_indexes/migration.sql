-- GIN trigram indexes on admin-searched columns for fuzzy search performance.
-- Uses immutable_unaccent() wrapper (created in 20260213_add_unaccent_multiword_search).
-- Without these indexes, fuzzy search on User/Order tables does sequential scans.

-- User: searched by name and email in admin user management
CREATE INDEX "User_name_unaccent_trgm_idx"
  ON "User" USING gin (immutable_unaccent(COALESCE(name, '')) gin_trgm_ops);

CREATE INDEX "User_email_unaccent_trgm_idx"
  ON "User" USING gin (immutable_unaccent(email) gin_trgm_ops);

-- Order: searched by customerName and customerEmail in admin order management
CREATE INDEX "Order_customerName_unaccent_trgm_idx"
  ON "Order" USING gin (immutable_unaccent("customerName") gin_trgm_ops);

CREATE INDEX "Order_customerEmail_unaccent_trgm_idx"
  ON "Order" USING gin (immutable_unaccent("customerEmail") gin_trgm_ops);
