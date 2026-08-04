-- Rollback : réintroduit le snapshot de données de facture (2026-08-05).
--
-- Structurellement complet — colonnes et CHECK reviennent à l'identique.
--
-- ⚠️ LES DONNÉES NE REVIENNENT PAS, et c'est le point à comprendre avant de
-- l'exécuter : les snapshots des factures déjà émises sont perdus. Les colonnes
-- reviennent NULL, ce qui est l'état « facture pré-snapshot » que le code savait
-- déjà traiter (rendu reconstruit depuis les colonnes vivantes). Le PDF archivé,
-- lui, n'a jamais bougé : c'est toujours lui la pièce probante.
--
-- `Order_invoiceDataSnapshot_hash_coherence_check` (both-or-neither) est
-- satisfait par NULL/NULL sur toutes les lignes.
--
-- ⚠️ Recréer les colonnes NE RÉTABLIT PAS la mécanique : `verify-invoice-snapshot`,
-- `resolve-invoice-data`, `canonical-json` et `invoice-data-format` sont partis
-- du CODE au même lot, ainsi que l'écriture dans `persistInvoiceNumber`. Pour les
-- rétablir : `git revert` du commit applicatif.

ALTER TABLE "OrderItem" ADD COLUMN "skuSku" VARCHAR(100);
ALTER TABLE "OrderItem" ADD COLUMN "productDescription" TEXT;

ALTER TABLE "Order" ADD COLUMN "invoiceVoidedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "invoiceDataHash" VARCHAR(64);
ALTER TABLE "Order" ADD COLUMN "invoiceDataSnapshot" JSONB;

ALTER TABLE "Order" ADD CONSTRAINT "Order_invoiceDataHash_format_check" CHECK ("invoiceDataHash" IS NULL OR "invoiceDataHash" ~ '^[a-f0-9]{64}$');
ALTER TABLE "Order" ADD CONSTRAINT "Order_invoiceDataSnapshot_hash_coherence_check" CHECK (("invoiceDataSnapshot" IS NULL) = ("invoiceDataHash" IS NULL));
