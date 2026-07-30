-- Rollback de `20260730120000_drop_reviews_system`.
--
-- ⚠️ Recrée la STRUCTURE à l'identique de `0_init`, PAS les données. Les avis, les
-- réponses admin, les photos et les statistiques agrégées sont définitivement
-- perdus par la migration `up` : seul un Neon PITR antérieur à son application les
-- récupère. Ce fichier existe pour rétablir rapidement le schéma en cas
-- d'incident (ex. un déploiement partiel où du code attend encore ces tables),
-- pas pour restaurer un état métier.
--
-- Corollaire : après ce rollback, `ProductReviewStats` est VIDE. Les cartes
-- produit et le JSON-LD n'afficheraient aucune note jusqu'à un recalcul complet
-- (`recomputeProductReviewStatsBatch` sur l'ensemble du catalogue), fonction
-- elle-même retirée du code au même commit.

CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN');

CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "userId" TEXT,
    "orderItemId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" VARCHAR(150),
    "content" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReviewMedia" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "blurDataUrl" TEXT,
    "altText" VARCHAR(255),
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewMedia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReviewResponse" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ReviewResponse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductReviewStats" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "rating1Count" INTEGER NOT NULL DEFAULT 0,
    "rating2Count" INTEGER NOT NULL DEFAULT 0,
    "rating3Count" INTEGER NOT NULL DEFAULT 0,
    "rating4Count" INTEGER NOT NULL DEFAULT 0,
    "rating5Count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReviewStats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductReview_orderItemId_key" ON "ProductReview"("orderItemId");
CREATE INDEX "ProductReview_productId_status_deletedAt_idx" ON "ProductReview"("productId", "status", "deletedAt");
CREATE INDEX "ProductReview_deletedAt_idx" ON "ProductReview"("deletedAt");
CREATE UNIQUE INDEX "ProductReview_userId_productId_key" ON "ProductReview"("userId", "productId");
CREATE INDEX "ReviewMedia_reviewId_position_idx" ON "ReviewMedia"("reviewId", "position");
CREATE UNIQUE INDEX "ReviewResponse_reviewId_key" ON "ReviewResponse"("reviewId");
CREATE UNIQUE INDEX "ProductReviewStats_productId_key" ON "ProductReviewStats"("productId");

ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReviewMedia" ADD CONSTRAINT "ReviewMedia_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ProductReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewResponse" ADD CONSTRAINT "ReviewResponse_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ProductReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductReviewStats" ADD CONSTRAINT "ProductReviewStats_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Gardes bruts : `prisma migrate diff` ne les génère jamais, ils étaient portés
-- par l'annexe de `0_init` (SSOT `prisma/sql/raw-guards.sql`, dont ils ont été
-- retirés). Sans eux, une note hors bornes 1–5 redeviendrait insérable.
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5);
ALTER TABLE "ProductReviewStats" ADD CONSTRAINT "ProductReviewStats_averageRating_range" CHECK ("averageRating" >= 0 AND "averageRating" <= 5);
