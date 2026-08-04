-- Lot 4 de l'audit schéma V2 (2026-08-05), PREMIÈRE des deux migrations —
-- `OrderStatus` gagne `RETURNED`.
--
-- ⚠️ POURQUOI DEUX MIGRATIONS. Postgres refuse d'utiliser une valeur d'enum dans
-- la MÊME transaction que l'`ALTER TYPE ... ADD VALUE` qui l'a créée
-- (« unsafe use of new value of enum type »). Prisma enveloppant chaque
-- `migration.sql` dans une transaction, le backfill qui écrit `status = 'RETURNED'`
-- doit vivre dans un fichier séparé, appliqué après celui-ci — c'est
-- `20260805170000_v2_drop_fulfillment_status`.
--
-- Les tenter ensemble échouerait au déploiement, pas au build ni au typecheck.

-- `AFTER 'DELIVERED'` : l'ordre déclaré d'un enum Postgres gouverne ses
-- comparaisons et ses `ORDER BY`. Un retour succède à une livraison — le placer
-- en fin de liste le trierait après `CANCELLED`, ce qui n'a pas de sens.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'RETURNED' AFTER 'DELIVERED';
