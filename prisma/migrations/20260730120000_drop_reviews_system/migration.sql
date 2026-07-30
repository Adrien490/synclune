-- Retrait complet du système d'avis produits (décision propriétaire 2026-07-30).
--
-- Contexte : les 4 tables du module avis avaient été CONSERVÉES délibérément lors
-- de l'audit schéma du 2026-07-26 (« la feature est écrite, testée et
-- fonctionnelle — la démonter coûte plus que la garder »). Cette décision est
-- ARBITRÉE EN SENS INVERSE : la surface client de dépôt d'avis n'a jamais été
-- montée, le levier de conversion attendu ne s'est donc jamais matérialisé, et
-- garder 4 tables + 1 enum + 2 CHECK + 7 index pour du code retiré est du poids
-- mort. Le commentaire de périmètre de `schema.prisma` a été retiré avec elles.
--
-- ⚠️ DESTRUCTIF ET IRRÉVERSIBLE POUR LES DONNÉES. `down.sql` recrée la STRUCTURE
-- (tables, enum, index, FK, CHECK) mais PAS le contenu : restaurer des avis exige
-- un Neon PITR antérieur à l'application de cette migration.
--
-- Aucune obligation légale de conservation ne s'y oppose : un avis produit n'est
-- ni une pièce comptable (Art. L102 B LPF) ni un élément d'audit trail
-- (Art. L123-22 C. com.). Les seules données à caractère personnel qu'il portait
-- (auteur, contenu libre, photos) relevaient d'une base « intérêt légitime » que
-- la suppression du traitement éteint — la purge est donc conforme à la
-- limitation de conservation (Art. 5.1.e RGPD), pas en tension avec elle.
--
-- Les fichiers UploadThing des `ReviewMedia` ne sont PAS supprimés par cette
-- migration (le SQL n'atteint pas le CDN). Ils deviennent orphelins et seront
-- balayés par le cron `cleanup-orphan-media` — dont le scan `ReviewMedia` a été
-- retiré au même commit, ce qui est précisément ce qui les rend éligibles.

-- Ordre imposé par les FK : les enfants de ProductReview d'abord.
DROP TABLE IF EXISTS "ReviewMedia";
DROP TABLE IF EXISTS "ReviewResponse";
DROP TABLE IF EXISTS "ProductReviewStats";
DROP TABLE IF EXISTS "ProductReview";

-- L'enum n'a plus aucune colonne porteuse une fois ProductReview droppée.
DROP TYPE IF EXISTS "ReviewStatus";
