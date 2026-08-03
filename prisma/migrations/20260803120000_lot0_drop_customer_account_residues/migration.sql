-- Lot 0 (docs/SIMPLIFICATION.md, arbitré 2026-08-03) — résidus de l'espace client
-- (supprimé 2026-07-31) + enums morts. Aucune de ces surfaces n'a plus de lecteur
-- ni d'écrivain applicatif.

-- S1.2 — index User « admin listing » : la page n'existe pas, la table a 1 ligne.
DROP INDEX IF EXISTS "User_role_deletedAt_idx";
DROP INDEX IF EXISTS "User_deletedAt_suspendedAt_idx";

-- S1.3 — index Order « espace client : mes commandes » : surface supprimée.
DROP INDEX IF EXISTS "Order_userId_createdAt_idx";
DROP INDEX IF EXISTS "Order_userId_status_createdAt_idx";

-- S1.1 — User.stripeCustomerId : jamais peuplé en parcours 100 % invité ; le
-- customer Stripe du checkout est dédupliqué par clé d'idempotence email.
DROP INDEX IF EXISTS "User_stripeCustomerId_key";
ALTER TABLE "User" DROP COLUMN IF EXISTS "stripeCustomerId";

-- S1.4 — OrderNote.isInternal : écrite, jamais lue (lecteur parti avec l'espace client).
ALTER TABLE "OrderNote" DROP COLUMN IF EXISTS "isInternal";

-- S1.5 — DiscountUsage.userId (+ FK + 2 index) : la limite maxUsagePerUser se
-- vérifie par email de commande (jointure Order.customerEmail), plus par compte.
DROP INDEX IF EXISTS "DiscountUsage_discountId_userId_idx";
DROP INDEX IF EXISTS "DiscountUsage_userId_idx";
ALTER TABLE "DiscountUsage" DROP CONSTRAINT IF EXISTS "DiscountUsage_userId_fkey";
ALTER TABLE "DiscountUsage" DROP COLUMN IF EXISTS "userId";

-- S2.5 — AccountStatus sans PENDING_DELETION. Les lignes héritées (demandes de
-- suppression pré-retrait, comptes de seed) basculent sur INACTIVE : même effet,
-- exclues du filtre accountStatus = ACTIVE de fetchUserForAuth.
UPDATE "User" SET "accountStatus" = 'INACTIVE' WHERE "accountStatus" = 'PENDING_DELETION';
CREATE TYPE "AccountStatus_new" AS ENUM ('ACTIVE', 'INACTIVE', 'ANONYMIZED');
ALTER TABLE "User" ALTER COLUMN "accountStatus" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "accountStatus" TYPE "AccountStatus_new" USING ("accountStatus"::text::"AccountStatus_new");
ALTER TYPE "AccountStatus" RENAME TO "AccountStatus_old";
ALTER TYPE "AccountStatus_new" RENAME TO "AccountStatus";
DROP TYPE "AccountStatus_old";
ALTER TABLE "User" ALTER COLUMN "accountStatus" SET DEFAULT 'ACTIVE';

-- S2.1 — OrderAction sans les 6 PDP_* ([reserve], jamais émises par aucun writer).
-- Volontairement PAS d'UPDATE défensif sur OrderHistory : la table est immuable
-- (Art. L123-22) — si une ligne portait un PDP_*, le cast ci-dessous DOIT échouer
-- plutôt que réécrire l'historique.
CREATE TYPE "OrderAction_new" AS ENUM ('CREATED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'STATUS_REVERTED', 'TRACKING_UPDATED', 'ADDRESS_UPDATED', 'INVOICE_GENERATED', 'INVOICE_GENERATION_FAILED', 'REFUND_CREATED', 'REFUND_COMPLETED', 'REFUND_FAILED', 'DISPUTE_OPENED', 'DISPUTE_RESOLVED', 'INVOICE_VOIDED', 'INVOICE_ARCHIVED', 'PDF_ARCHIVE_FAILED', 'CREDIT_NOTE_FAILED', 'CREDIT_NOTE_GENERATED', 'CREDIT_NOTE_ARCHIVED', 'INVOICE_RECONCILED', 'INVOICE_DOWNLOADED', 'BULK_EXPORT');
ALTER TABLE "OrderHistory" ALTER COLUMN "action" TYPE "OrderAction_new" USING ("action"::text::"OrderAction_new");
ALTER TYPE "OrderAction" RENAME TO "OrderAction_old";
ALTER TYPE "OrderAction_new" RENAME TO "OrderAction";
DROP TYPE "OrderAction_old";
