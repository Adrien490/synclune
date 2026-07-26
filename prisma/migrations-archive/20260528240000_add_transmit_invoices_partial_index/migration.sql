-- ============================================================================
-- Index partiel pour le cron transmit-invoices (DLQ émission PDP)
-- Audit Prisma facturation électronique 2026-05-28 -- EINV-PRISMA-005
-- ============================================================================
--
-- Le cron `transmit-invoices` (toutes les 30 min) sélectionne :
--   WHERE pdpStatus IS NULL AND invoiceNumber IS NOT NULL
--         AND invoicePdfUrl IS NOT NULL AND paidAt < now-5min
--   ORDER BY paidAt ASC
--
-- Les index `(pdpStatus, *)` existants mènent tous par `pdpStatus`, mais
-- `pdpStatus IS NULL` couvre TOUTES les commandes B2C (franchise TVA actuelle) →
-- l'index n'est pas sélectif et le tri `paidAt` impose un seq scan + sort dont
-- le coût croît avec la table (surtout après go-live transmission B2B 2027).
--
-- Cet index partiel ne référence que le sous-ensemble réellement "à transmettre"
-- et porte `paidAt` pour servir le tri sans sort. Coût d'écriture marginal :
-- une commande quitte l'index dès que `pdpStatus` n'est plus NULL.
-- ============================================================================

CREATE INDEX "Order_transmit_pending_idx" ON "Order" ("paidAt")
    WHERE "pdpStatus" IS NULL
      AND "invoiceNumber" IS NOT NULL
      AND "invoicePdfUrl" IS NOT NULL;
