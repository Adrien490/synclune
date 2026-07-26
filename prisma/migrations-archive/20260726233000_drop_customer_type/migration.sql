-- Retrait de `Order.customerType` + enum `CustomerType`
-- (suite du retrait e-reporting, right-sizing — audit schéma 2026-07-26, finding F2).
--
-- Le champ était le discriminant B2C/B2B/B2G du payload e-reporting DGFiP, supprimé
-- par la migration 20260726190000_drop_ereporting. Depuis :
--   - aucun parcours d'achat ne produit autre chose que B2C (order-creation.service
--     ne l'écrit même pas explicitement, il s'appuie sur le défaut) ;
--   - son unique consommateur applicatif était `buildBuyerInfo()` → `BuyerInfo.type`,
--     champ que le rendu PDF ne lit JAMAIS (render-invoice-pdf ne consomme que
--     `data.payment.paidAt` du bloc paiement, et rien du bloc acheteur `type`).
-- C'est donc une colonne sans effet observable, ni en base ni sur la facture.
--
-- ⚠️ Cette migration change la forme du payload `InvoiceData`, donc le canonical-JSON
-- dont dérive `Order.invoiceDataHash` — une empreinte censée rester audit-vérifiable
-- à vie (Art. L102 B LPF). Elle n'est SÛRE que parce que la boutique n'a jamais
-- ouvert (`ORDERS_AVAILABLE === false`, shared/constants/orders-availability.ts) :
-- aucune facture n'a jamais été émise, donc aucun snapshot ni hash existant n'est
-- invalidé. APRÈS LE LANCEMENT, CE TYPE DE MIGRATION DEVIENT INTERDIT : il faudrait
-- alors versionner le format du snapshot au lieu de le modifier.
--
-- L'arbitrage B2B/B2G éventuel sera réintroduit avec l'e-reporting, contre l'arrêté
-- définitif (obligation au 1ᵉʳ septembre 2027). Cf. docs/RUNBOOK.md.

ALTER TABLE "Order" DROP COLUMN IF EXISTS "customerType";

DROP TYPE IF EXISTS "CustomerType";
