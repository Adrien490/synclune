-- Unicité de `User.email` INSENSIBLE À LA CASSE + normalisation garantie en base.
--
-- Contexte (audit schéma 2026-07-30) : `email @unique` est un index Postgres sensible
-- à la casse. `Alice@x.com` et `alice@x.com` y passaient comme deux comptes distincts.
-- Le coût réel n'était pas le doublon mais le garde de compte révoqué de
-- `/sign-in/email` (modules/auth/lib/auth.ts) : il minuscule l'email soumis puis
-- interroge la colonne en comparaison EXACTE, donc une ligne stockée en casse mixte
-- le faisait échouer EN SILENCE — un compte suspendu / anonymisé / supprimé pouvait
-- se reconnecter.
--
-- Trois chemins écrivent cette colonne (inscription email/mot de passe, profil Google
-- via accountLinking, changeEmail) et seul le premier passait par le `.toLowerCase()`
-- de `emailSchema`. La normalisation est désormais posée au point de passage unique de
-- l'adaptateur — `databaseHooks.user.{create,update}.before` — et CE fichier en fait
-- un invariant de base, pas une discipline d'appelant.
--
-- ⚠️ PRÉ-CONTRÔLE sur une base contenant déjà des comptes. L'index unique échouera à
-- se créer s'il existe des collisions par casse ; les lister d'abord :
--
--   SELECT lower(email) AS normalized, count(*), array_agg(id)
--   FROM "User" GROUP BY 1 HAVING count(*) > 1;
--
-- Et les lignes non normalisées que le CHECK refusera :
--
--   SELECT id, email FROM "User" WHERE email <> lower(email);
--
-- Les collisions se résolvent à la main (fusion ou suspension d'un doublon) — pas
-- automatiquement : choisir quel compte garde l'adresse est une décision métier.
-- Sur une base sans doublon, le UPDATE ci-dessous suffit.

-- 1. Normaliser l'existant (no-op si tout est déjà minuscule).
UPDATE "User" SET "email" = lower("email") WHERE "email" <> lower("email");

-- 2. Unicité insensible à la casse (index d'expression — non exprimable en Prisma).
DROP INDEX IF EXISTS "User_email_lower_key";
CREATE UNIQUE INDEX "User_email_lower_key" ON "User" (lower("email"));

-- 3. La valeur STOCKÉE doit rester normalisée : c'est ce qui rend fiables les lookups
--    en comparaison exacte, dont le garde de compte révoqué.
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_lowercase";
ALTER TABLE "User" ADD CONSTRAINT "User_email_lowercase" CHECK ("email" = lower("email"));
