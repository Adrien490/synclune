-- Audit schéma V1 (2026-08-05), Lot C — arbitrages produit.
--
-- Contrairement aux lots A et B, ce lot ne retire pas que du mort : il ACTE des
-- choix. Chacun est motivé ci-dessous, avec sa condition de réouverture.

-- ---------------------------------------------------------------------------
-- 1. Table `RefundItem` — des données FABRIQUÉES qui rendaient l'avoir faux
--
-- L'itemisation d'un remboursement n'a jamais été une information : depuis le
-- passage Stripe-first (Lot 2), on rembourse un MONTANT, jamais des articles.
-- `allocateDashboardRefundItems` répartissait donc ce montant au pro-rata en
-- gardant `quantity` = quantité commandée ENTIÈRE, et `buildCreditNoteLine`
-- imprimait le résultat : sur un remboursement partiel, la ligne d'avoir
-- affichait « 2 × 30,00 € » pour un total de « 20,00 € ». Une ligne qui ne
-- s'additionne pas, canonicalisée et figée sous SHA-256 pour dix ans.
--
-- L'avoir émet désormais UNE ligne au montant réellement remboursé, rattachée à
-- la facture d'origine. L'Art. 272-I CGI demande la référence à la facture
-- corrigée et le montant — pas le détail des articles.
-- ---------------------------------------------------------------------------
ALTER TABLE "RefundItem" DROP CONSTRAINT IF EXISTS "RefundItem_amount_positive";
ALTER TABLE "RefundItem" DROP CONSTRAINT IF EXISTS "RefundItem_quantity_positive";
DROP TABLE IF EXISTS "RefundItem";

-- ---------------------------------------------------------------------------
-- 2. `Order.userId` — vestige de l'espace client
--
-- Toujours NULL : le parcours d'achat est 100 % invité depuis le 2026-07-31.
-- La colonne traînait 109 références dans 43 fichiers, mais l'écrasante majorité
-- était de la PLOMBERIE MORTE — `userId` sélectionné puis jamais relu (les tags
-- de cache par utilisateur ont disparu avec l'espace client), un 2ᵉ paramètre de
-- `persistInvoiceNumber` que le corps n'utilisait pas, un `orderUserId` retourné
-- sans consommateur.
--
-- Les deux gardes qui la lisaient vraiment court-circuitaient déjà sur NULL :
-- `isInvoiceOwnerErased` (retirée — sans compte, aucun compte à effacer) et la
-- branche `sessionOwns` des routes facture/avoir, où la seule session possible
-- est celle de l'administratrice, déjà couverte par `isAdmin`.
--
-- Deux DÉFAUTS VISIBLES corrigés au passage, tous deux causés par la lecture de
-- la relation `user` toujours nulle au lieu des colonnes snapshot :
--   · le dashboard « Commandes récentes » affichait « Invité » et un email vide
--     pour TOUTES les lignes, alors que `customerName`/`customerEmail` sont des
--     colonnes obligatoires figées au checkout ;
--   · l'alerte admin « remboursement échoué » affichait systématiquement
--     « Email non disponible ».
--
-- ⚠️ Condition de réouverture : le retour d'un compte client. Il faudrait alors
-- réintroduire la colonne ET la garde `isInvoiceOwnerErased` avant tout chemin
-- d'anonymisation RGPD (cf. invariant 6 de CLAUDE.md).
-- `AccountStatus.ANONYMIZED` est CONSERVÉ : la garde de révocation de connexion
-- (`auth.ts`) le lit encore, et la valeur ne coûte rien.
-- ---------------------------------------------------------------------------
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_userId_fkey";
ALTER TABLE "Order" DROP COLUMN "userId";

-- ---------------------------------------------------------------------------
-- 3. `Order.currency` / `Refund.currency` — constantes déguisées en colonnes
--
-- Les deux valaient 'EUR' sur toutes les lignes, IMPOSÉ par les CHECK
-- `*_currency_eur_check`. La SSOT est `DEFAULT_CURRENCY`
-- (`shared/constants/currency.ts`), et le payload de facture écrivait déjà
-- `currency: "EUR"` en dur. La garde de devise du webhook (Stripe a-t-il encaissé
-- dans une autre devise ?) compare désormais à cette constante — strictement
-- équivalent puisque le CHECK garantissait l'égalité.
-- Réouverture : le jour où la boutique vend dans une seconde devise, ce qui
-- demanderait de toute façon bien plus qu'une colonne (BUSINESS.md § EUR only).
-- ---------------------------------------------------------------------------
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_currency_eur_check";
ALTER TABLE "Refund" DROP CONSTRAINT IF EXISTS "Refund_currency_eur_check";
ALTER TABLE "Order" DROP COLUMN "currency";
ALTER TABLE "Refund" DROP COLUMN "currency";

-- ---------------------------------------------------------------------------
-- 4. Index composites d'`Order` : 10 → 5
--
-- `Order` atteint ~2 400 lignes au bout de DIX ANS (20 commandes/mois). Postgres
-- parcourt ça en moins d'une milliseconde : aucun de ces index ne servait une
-- performance mesurable, ils coûtaient de l'écriture à chaque commande et du
-- bruit de schéma. Les 5 conservés couvrent les requêtes qui grandissent avec le
-- temps : tri de la liste admin, livre de recettes (`paidAt`), DLQ facture,
-- purge RGPD 10 ans, compteur de facturation.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS "Order_customerEmail_idx";
DROP INDEX IF EXISTS "Order_paymentStatus_createdAt_idx";
DROP INDEX IF EXISTS "Order_paymentStatus_deletedAt_paidAt_idx";
DROP INDEX IF EXISTS "Order_unpaid_pii_purge_idx";
DROP INDEX IF EXISTS "Order_overbilling_unresolved_idx";
