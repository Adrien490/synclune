-- ============================================================================
-- OrderAction enum extension : INVOICE_DOWNLOADED + BULK_EXPORT
-- Audit sécurité 2026-05-28 — EINV-SEC-002 + EINV-SEC-005
-- ============================================================================
--
-- Contexte :
--   Aucune traçabilité d'accès aux factures et exports comptables n'existait.
--   RGPD Art. 30 (registre des activités) + Art. 32 (traçabilité des accès)
--   exigent que l'on puisse répondre à : « qui a téléchargé / exporté quoi,
--   quand, depuis quel rôle ». Les deux nouvelles valeurs s'écrivent dans
--   `OrderHistory` (immuable, conservation 10 ans Art. L123-22).
--
-- 1. `INVOICE_DOWNLOADED` — chaque hit sur GET /api/orders/:orderNumber/invoice
--    Source : ADMIN si requireAdmin a passé, CUSTOMER sinon.
--    Metadata : { invoiceNumber?: string, isAdminContext: boolean }
--
-- 2. `BULK_EXPORT` — chaque hit sur GET /api/admin/orders/export
--    Source : ADMIN (route gated par requireAdminApiRoute).
--    Metadata : { exportType: "ORDERS_CSV", rowCount: number, periodType: string }
--    Pas attaché à une commande spécifique : orderId NULL (cf. OrderHistory.orderId String?).
-- ============================================================================

ALTER TYPE "OrderAction" ADD VALUE 'INVOICE_DOWNLOADED';
ALTER TYPE "OrderAction" ADD VALUE 'BULK_EXPORT';
