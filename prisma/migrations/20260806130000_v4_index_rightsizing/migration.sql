-- Audit schéma V4, Lot 5 — dégraissage d'index hors `Order`.
--
-- L'audit V1 avait ramené `Order` de 10 à 5 index et n'était allé nulle part
-- ailleurs. Le même raisonnement vaut ici, et il tient au VOLUME : `ProductType`,
-- `Color`, `Material` et `Collection` comptent des dizaines de lignes, `Product`
-- quelques centaines, `Refund` quelques centaines en dix ans à ~20 commandes/mois.
-- Postgres préfère un seq scan à un index sur une table qui tient dans quelques
-- pages. Ce que ces index coûtaient : de l'écriture à chaque mutation, et du bruit
-- de schéma.
--
-- ⚠️ Ce lot est le SEUL de la vague qu'aucun garde-fou automatique ne couvre :
-- `schema-migration-parity` fait de la parité COLONNE par colonne, et côté index il
-- ne vérifie qu'une inclusion à sens unique (SSOT ⊆ migrations). Un `@@index`
-- retiré du schéma sans `DROP INDEX` ici serait invisible de bout en bout — les
-- tests d'intégration appliquent `db push`, qui recrée depuis le schéma. La revue
-- ligne à ligne de ce fichier contre le diff de `schema.prisma` EST le filet.

-- Filtres booléens / de statut sur des tables de dizaines de lignes.
DROP INDEX IF EXISTS "ProductType_isActive_idx";
DROP INDEX IF EXISTS "Color_isActive_idx";
DROP INDEX IF EXISTS "Material_isActive_idx";
DROP INDEX IF EXISTS "Collection_status_idx";

-- Doublon partiel de `Product_status_createdAt_idx`, qui sert déjà l'égalité sur
-- `status` ET le tri de toutes les listes catalogue. `deletedAt` se filtre ensuite
-- sur un ensemble déjà réduit.
DROP INDEX IF EXISTS "Product_status_deletedAt_idx";

-- Depuis le passage en PK composite (migration 20260805110000), `(skuId, colorId)`
-- et `(skuId, materialId)` sont les clés primaires : le préfixe `skuId` est déjà
-- indexé. `position` ne trie que 2 à 3 lignes par SKU (`ARRAY_LIMITS`).
DROP INDEX IF EXISTS "ProductSkuColor_skuId_position_idx";
DROP INDEX IF EXISTS "ProductSkuMaterial_skuId_position_idx";

-- Doublement redondant : l'index UNIQUE PARTIEL `SkuMedia_one_primary_per_sku`
-- — (skuId) WHERE isPrimary = true, SSOT `raw-guards.sql` — sert déjà « le média
-- principal de ce SKU », et en mieux. L'ordre canonique du dépôt
-- (`isPrimary desc, position asc, id asc`) n'était servi par aucun des deux.
DROP INDEX IF EXISTS "SkuMedia_skuId_isPrimary_idx";

-- La liste admin des remboursements trie sur `[{createdAt}, {id: "asc"}]`
-- (pagination par curseur) — que cet index ne couvrait pas. `[orderId]` et
-- `[status, processedAt]` restent : eux servent des `where` (garde SAGA de 30 s,
-- DLQ de `reconcile-refunds`).
DROP INDEX IF EXISTS "Refund_createdAt_idx";
