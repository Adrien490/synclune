-- Rollback : repasse les sept colonnes en TEXT non borné.
--
-- Sans risque de perte : élargir une contrainte de longueur ne tronque rien. Penser à
-- retirer les `@db.VarChar(...)` correspondants de `schema.prisma`, sinon le prochain
-- `db push` (setup d'intégration) les rétablira et la base divergera du schéma.

ALTER TABLE "ProductType" ALTER COLUMN "slug" TYPE TEXT;
ALTER TABLE "Color" ALTER COLUMN "slug" TYPE TEXT;
ALTER TABLE "Material" ALTER COLUMN "slug" TYPE TEXT;
ALTER TABLE "Collection" ALTER COLUMN "slug" TYPE TEXT;
ALTER TABLE "Product" ALTER COLUMN "slug" TYPE TEXT;

ALTER TABLE "Refund" ALTER COLUMN "failureReason" TYPE TEXT;

ALTER TABLE "User" ALTER COLUMN "stripeCustomerId" TYPE TEXT;
