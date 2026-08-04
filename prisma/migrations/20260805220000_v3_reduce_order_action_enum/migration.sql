-- `OrderHistory` recentré sur les TRANSITIONS (2026-08-05).
--
-- Six valeurs d'`OrderAction` traçaient de la PLOMBERIE de facturation, pas un
-- changement d'état de la commande :
--
--   INVOICE_GENERATION_FAILED · INVOICE_ARCHIVED · CREDIT_NOTE_ARCHIVED
--   PDF_ARCHIVE_FAILED · CREDIT_NOTE_FAILED · INVOICE_RECONCILED
--
-- Deux raisons de les retirer, et aucune ne concerne la conformité :
--
-- 1. Leur état est DÉRIVABLE des colonnes. « Le PDF est-il archivé ? » se lit dans
--    `invoicePdfUrl` / `creditNotePdfUrl` ; « la facture est-elle en anomalie ? »
--    dans `invoiceRetryDeferred`. Une ligne d'audit qui redit une colonne n'ajoute
--    pas de trace, elle en ajoute la copie.
--
-- 2. L'ALERTE RÉELLE EST AILLEURS, et elle reste : `sendAdminInvoiceFailedAlert`
--    (e-mail à J+0), la capture Sentry, et l'écran Facturation qui liste les
--    anomalies. Aucun de ces trois signaux ne passait par `OrderHistory` — la ligne
--    d'audit était consultée par personne, sur une table immuable conservée 10 ans.
--
-- ⚠️ CE QUI N'EST PAS TOUCHÉ, et pourquoi :
--   - `INVOICE_GENERATED`, `INVOICE_VOIDED`, `CREDIT_NOTE_GENERATED` RESTENT : ce
--     sont des ÉMISSIONS de pièces comptables (Art. 286 / 272-I), pas de la
--     plomberie. Elles s'affichent dans la timeline.
--   - `DISPUTE_OPENED` / `DISPUTE_RESOLVED` RESTENT, et ne sont pas décoratives :
--     `has-open-dispute.service.ts` en fait un `orderHistory.count`, et c'est ce
--     compte qui bloque `cancel-order` pendant un litige. Les retirer casserait
--     une garde métier.
--   - `INVOICE_DOWNLOADED` / `BULK_EXPORT` RESTENT (journal d'accès RGPD
--     Art. 30/32) — cf. la note d'`ACCESS_LOG_ACTIONS`.
--
-- Postgres ne sait pas retirer une valeur d'un enum : le type est recréé. Sûr ici,
-- aucune ligne d'`OrderHistory` ne porte ces valeurs (base sans données réelles) —
-- ⚠️ sur une base peuplée, `SELECT count(*) FROM "OrderHistory" WHERE action IN (…)`
-- DOIT valoir 0 avant d'exécuter, sinon le cast échoue (et une ligne d'audit ne se
-- réécrit pas : Art. L123-22).

ALTER TYPE "OrderAction" RENAME TO "OrderAction_old";

CREATE TYPE "OrderAction" AS ENUM (
  'CREATED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED',
  'STATUS_REVERTED', 'TRACKING_UPDATED', 'ADDRESS_UPDATED',
  'INVOICE_GENERATED', 'REFUND_CREATED', 'REFUND_COMPLETED', 'REFUND_FAILED',
  'DISPUTE_OPENED', 'DISPUTE_RESOLVED', 'INVOICE_VOIDED', 'CREDIT_NOTE_GENERATED',
  'INVOICE_DOWNLOADED', 'BULK_EXPORT'
);

ALTER TABLE "OrderHistory" ALTER COLUMN "action" TYPE "OrderAction" USING ("action"::text::"OrderAction");

DROP TYPE "OrderAction_old";
