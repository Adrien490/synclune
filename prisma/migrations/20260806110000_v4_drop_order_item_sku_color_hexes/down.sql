-- Rollback du Lot 3 (audit schéma V4) : réintroduit `OrderItem.skuColorHexes`.
--
-- Nullable et SANS backfill : les hex ne sont pas reconstituables depuis la ligne
-- de commande. Les recalculer depuis le SKU vivant serait FAUX — c'est une colonne
-- de snapshot (invariant 4), et le SKU a pu changer de couleurs ou disparaître.
-- Les commandes passées entre le drop et le rollback resteront donc à NULL, ce qui
-- est le comportement exact d'avant la colonne : la pastille ne s'affiche pas.
--
-- ⚠️ Recréer la colonne ne la fait pas re-remplir : `order-creation.service.ts`
-- n'écrit plus dedans. Pour rétablir la persistance ET le rendu, `git revert` du
-- commit applicatif.

ALTER TABLE "OrderItem" ADD COLUMN "skuColorHexes" VARCHAR(200);
