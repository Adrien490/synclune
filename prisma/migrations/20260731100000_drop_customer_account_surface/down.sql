-- Rollback de `20260731100000_drop_customer_account_surface`.
--
-- ⚠️ RESTAURE LA STRUCTURE, PAS LES DONNÉES.
--
-- Le `DROP TABLE "Address"` et les cinq `DROP COLUMN` sont destructifs : ce
-- script recrée des colonnes VIDES et une table VIDE. Si les valeurs comptent
-- (carnets d'adresses clients, dates d'acceptation des CGV, marqueurs
-- d'anonymisation), le seul recovery est un **restore Neon PITR** à un point
-- antérieur à la migration — pas ce fichier.
--
-- Il existe pour rendre un rollback de SCHÉMA immédiat en cas d'incident de
-- déploiement (code d'une version antérieure qui attend encore ces colonnes).

-- ============================================================================
-- 1. Colonnes d'anonymisation RGPD sur `User`
-- ============================================================================
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "anonymizedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletionRequestedAt" TIMESTAMP(3);

-- ============================================================================
-- 2. Colonnes de consentement RGPD sur `User`
-- ============================================================================
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsVersion" VARCHAR(20);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "marketingOptOutAt" TIMESTAMP(3);

-- ============================================================================
-- 3. Index de scan du cron `process-account-deletions`
-- ============================================================================
-- Recréé APRÈS `deletionRequestedAt`, dont il dépend.
CREATE INDEX IF NOT EXISTS "User_accountStatus_deletionRequestedAt_idx"
  ON "User"("accountStatus", "deletionRequestedAt");

-- ============================================================================
-- 4. Table `Address` — carnet d'adresses client
-- ============================================================================
-- Reproduction exacte de la définition de `0_init` (colonnes, types, longueurs,
-- défauts), suivie de sa FK, de son index normal, puis du garde brut
-- `Address_userId_isDefault_unique` (index unique PARTIEL, non exprimable en
-- Prisma — il vit dans `prisma/sql/raw-guards.sql`).
CREATE TABLE IF NOT EXISTS "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" VARCHAR(50) NOT NULL,
    "lastName" VARCHAR(50) NOT NULL,
    "address1" VARCHAR(255) NOT NULL,
    "address2" VARCHAR(255),
    "postalCode" VARCHAR(10) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "country" VARCHAR(2) NOT NULL DEFAULT 'FR',
    "phone" VARCHAR(20) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Address"
  DROP CONSTRAINT IF EXISTS "Address_userId_fkey";
ALTER TABLE "Address"
  ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId")
  REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Address_userId_isDefault_idx" ON "Address"("userId", "isDefault");

DROP INDEX IF EXISTS "Address_userId_isDefault_unique";
CREATE UNIQUE INDEX "Address_userId_isDefault_unique" ON "Address"("userId") WHERE "isDefault" = true;
