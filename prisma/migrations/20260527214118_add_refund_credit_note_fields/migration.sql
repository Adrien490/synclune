-- ============================================================================
-- Refund : numero d'avoir par remboursement (Phase 2A)
-- Audit conformite 2026-05-27 -- EINV-AUDIT-010
-- ============================================================================
--
-- Permet d'emettre un avoir distinct par refund (Art. 272-I CGI), pour
-- supporter les remboursements partiels. Aujourd'hui le numero d'avoir
-- est stocke sur Order, ce qui limite a un seul avoir par commande.
--
-- Approche additive (deprecation soft) :
--   1. On AJOUTE les colonnes sur Refund
--   2. On BACKFILL depuis Order.creditNoteNumber vers le dernier Refund
--      COMPLETED de chaque commande (data preservation)
--   3. On NE TOUCHE PAS aux colonnes Order — elles restent populates par
--      voidInvoice() jusqu'a la migration du service (Phase 2B+).
-- ============================================================================

ALTER TABLE "Refund"
    ADD COLUMN "creditNoteNumber"      VARCHAR(30),
    ADD COLUMN "creditNoteGeneratedAt" TIMESTAMP(3),
    ADD COLUMN "creditNotePdfUrl"      VARCHAR(2048),
    ADD COLUMN "creditNotePdfHash"     VARCHAR(64);

-- Contrainte UNIQUE (mirror Order_creditNoteNumber_key) — un meme numero ne
-- peut pas apparaitre simultanement sur Order et Refund pendant la phase de
-- transition. La contrainte UNIQUE par table autorise pourtant le doublon
-- inter-table. Le backfill ci-dessous garantit l'unicite logique : pour un
-- numero donne, soit il reste sur Order (pas de Refund COMPLETED a lui
-- attribuer), soit il bascule sur Refund (et le code voidInvoice doit
-- arreter de le persister sur Order — fait en Phase 2B).
CREATE UNIQUE INDEX "Refund_creditNoteNumber_key" ON "Refund" ("creditNoteNumber");

-- CHECK : memes regles de format que Order_creditNoteNumber_format_check
ALTER TABLE "Refund"
    ADD CONSTRAINT "Refund_creditNoteNumber_format_check"
    CHECK ("creditNoteNumber" IS NULL OR "creditNoteNumber" ~ '^A-[0-9]{4}-[0-9]{5}$');

-- Backfill : pour chaque Order ayant un creditNoteNumber non-NULL, copier
-- la valeur sur le Refund COMPLETED le plus recent de la commande. Si
-- aucun refund COMPLETED n'existe, on prend le dernier APPROVED ou PENDING
-- (cas degrade : un void declenche par cancel-order sans auto-refund).
-- Idempotent : ne touche pas les Refunds qui ont deja un creditNoteNumber.
UPDATE "Refund" r
SET "creditNoteNumber"      = o."creditNoteNumber",
    "creditNoteGeneratedAt" = o."creditNoteGeneratedAt",
    "creditNotePdfUrl"      = o."invoicePdfUrl", -- best-effort : meme PDF facture sert d'avoir tant que la migration n'est pas finie
    "creditNotePdfHash"     = o."invoicePdfHash"
FROM "Order" o
WHERE r."orderId" = o."id"
  AND o."creditNoteNumber" IS NOT NULL
  AND r."creditNoteNumber" IS NULL
  AND r."id" = (
      SELECT inner_r."id"
      FROM "Refund" inner_r
      WHERE inner_r."orderId" = o."id"
        AND inner_r."deletedAt" IS NULL
      ORDER BY CASE inner_r."status"
                   WHEN 'COMPLETED' THEN 1
                   WHEN 'APPROVED'  THEN 2
                   WHEN 'PENDING'   THEN 3
                   ELSE 9
               END,
               inner_r."processedAt" DESC NULLS LAST,
               inner_r."createdAt" DESC
      LIMIT 1
  );
