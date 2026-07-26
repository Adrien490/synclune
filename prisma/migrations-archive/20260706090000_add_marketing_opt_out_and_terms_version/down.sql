-- Rollback : suppression des colonnes de consentement ajoutées par la migration.
-- ⚠️ Perte des oppositions marketing enregistrées (marketingOptOutAt) — ne rollback
-- qu'en cas d'incident immédiat post-déploiement.

ALTER TABLE "User" DROP COLUMN "marketingOptOutAt";

ALTER TABLE "User" DROP COLUMN "termsVersion";
