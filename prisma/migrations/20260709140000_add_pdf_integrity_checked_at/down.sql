-- Rollback : suppression du curseur de rotation du contrôle d'intégrité PDF.
-- Sans effet sur les données comptables (colonne purement opérationnelle).
ALTER TABLE "Order" DROP COLUMN IF EXISTS "pdfIntegrityCheckedAt";
ALTER TABLE "Refund" DROP COLUMN IF EXISTS "pdfIntegrityCheckedAt";
