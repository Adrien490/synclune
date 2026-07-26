-- Retrait de 2 index sans consommateur sur `StockMovement`
-- (right-sizing — audit schéma 2026-07-26, finding F4).
--
-- `StockMovement` est une table append-only WRITE-ONLY : deux écrivains
-- (adjust-sku-stock, update-sku), AUCUN lecteur applicatif — pas de requête `data/`,
-- pas d'UI. Trois index avaient été créés par 20260529030000_add_stock_movement en
-- anticipation d'écrans qui n'existent pas.
--
-- On conserve `StockMovement_skuId_createdAt_idx` : il sert le seul accès réaliste
-- (« historique des ajustements d'un SKU », en consultation manuelle SQL/Studio).
-- Les deux autres n'ont aucun consommateur possible en l'absence de surface de
-- lecture, et chaque index est un coût d'écriture sur le chemin d'ajustement de stock.
--
-- Si un écran « historique stock » est livré plus tard, recréer l'index qui sert
-- sa requête — pas les deux par anticipation.

DROP INDEX IF EXISTS "StockMovement_productId_createdAt_idx";
DROP INDEX IF EXISTS "StockMovement_createdById_idx";
