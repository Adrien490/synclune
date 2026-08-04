-- Lot 6 (docs/SIMPLIFICATION.md, arbitré 2026-08-03) — résidus du Lot 2
-- (remboursements Stripe-first) + dette d'enums vérifiée en base.
-- Préalable exécuté : comptages à 0 partout (arbitrage Adrien 2026-08-03,
-- « pas de données réelles en prod »).

-- Refund.createdBy : la relation User n'avait aucun lecteur — la colonne reste
-- (audit, pattern OrderHistory.authorId), seule la FK tombe.
ALTER TABLE "Refund" DROP CONSTRAINT IF EXISTS "Refund_createdBy_fkey";

-- Refund.deletedAt : son seul writer (action admin cancel-refund) est parti au
-- Lot 2 ; 0 ligne soft-deleted. L'annulation est portée par status = CANCELLED.
ALTER TABLE "Refund" DROP COLUMN IF EXISTS "deletedAt";

-- RefundItem.restock : aucun créateur ne posait true depuis le Lot 2 — le bloc
-- restock de finalize-refund était inatteignable. Restock post-refund = manuel.
ALTER TABLE "RefundItem" DROP COLUMN IF EXISTS "restock";

-- RefundStatus sans REJECTED (workflow d'approbation in-app parti au Lot 2).
-- Pas d'UPDATE défensif : 0 ligne vérifiée — si une ligne apparaissait, le cast
-- DOIT échouer plutôt que réécrire un remboursement (Art. L123-22).
CREATE TYPE "RefundStatus_new" AS ENUM ('PENDING', 'APPROVED', 'COMPLETED', 'FAILED', 'CANCELLED');
ALTER TABLE "Refund" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Refund" ALTER COLUMN "status" TYPE "RefundStatus_new" USING ("status"::text::"RefundStatus_new");
ALTER TYPE "RefundStatus" RENAME TO "RefundStatus_old";
ALTER TYPE "RefundStatus_new" RENAME TO "RefundStatus";
DROP TYPE "RefundStatus_old";
ALTER TABLE "Refund" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- RefundReason sans WRONG_ITEM ni LOST_IN_TRANSIT (inatteignables depuis Stripe,
-- le formulaire admin de création est parti au Lot 2).
CREATE TYPE "RefundReason_new" AS ENUM ('CUSTOMER_REQUEST', 'DEFECTIVE', 'FRAUD', 'OTHER');
ALTER TABLE "Refund" ALTER COLUMN "reason" TYPE "RefundReason_new" USING ("reason"::text::"RefundReason_new");
ALTER TYPE "RefundReason" RENAME TO "RefundReason_old";
ALTER TYPE "RefundReason_new" RENAME TO "RefundReason";
DROP TYPE "RefundReason_old";

-- PaymentStatus sans EXPIRED (vestige du flux Checkout Session, plus aucun writer).
-- ⚠️ 3 colonnes portent ce type : Order.paymentStatus + les deux colonnes
-- d'OrderHistory (table immuable — pas d'UPDATE défensif, le cast doit échouer
-- si une ligne EXPIRED existe).
CREATE TYPE "PaymentStatus_new" AS ENUM ('PENDING', 'PAID', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED');
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" TYPE "PaymentStatus_new" USING ("paymentStatus"::text::"PaymentStatus_new");
ALTER TABLE "OrderHistory" ALTER COLUMN "previousPaymentStatus" TYPE "PaymentStatus_new" USING ("previousPaymentStatus"::text::"PaymentStatus_new");
ALTER TABLE "OrderHistory" ALTER COLUMN "newPaymentStatus" TYPE "PaymentStatus_new" USING ("newPaymentStatus"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "PaymentStatus_old";
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" SET DEFAULT 'PENDING';

-- StockMovementSource sans SYSTEM : le restock automatique de remboursement est
-- parti avec RefundItem.restock ; 0 ligne (ledger append-only — une seule ligne
-- SYSTEM aurait figé la valeur à vie).
CREATE TYPE "StockMovementSource_new" AS ENUM ('MANUAL_ADJUST', 'SKU_UPDATE', 'ORDER', 'WEBHOOK');
ALTER TABLE "StockMovement" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "StockMovement" ALTER COLUMN "source" TYPE "StockMovementSource_new" USING ("source"::text::"StockMovementSource_new");
ALTER TYPE "StockMovementSource" RENAME TO "StockMovementSource_old";
ALTER TYPE "StockMovementSource_new" RENAME TO "StockMovementSource";
DROP TYPE "StockMovementSource_old";
ALTER TABLE "StockMovement" ALTER COLUMN "source" SET DEFAULT 'MANUAL_ADJUST';
