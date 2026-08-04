-- Lot 1 de l'audit schéma V2 (2026-08-05) — vers un e-commerce minimaliste.
--
-- Deux retraits sans rapport entre eux, groupés parce qu'ils sont tous deux sans
-- risque et sans cascade fonctionnelle.
--
-- 1. `OrderNote` — une feature CRUD complète (2 Server Actions, data fn cachée,
--    hook, panel, dialog, route `[id]/notes/`, schémas, tag de cache, 2 passes de
--    purge RGPD) pour une note libre, alors que `OrderHistory.note` existe déjà et
--    s'affiche sur le MÊME écran de détail commande. Arbitrage Adrien 2026-08-05.
--
--    ⚠️ Conséquence RGPD à connaître : `OrderHistory.note` devient la SEULE surface
--    de texte libre attachée à une commande. Sa neutralisation à l'échéance (10 ans
--    payées / 3 ans jamais payées, `ORDER_HISTORY_PII_SCRUB`) n'a donc plus de
--    doublure — c'est ce que verrouille `purge-pii-scrub-contract.regression.test.ts`.
--
-- 2. `VatRegime` — enum orpheline. Son unique porteuse, `Order.vendorVatRegime`,
--    est partie avec les 12 colonnes `vendor*` au Lot A (`20260805100000`) :
--    l'identité vendeur ne vit plus que dans `invoiceDataSnapshot`. Le type est
--    resté derrière, référencé par aucune colonne et importé par aucune ligne de
--    TypeScript — le régime de TVA est lu depuis l'env comme une chaîne brute
--    (`build-invoice-data.ts`).

-- ---------------------------------------------------------------------------
-- 1. OrderNote
-- ---------------------------------------------------------------------------
-- L'index et la FK partent avec la table (pas de DROP explicite nécessaire).
DROP TABLE "OrderNote";

-- ---------------------------------------------------------------------------
-- 2. VatRegime
-- ---------------------------------------------------------------------------
DROP TYPE "VatRegime";
