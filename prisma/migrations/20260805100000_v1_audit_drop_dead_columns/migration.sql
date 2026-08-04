-- Audit schéma V1 (2026-08-05), Lot A — retraits mesurés writer par writer,
-- lecteur par lecteur. Rien ici n'a de lecteur en production.
--
-- 1. Table `StockMovement` — 7 écrivains, ZÉRO lecteur
--    Aucun `findMany`/`findFirst`/`count`/`aggregate`/`$queryRaw` sur cette table
--    nulle part, aucune page admin, aucun export. Les 11 colonnes étaient toutes
--    écrites pour personne, et les 4 valeurs de `StockMovementSource` posées sans
--    qu'aucune ne soit jamais relue. Le registre obligatoire d'une micro-entreprise
--    est le livre de recettes (couvert par l'export CSV filtré sur `paidAt`,
--    Art. 50-0 CGI), pas un journal d'inventaire — aucune obligation légale ne
--    tombe avec cette table. Le décrément/restock de stock lui-même est inchangé :
--    seule l'écriture du journal disparaît de ses 7 appelants.
--    Corollaire assumé : le champ « Raison » du formulaire d'ajustement de stock
--    part aussi — le journal était sa seule destination.
--
-- 2. Les 12 colonnes `Order.vendor*` — écrivain unique, lecteur DB unique
--    `persistInvoiceNumber` les écrivait, et le SEUL lecteur en base était la
--    Passe 0 de `reconcile-invoices` (`backfillInvoiceDataSnapshot`), qui
--    reconstruisait le snapshot des factures ANTÉRIEURES à son introduction.
--    Or numéro et `invoiceDataSnapshot` sont posés par le MÊME `UPDATE` : aucune
--    facture ne peut plus naître sans snapshot, donc ce backfill n'a plus rien à
--    reconstruire. Les deux autres chemins qui atteignaient `buildSellerInfo`
--    (route facture, avoir de commande) chargent en `GET_ORDER_SELECT_CUSTOMER`,
--    qui ne portait PAS ces colonnes : ils retombaient déjà sur l'env.
--    ⚠️ L'Art. L102 B LPF reste tenu — l'identité vendeur est figée, canonicalisée
--    et hashée SHA-256 dans `invoiceDataSnapshot` au moment de l'émission, et
--    c'est ce snapshot que relit tout rendu ultérieur. Condition de réouverture :
--    si `invoiceDataSnapshot` cessait d'être écrit à l'émission.
--
-- 3. Colonnes écrites et jamais relues
--    `OrderItem.skuImageUrl` recevait EXACTEMENT la même variable que
--    `productImageUrl` (un seul writer, `order-creation.service`) ; toutes les UI
--    faisaient `skuImageUrl || productImageUrl`. `WebhookEvent.errorMessage` :
--    4 écrivains, jamais sélectionné, aucune UI n'expose cette table (Sentry porte
--    le diagnostic). `DiscountUsage.amountApplied` : écrit, sélectionné deux fois,
--    typé dans les props d'`order-summary-card`… et jamais rendu — le composant
--    affiche `Order.discountAmount`.
--
-- 4. Valeurs d'enum jamais écrites
--    `InvoiceStatus.PENDING` : aucune écriture nulle part (la colonne vaut NULL
--    avant émission, elle n'a pas de `@default`). Conséquence visible corrigée au
--    passage : la tuile « En attente » de /admin/ventes/facturation affichait un
--    compteur structurellement à zéro et pointait vers un filtre toujours vide.
--    `WebhookEventStatus.PENDING` : la route webhook crée en `PROCESSING` ;
--    `retry-webhooks` ne ramasse que `FAILED` et `cleanup-pending-orders` ne purge
--    que `COMPLETED`/`SKIPPED` — une ligne PENDING serait restée orpheline.
--
-- 5. Index sans requête
--    `OrderHistory_authorId_idx` : aucune requête ne filtre sur `authorId`.
--    ⚠️ La COLONNE `authorId` est conservée — c'est l'identifiant machine de la
--    piste d'audit (Art. L123-22), dont la lecture est différée par nature, et son
--    retrait aurait touché 70 références dans 30 fichiers du chemin facture/avoir.
--    Les 2 index GIN trigram sur `User` : la recherche floue ne sert que `Product`
--    et `Order` (`shared/lib/fuzzy-search.ts` n'a qu'un appelant, `get-orders.ts`)
--    — deux index GIN sur une table d'UNE ligne.

-- ---------------------------------------------------------------------------
-- 1. StockMovement
-- ---------------------------------------------------------------------------
ALTER TABLE "StockMovement" DROP CONSTRAINT IF EXISTS "StockMovement_delta_consistent";
ALTER TABLE "StockMovement" DROP CONSTRAINT IF EXISTS "StockMovement_inventory_non_negative";
DROP TABLE IF EXISTS "StockMovement";
DROP TYPE IF EXISTS "StockMovementSource";

-- ---------------------------------------------------------------------------
-- 2. Order.vendor* + leurs CHECK de format
-- ---------------------------------------------------------------------------
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_vendorApeCode_format_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_vendorBankBic_format_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_vendorBankIban_format_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_vendorSiren_format_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_vendorSiret_format_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_vendorVatNumber_format_check";

ALTER TABLE "Order"
  DROP COLUMN "vendorLegalName",
  DROP COLUMN "vendorTradeName",
  DROP COLUMN "vendorAddress",
  DROP COLUMN "vendorSiren",
  DROP COLUMN "vendorSiret",
  DROP COLUMN "vendorVatNumber",
  DROP COLUMN "vendorEmail",
  DROP COLUMN "vendorApeCode",
  DROP COLUMN "vendorBankIban",
  DROP COLUMN "vendorBankBic",
  DROP COLUMN "vendorVatRegime",
  DROP COLUMN "vendorLegalForm";

-- ---------------------------------------------------------------------------
-- 3. Colonnes écrites et jamais relues
-- ---------------------------------------------------------------------------
ALTER TABLE "OrderItem" DROP COLUMN "skuImageUrl";
ALTER TABLE "WebhookEvent" DROP COLUMN "errorMessage";
ALTER TABLE "DiscountUsage" DROP COLUMN "amountApplied";

-- ---------------------------------------------------------------------------
-- 4. Valeurs d'enum jamais écrites
--    Postgres ne sait pas retirer une valeur d'un enum : il faut recréer le type.
--    Les colonnes portant `InvoiceStatus` : Order.invoiceStatus (nullable, sans
--    default). Celles portant `WebhookEventStatus` : WebhookEvent.status (default
--    PENDING → repositionné sur PROCESSING, le statut réellement écrit à la
--    création par la route webhook).
-- ---------------------------------------------------------------------------
CREATE TYPE "InvoiceStatus_new" AS ENUM ('GENERATED', 'VOIDED');
ALTER TABLE "Order" ALTER COLUMN "invoiceStatus" TYPE "InvoiceStatus_new" USING ("invoiceStatus"::text::"InvoiceStatus_new");
ALTER TYPE "InvoiceStatus" RENAME TO "InvoiceStatus_old";
ALTER TYPE "InvoiceStatus_new" RENAME TO "InvoiceStatus";
DROP TYPE "InvoiceStatus_old";

CREATE TYPE "WebhookEventStatus_new" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED');
ALTER TABLE "WebhookEvent" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "WebhookEvent" ALTER COLUMN "status" TYPE "WebhookEventStatus_new" USING ("status"::text::"WebhookEventStatus_new");
ALTER TYPE "WebhookEventStatus" RENAME TO "WebhookEventStatus_old";
ALTER TYPE "WebhookEventStatus_new" RENAME TO "WebhookEventStatus";
DROP TYPE "WebhookEventStatus_old";
ALTER TABLE "WebhookEvent" ALTER COLUMN "status" SET DEFAULT 'PROCESSING';

-- ---------------------------------------------------------------------------
-- 5. Index sans requête
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS "OrderHistory_authorId_idx";
DROP INDEX IF EXISTS "User_email_unaccent_trgm_idx";
DROP INDEX IF EXISTS "User_name_unaccent_trgm_idx";
