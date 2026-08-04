-- Audit schéma V1 (2026-08-05), Lot B — horodatages et clés sans lecteur.
--
-- Gain COGNITIF, pas de performance : sur ~240 commandes/an ces colonnes ne
-- coûtent rien à l'exécution. Ce qu'elles coûtaient, c'est de la lecture de
-- schéma — un `updatedAt` laisse croire qu'on sait quand une ligne a bougé, et
-- quelqu'un finit par s'en servir en croyant que c'est déjà le cas.
--
-- ⚠️ Chaque colonne ci-dessous a été confirmée sans lecteur, colonne par colonne.
-- Trois candidates ont ÉTÉ SAUVÉES par cette passe et ne figurent donc pas ici :
--   · `Order.updatedAt` — l'`orderBy` du DLQ `reconcile-voided-invoices` s'en
--     sert pour traiter d'abord la commande la moins récemment touchée.
--   · `User.createdAt` / `User.updatedAt` — contrat Better Auth : son adapter
--     les ÉCRIT à la création et les RELIT pour bâtir le payload de session
--     (`new Date(s.user.createdAt)`), donc hors de portée de cet audit.
--   · `Refund.updatedAt` — horloge de fraîcheur de la fenêtre de grâce SAGA de
--     30 s dans `handleRefundUpdated` (ORD-REFUND-AUDIT-004).
--
-- ⚠️⚠️ Ce dernier cas corrige la MÉTHODE de la passe, pas seulement sa liste. Le
-- protocole annoncé était « retirer du schéma, régénérer le client, laisser `tsc`
-- rendre la liste exhaustive des consommateurs ». Il est FAUX : une clé
-- inexistante dans un `select` IMBRIQUÉ échappe au `SelectSubset` de Prisma
-- (`data`/`select` sont typés depuis l'argument lui-même), le payload dégénère, et
-- l'accès de propriété en aval passe avec lui. `REFUND_RECORD_SELECT` demandait
-- `updatedAt: true` et `refund-handlers.ts` lisait `refund.updatedAt.getTime()` :
-- `tsc --noEmit` sortait en 0 sur les deux. En production c'était une
-- `PrismaClientValidationError` sur tout le flux d'ingestion des remboursements.
-- Le filet qui couvre ce trou est
-- `test/contract/transactional-writes-schema-validity.contract.test.ts`.
--
-- `SkuMedia.createdAt` avait bien un lecteur — un `orderBy` dans le select du
-- panier — mais ce select était FAUTIF : `where: { isPrimary: true }` seul (banni
-- par CLAUDE.md : 0 image rendue sur un SKU sans média primaire) et aucun filtre
-- `mediaType` (une vidéo primaire atterrissait dans un `<Image src>`). Il est
-- passé à l'ordre canonique `isPrimary desc, position asc, id asc` + filtre IMAGE,
-- ce qui supprime le lecteur au passage.

-- ---------------------------------------------------------------------------
-- Tables de jointure et feuilles : createdAt ET updatedAt sans lecteur
-- ---------------------------------------------------------------------------
ALTER TABLE "ProductCollection" DROP COLUMN "createdAt", DROP COLUMN "updatedAt";
ALTER TABLE "ProductSkuColor" DROP COLUMN "createdAt", DROP COLUMN "updatedAt";
ALTER TABLE "ProductSkuMaterial" DROP COLUMN "createdAt", DROP COLUMN "updatedAt";
ALTER TABLE "SkuMedia" DROP COLUMN "createdAt", DROP COLUMN "updatedAt";
ALTER TABLE "DiscountUsage" DROP COLUMN "createdAt", DROP COLUMN "updatedAt";

-- ---------------------------------------------------------------------------
-- Racines d'agrégat : seul `updatedAt` est sans lecteur (`createdAt` sert les tris).
-- `Refund` est absente de cette liste — cf. l'encadré en tête.
-- ---------------------------------------------------------------------------
ALTER TABLE "OrderNote" DROP COLUMN "updatedAt";
ALTER TABLE "OrderItem" DROP COLUMN "updatedAt";

-- Singleton de configuration : jamais sélectionné.
ALTER TABLE "StoreSettings" DROP COLUMN "createdAt";

-- ---------------------------------------------------------------------------
-- PK composite sur les 2 tables de jointure
--
-- La clé surrogate `id` (cuid2) n'était sélectionnée nulle part : aucun des
-- 12 blocs `colors: { select: … }` / `materials: { select: … }` ne la demandait,
-- et le couple portait déjà l'identité via `@@unique`. La PK composite remplace
-- donc l'unique — un index de moins par table, et une colonne de moins.
-- ---------------------------------------------------------------------------
ALTER TABLE "ProductSkuColor" DROP CONSTRAINT "ProductSkuColor_pkey";
DROP INDEX IF EXISTS "ProductSkuColor_skuId_colorId_key";
ALTER TABLE "ProductSkuColor" DROP COLUMN "id";
ALTER TABLE "ProductSkuColor" ADD CONSTRAINT "ProductSkuColor_pkey" PRIMARY KEY ("skuId", "colorId");

ALTER TABLE "ProductSkuMaterial" DROP CONSTRAINT "ProductSkuMaterial_pkey";
DROP INDEX IF EXISTS "ProductSkuMaterial_skuId_materialId_key";
ALTER TABLE "ProductSkuMaterial" DROP COLUMN "id";
ALTER TABLE "ProductSkuMaterial" ADD CONSTRAINT "ProductSkuMaterial_pkey" PRIMARY KEY ("skuId", "materialId");
