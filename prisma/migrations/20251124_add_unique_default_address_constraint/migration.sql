-- CreateIndex: Contrainte unique partielle pour garantir une seule adresse par défaut par utilisateur
-- Prisma ne supporte pas nativement les index partiels (WHERE clause), d'où cette migration SQL manuelle
--
-- Cette contrainte empêche techniquement d'avoir 2 adresses avec isDefault=true pour le même userId
-- En cas de violation, PostgreSQL retournera une erreur "duplicate key value violates unique constraint"

CREATE UNIQUE INDEX "Address_userId_isDefault_unique"
ON "Address"("userId")
WHERE "isDefault" = true;
