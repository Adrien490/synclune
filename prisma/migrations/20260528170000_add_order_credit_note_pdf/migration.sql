-- AlterTable: add credit-note PDF archival columns on Order
-- Art. L102 B LPF — l'avoir doit être archivé bit-à-bit comme la facture
-- (10 ans). Symétrique à `invoicePdfUrl/invoicePdfHash`. Nullable + sans
-- DEFAULT → opération metadata-only Postgres, sans réécriture de table.
ALTER TABLE "Order"
  ADD COLUMN "creditNotePdfUrl"  VARCHAR(2048),
  ADD COLUMN "creditNotePdfHash" VARCHAR(64);
