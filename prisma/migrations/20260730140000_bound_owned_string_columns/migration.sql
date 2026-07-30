-- Borne les dernières colonnes texte NON BORNÉES que le projet possède.
--
-- Contexte (audit schéma 2026-07-30) : le schéma borne méticuleusement chaque chaîne
-- métier (`@db.VarChar(n)`) — sauf sept colonnes restées en TEXT implicite, seul îlot
-- d'incohérence. En Postgres `varchar(n)` et `text` ont des performances identiques :
-- l'unique différence est la CONTRAINTE de longueur, et c'est précisément ce qu'on veut
-- ici (les slugs finissent dans des URL et dans un index unique).
--
-- Valeurs choisies, dérivées de SSOT existantes plutôt qu'arbitraires :
--   slug            → VarChar(100) : `SLUG_MAX_LENGTH` vaut 70 (shared/constants/
--                     slug-patterns.ts), plus la marge du suffixe d'unicité (`-2`, `-12`)
--                     que `generateSlug` ajoute pour éviter les collisions.
--   failureReason   → VarChar(500) : parité avec `Order.paymentFailureMessage`.
--   stripeCustomerId→ VarChar(50)  : parité avec `Order.stripeCustomerId` (`cus_` + 14).
--
-- Les colonnes appartenant à Better Auth (`Account.scope`, `Account.accountId`,
-- `Account.providerId`, `Verification.identifier`) sont DÉLIBÉRÉMENT laissées en TEXT :
-- leur contenu est écrit par une librairie dont on ne contrôle pas les formats (un
-- `scope` OAuth peut s'allonger au gré des providers). Les borner n'apporterait aucune
-- garantie et pourrait casser une connexion. Ce n'est pas un oubli.

ALTER TABLE "ProductType" ALTER COLUMN "slug" TYPE VARCHAR(100);
ALTER TABLE "Color" ALTER COLUMN "slug" TYPE VARCHAR(100);
ALTER TABLE "Material" ALTER COLUMN "slug" TYPE VARCHAR(100);
ALTER TABLE "Collection" ALTER COLUMN "slug" TYPE VARCHAR(100);
ALTER TABLE "Product" ALTER COLUMN "slug" TYPE VARCHAR(100);

ALTER TABLE "Refund" ALTER COLUMN "failureReason" TYPE VARCHAR(500);

ALTER TABLE "User" ALTER COLUMN "stripeCustomerId" TYPE VARCHAR(50);
