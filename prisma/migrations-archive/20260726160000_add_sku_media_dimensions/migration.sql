-- Ajoute les dimensions intrinsèques des médias SKU (audit « Images produit et performance », IMG-06).
--
-- Les dimensions sont déjà lues à l'upload par assertImageDimensions() mais étaient
-- jetées faute de colonne. Conséquences corrigées par cette migration :
--   - buildLightboxSlides émettait `height: 0` dans chaque entrée de srcSet ;
--   - aucun aspect-ratio intrinsèque disponible côté client (`fill` obligatoire).
--
-- Nullable : les lignes existantes restent à NULL jusqu'au passage du backfill
--   pnpm backfill:media --dry-run   puis   pnpm backfill:media

ALTER TABLE "SkuMedia" ADD COLUMN IF NOT EXISTS "width" INTEGER;
ALTER TABLE "SkuMedia" ADD COLUMN IF NOT EXISTS "height" INTEGER;

-- Cohérence : des dimensions renseignées doivent être strictement positives.
-- NULL reste autorisé (média jamais backfillé).
ALTER TABLE "SkuMedia" DROP CONSTRAINT IF EXISTS "SkuMedia_dimensions_positive";
ALTER TABLE "SkuMedia" ADD CONSTRAINT "SkuMedia_dimensions_positive" CHECK (
  ("width" IS NULL OR "width" > 0) AND ("height" IS NULL OR "height" > 0)
);
