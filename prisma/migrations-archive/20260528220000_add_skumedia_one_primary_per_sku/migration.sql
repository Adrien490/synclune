-- MEDIA-AUDIT-004 : garantir au niveau DB qu'un SKU n'a qu'une seule image principale.
--
-- Jusqu'ici l'unicité de `isPrimary` reposait uniquement sur la logique applicative
-- (`set-primary-sku-media.ts`). Un bug ou une race (deux setPrimary concurrents)
-- pouvait laisser deux `SkuMedia.isPrimary = true` pour un même SKU, rendant le
-- choix de l'image principale non déterministe côté affichage.
--
-- Prisma ne sait pas représenter un index partiel filtré (`WHERE`) dans le schéma :
-- migration raw, à l'image des CHECK constraints existantes du projet.

-- Étape 1 : dédoublonnage défensif des éventuelles images primaires multiples
-- (legacy / races) AVANT de poser la contrainte unique, sinon la création de
-- l'index échouerait sur les données existantes. On conserve la primaire la plus
-- "naturelle" (plus petite position, puis plus ancienne) et on désactive les autres.
WITH ranked AS (
	SELECT
		"id",
		ROW_NUMBER() OVER (
			PARTITION BY "skuId"
			ORDER BY "position" ASC, "createdAt" ASC, "id" ASC
		) AS rn
	FROM "SkuMedia"
	WHERE "isPrimary" = true
)
UPDATE "SkuMedia" AS m
SET "isPrimary" = false
FROM ranked
WHERE m."id" = ranked."id"
	AND ranked.rn > 1;

-- Étape 2 : index unique partiel — au plus une ligne isPrimary=true par skuId.
-- Les lignes isPrimary=false ne sont pas contraintes (NULL hors index).
CREATE UNIQUE INDEX "SkuMedia_one_primary_per_sku"
ON "SkuMedia" ("skuId")
WHERE "isPrimary" = true;
