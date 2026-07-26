-- ============================================================================
-- 0_init — BASELINE du schéma Synclune
-- ============================================================================
--
-- Migration unique reconstruisant l'intégralité de la base depuis zéro.
-- Remplace 143 migrations incrémentales, archivées dans `prisma/migrations-archive/`
-- (conservées : chacune porte sa justification légale/technique, c'est de la
-- documentation — mais elles sont hors du chemin de Prisma).
--
-- POURQUOI CE BASELINE (audit schéma 2026-07-26)
-- ----------------------------------------------
-- L'historique incrémental n'était PAS rejouable : 21 tables (`User`, `Session`,
-- `Account`, `Verification`, `Address`, `Refund`, `Discount`, `SkuMedia`,
-- `OrderHistory`…) étaient `ALTER`ées sans qu'aucune migration ne les `CREATE`.
-- Le renommage historique `user` → `User` avait été fait hors migrations, et
-- `20260209_schema_sync_and_hardening` s'intitulait elle-même « Syncs
-- schema.prisma with DB state ». Cause racine : `prisma migrate dev` est cassé
-- ici (shadow DB, P3006), et le contournement `db execute` + `migrate resolve
-- --applied` marque une migration appliquée SANS vérifier qu'elle reproduit le
-- schéma.
--
-- Conséquence d'alors : `prisma migrate deploy` sur une base vide échouait, et le
-- seul chemin de recovery était Neon PITR. Ce baseline rétablit un vrai chemin de
-- reconstruction.
--
-- Fait au bon moment : la boutique n'a jamais ouvert (`ORDERS_AVAILABLE === false`),
-- aucune donnée métier n'était en jeu.
--
-- STRUCTURE
-- ---------
--   Partie 1 — DDL généré par `prisma migrate diff --from-empty --to-schema`
--              (tables, colonnes, enums, FK, index « normaux »).
--   Partie 2 — annexe des gardes bruts, copie intégrale de `prisma/sql/raw-guards.sql`
--              (52 CHECK, 14 index partiels/expression, 2 extensions, 2 fonctions,
--              2 triggers). Prisma ne les génère JAMAIS : sans cette annexe le
--              baseline perdrait silencieusement le format de numéro de facture
--              (Art. 286 CGI), le trigger d'unicité cross-table des avoirs
--              (Art. 286), le CHECK singleton de StoreSettings, etc.
--
-- APPLIQUER SUR UNE BASE EXISTANTE (prod)
-- ---------------------------------------
-- NE PAS exécuter ce fichier : la base est déjà dans cet état. La marquer comme
-- appliquée, sans rien exécuter :
--
--     pnpm prisma migrate resolve --applied 0_init
--
-- (avec `DATABASE_URL` pointant sur l'endpoint Neon non-poolé). Vérifier ensuite
-- que rien ne dérive :
--
--     pnpm prisma migrate diff --from-url "$DATABASE_URL" --to-schema prisma/schema.prisma --script
--     # doit ne produire aucun DDL (hors gardes bruts, invisibles à migrate diff)
--
-- SUR UNE BASE VIDE (dev, staging, CI)
-- ------------------------------------
--     pnpm prisma migrate deploy
--
-- ⚠️ La partie 2 est une COPIE de `prisma/sql/raw-guards.sql`. Les deux doivent
-- rester identiques — verrouillé par
-- `test/contract/raw-guards-completeness.contract.test.ts`.
-- ============================================================================


-- ============================================================================
-- PARTIE 1 — DDL généré depuis schema.prisma
-- ============================================================================

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_DELETION', 'ANONYMIZED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PUBLIC', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('DRAFT', 'PUBLIC', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "HistorySource" AS ENUM ('ADMIN', 'WEBHOOK', 'SYSTEM', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "StockMovementSource" AS ENUM ('MANUAL_ADJUST', 'SKU_UPDATE', 'ORDER', 'WEBHOOK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('UNFULFILLED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'RETURNED');

-- CreateEnum
CREATE TYPE "OrderAction" AS ENUM ('CREATED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'STATUS_REVERTED', 'TRACKING_UPDATED', 'ADDRESS_UPDATED', 'INVOICE_GENERATED', 'INVOICE_GENERATION_FAILED', 'REFUND_CREATED', 'REFUND_COMPLETED', 'REFUND_FAILED', 'DISPUTE_OPENED', 'DISPUTE_RESOLVED', 'INVOICE_VOIDED', 'INVOICE_ARCHIVED', 'PDF_ARCHIVE_FAILED', 'CREDIT_NOTE_FAILED', 'CREDIT_NOTE_GENERATED', 'CREDIT_NOTE_ARCHIVED', 'INVOICE_RECONCILED', 'INVOICE_DOWNLOADED', 'BULK_EXPORT', 'PDP_SUBMITTED', 'PDP_ACCEPTED', 'PDP_REJECTED', 'PDP_RETRY', 'PDP_ABANDONED', 'PDP_CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'GENERATED', 'VOIDED');

-- CreateEnum
CREATE TYPE "VatRegime" AS ENUM ('FRANCHISE_BASE', 'NORMAL', 'SIMPLIFIE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'SEPA_DEBIT', 'KLARNA', 'LINK', 'WALLET', 'BANCONTACT', 'OTHER');

-- CreateEnum
CREATE TYPE "RefundReason" AS ENUM ('CUSTOMER_REQUEST', 'DEFECTIVE', 'WRONG_ITEM', 'LOST_IN_TRANSIT', 'FRAUD', 'OTHER');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'COMPLETED', 'REJECTED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('NEEDS_RESPONSE', 'UNDER_REVIEW', 'WON', 'LOST', 'CHARGE_REFUNDED');

-- CreateEnum
CREATE TYPE "DisputeReason" AS ENUM ('DUPLICATE', 'FRAUDULENT', 'SUBSCRIPTION_CANCELED', 'PRODUCT_UNACCEPTABLE', 'PRODUCT_NOT_RECEIVED', 'UNRECOGNIZED', 'CREDIT_NOT_PROCESSED', 'GENERAL');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "PostWebhookTaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AnnouncementVariant" AS ENUM ('PROMO', 'INFO', 'WARNING');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "name" VARCHAR(100),
    "email" VARCHAR(255) NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" VARCHAR(2048),
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "termsAcceptedAt" TIMESTAMP(3),
    "termsVersion" VARCHAR(20),
    "marketingOptOutAt" TIMESTAMP(3),
    "anonymizedAt" TIMESTAMP(3),
    "deletionRequestedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" VARCHAR(500) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
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

-- CreateTable
CREATE TABLE "ProductType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Color" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "hex" VARCHAR(7) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSkuColor" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSkuColor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSkuMaterial" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSkuMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "CollectionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCollection" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'PUBLIC',
    "typeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSku" (
    "id" TEXT NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "productId" TEXT NOT NULL,
    "size" VARCHAR(50),
    "priceInclTax" INTEGER NOT NULL,
    "compareAtPrice" INTEGER,
    "inventory" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProductSku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "previousInventory" INTEGER NOT NULL,
    "newInventory" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" VARCHAR(500),
    "source" "StockMovementSource" NOT NULL DEFAULT 'MANUAL_ADJUST',
    "createdById" TEXT,
    "createdByName" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkuMedia" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "thumbnailUrl" VARCHAR(2048),
    "blurDataUrl" TEXT,
    "altText" VARCHAR(255),
    "mediaType" "MediaType" NOT NULL DEFAULT 'IMAGE',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkuMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "appliedDiscountCode" VARCHAR(30),
    "discountAmountCache" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceAtAdd" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "wishlistId" TEXT NOT NULL,
    "productId" TEXT,
    "backInStockNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" VARCHAR(50) NOT NULL,
    "userId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeCustomerId" VARCHAR(50),
    "customerEmail" VARCHAR(255) NOT NULL,
    "customerName" VARCHAR(100) NOT NULL,
    "customerPhone" VARCHAR(20),
    "shippingFirstName" VARCHAR(50) NOT NULL,
    "shippingLastName" VARCHAR(50) NOT NULL,
    "shippingAddress1" VARCHAR(255) NOT NULL,
    "shippingAddress2" VARCHAR(255),
    "shippingPostalCode" VARCHAR(10) NOT NULL,
    "shippingCity" VARCHAR(100) NOT NULL,
    "shippingCountry" VARCHAR(2) NOT NULL DEFAULT 'FR',
    "shippingPhone" VARCHAR(20) NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "shippingCost" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "paymentFailureCode" VARCHAR(100),
    "paymentDeclineCode" VARCHAR(100),
    "paymentFailureMessage" VARCHAR(500),
    "invoiceNumber" VARCHAR(30),
    "invoiceStatus" "InvoiceStatus",
    "invoiceGeneratedAt" TIMESTAMP(3),
    "invoiceVoidedAt" TIMESTAMP(3),
    "creditNoteNumber" VARCHAR(30),
    "creditNoteGeneratedAt" TIMESTAMP(3),
    "creditNotePdfUrl" VARCHAR(2048),
    "creditNotePdfHash" VARCHAR(64),
    "invoicePdfUrl" VARCHAR(2048),
    "invoicePdfHash" VARCHAR(64),
    "invoiceArchivedAt" TIMESTAMP(3),
    "invoiceDataSnapshot" JSONB,
    "invoiceDataHash" VARCHAR(64),
    "vendorLegalName" VARCHAR(255),
    "vendorTradeName" VARCHAR(255),
    "vendorAddress" VARCHAR(500),
    "vendorSiren" VARCHAR(9),
    "vendorSiret" VARCHAR(14),
    "vendorVatNumber" VARCHAR(15),
    "vendorEmail" VARCHAR(255),
    "vendorApeCode" VARCHAR(10),
    "vendorBankIban" VARCHAR(34),
    "vendorBankBic" VARCHAR(11),
    "vendorVatRegime" "VatRegime",
    "vendorLegalForm" VARCHAR(100),
    "shippingCarrier" VARCHAR(30),
    "trackingNumber" VARCHAR(50),
    "trackingUrl" VARCHAR(2048),
    "estimatedDelivery" TIMESTAMP(3),
    "actualDelivery" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'UNFULFILLED',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CARD',
    "paidAt" TIMESTAMP(3),
    "billingSameAsShipping" BOOLEAN NOT NULL DEFAULT true,
    "billingFirstName" VARCHAR(50),
    "billingLastName" VARCHAR(50),
    "billingAddress1" VARCHAR(255),
    "billingAddress2" VARCHAR(255),
    "billingPostalCode" VARCHAR(10),
    "billingCity" VARCHAR(100),
    "billingCountry" VARCHAR(2),
    "billingPhone" VARCHAR(20),
    "invoiceRetryDeferred" BOOLEAN NOT NULL DEFAULT false,
    "invoiceReconcileAttempts" INTEGER NOT NULL DEFAULT 0,
    "overbilledAmountCents" INTEGER,
    "overbillingResolvedAt" TIMESTAMP(3),
    "piiPurgedAt" TIMESTAMP(3),
    "pdfIntegrityCheckedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "action" "OrderAction" NOT NULL,
    "previousStatus" "OrderStatus",
    "newStatus" "OrderStatus",
    "previousPaymentStatus" "PaymentStatus",
    "newPaymentStatus" "PaymentStatus",
    "previousFulfillmentStatus" "FulfillmentStatus",
    "newFulfillmentStatus" "FulfillmentStatus",
    "note" TEXT,
    "metadata" JSONB,
    "authorId" TEXT,
    "authorName" VARCHAR(100),
    "source" "HistorySource" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "skuId" TEXT NOT NULL,
    "productTitle" VARCHAR(200) NOT NULL,
    "productDescription" TEXT,
    "productImageUrl" VARCHAR(2048),
    "skuSku" VARCHAR(100),
    "skuColor" VARCHAR(100),
    "skuColorHexes" VARCHAR(200),
    "skuMaterial" VARCHAR(100),
    "skuSize" VARCHAR(50),
    "skuImageUrl" VARCHAR(2048),
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderNote" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" VARCHAR(100) NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OrderNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "stripeRefundId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "reason" "RefundReason" NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "note" TEXT,
    "createdBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "confirmationEmailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creditNoteNumber" VARCHAR(30),
    "creditNoteGeneratedAt" TIMESTAMP(3),
    "creditNotePdfUrl" VARCHAR(2048),
    "creditNotePdfHash" VARCHAR(64),
    "pdfIntegrityCheckedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundItem" (
    "id" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "restock" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "stripeDisputeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "reason" "DisputeReason" NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'NEEDS_RESPONSE',
    "dueBy" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discount" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "type" "DiscountType" NOT NULL,
    "value" INTEGER NOT NULL,
    "minOrderAmount" INTEGER,
    "maxUsageCount" INTEGER,
    "maxUsagePerUser" INTEGER,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountUsage" (
    "id" TEXT NOT NULL,
    "discountId" TEXT NOT NULL,
    "userId" TEXT,
    "orderId" TEXT NOT NULL,
    "discountCode" VARCHAR(30) NOT NULL,
    "amountApplied" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processingStartedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostWebhookTask" (
    "id" TEXT NOT NULL,
    "webhookEventId" TEXT,
    "taskType" VARCHAR(60) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "PostWebhookTaskStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "idempotencyKey" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),

    CONSTRAINT "PostWebhookTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" TEXT NOT NULL DEFAULT 'store-settings-singleton',
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closureMessage" VARCHAR(500),
    "closedAt" TIMESTAMP(3),
    "reopensAt" TIMESTAMP(3),
    "closedBy" VARCHAR(255),
    "announcementMessage" VARCHAR(200),
    "announcementLink" VARCHAR(2048),
    "announcementStartsAt" TIMESTAMP(3),
    "announcementEndsAt" TIMESTAMP(3),
    "announcementIsActive" BOOLEAN NOT NULL DEFAULT false,
    "announcementVariant" "AnnouncementVariant" NOT NULL DEFAULT 'PROMO',
    "orphanMediaScanOffset" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "User_accountStatus_deletionRequestedAt_idx" ON "User"("accountStatus", "deletionRequestedAt");

-- CreateIndex
CREATE INDEX "User_role_deletedAt_idx" ON "User"("role", "deletedAt");

-- CreateIndex
CREATE INDEX "User_deletedAt_suspendedAt_idx" ON "User"("deletedAt", "suspendedAt");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Account_providerId_accountId_idx" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE INDEX "Address_userId_isDefault_idx" ON "Address"("userId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "ProductType_slug_key" ON "ProductType"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductType_label_key" ON "ProductType"("label");

-- CreateIndex
CREATE INDEX "ProductType_isActive_idx" ON "ProductType"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Color_slug_key" ON "Color"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Color_name_key" ON "Color"("name");

-- CreateIndex
CREATE INDEX "Color_isActive_idx" ON "Color"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Material_slug_key" ON "Material"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Material_name_key" ON "Material"("name");

-- CreateIndex
CREATE INDEX "Material_isActive_idx" ON "Material"("isActive");

-- CreateIndex
CREATE INDEX "ProductSkuColor_colorId_idx" ON "ProductSkuColor"("colorId");

-- CreateIndex
CREATE INDEX "ProductSkuColor_skuId_position_idx" ON "ProductSkuColor"("skuId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSkuColor_skuId_colorId_key" ON "ProductSkuColor"("skuId", "colorId");

-- CreateIndex
CREATE INDEX "ProductSkuMaterial_materialId_idx" ON "ProductSkuMaterial"("materialId");

-- CreateIndex
CREATE INDEX "ProductSkuMaterial_skuId_position_idx" ON "ProductSkuMaterial"("skuId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSkuMaterial_skuId_materialId_key" ON "ProductSkuMaterial"("skuId", "materialId");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_name_key" ON "Collection"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE INDEX "Collection_status_idx" ON "Collection"("status");

-- CreateIndex
CREATE INDEX "ProductCollection_collectionId_idx" ON "ProductCollection"("collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCollection_productId_collectionId_key" ON "ProductCollection"("productId", "collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_typeId_idx" ON "Product"("typeId");

-- CreateIndex
CREATE INDEX "Product_status_createdAt_idx" ON "Product"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Product_status_deletedAt_idx" ON "Product"("status", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSku_sku_key" ON "ProductSku"("sku");

-- CreateIndex
CREATE INDEX "ProductSku_productId_idx" ON "ProductSku"("productId");

-- CreateIndex
CREATE INDEX "StockMovement_skuId_createdAt_idx" ON "StockMovement"("skuId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SkuMedia_skuId_position_idx" ON "SkuMedia"("skuId", "position");

-- CreateIndex
CREATE INDEX "SkuMedia_skuId_isPrimary_idx" ON "SkuMedia"("skuId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_sessionId_key" ON "Cart"("sessionId");

-- CreateIndex
CREATE INDEX "Cart_expiresAt_idx" ON "Cart"("expiresAt");

-- CreateIndex
CREATE INDEX "CartItem_skuId_idx" ON "CartItem"("skuId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_skuId_key" ON "CartItem"("cartId", "skuId");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_userId_key" ON "Wishlist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_sessionId_key" ON "Wishlist"("sessionId");

-- CreateIndex
CREATE INDEX "WishlistItem_productId_backInStockNotifiedAt_idx" ON "WishlistItem"("productId", "backInStockNotifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_wishlistId_productId_key" ON "WishlistItem"("wishlistId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_invoiceNumber_key" ON "Order"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_creditNoteNumber_key" ON "Order"("creditNoteNumber");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Order_userId_status_createdAt_idx" ON "Order"("userId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Order_customerEmail_idx" ON "Order"("customerEmail");

-- CreateIndex
CREATE INDEX "Order_stripeCustomerId_idx" ON "Order"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_createdAt_idx" ON "Order"("paymentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Order_paidAt_idx" ON "Order"("paidAt" DESC);

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Order_paymentStatus_deletedAt_paidAt_idx" ON "Order"("paymentStatus", "deletedAt", "paidAt" DESC);

-- CreateIndex
CREATE INDEX "Order_invoiceStatus_invoicePdfUrl_idx" ON "Order"("invoiceStatus", "invoiceArchivedAt");

-- CreateIndex
CREATE INDEX "Order_invoiceRetryDeferred_idx" ON "Order"("invoiceRetryDeferred", "paidAt");

-- CreateIndex
CREATE INDEX "Order_piiPurgedAt_paidAt_idx" ON "Order"("piiPurgedAt", "paidAt");

-- CreateIndex
CREATE INDEX "Order_unpaid_pii_purge_idx" ON "Order"("piiPurgedAt", "paidAt", "createdAt");

-- CreateIndex
CREATE INDEX "Order_overbilling_unresolved_idx" ON "Order"("overbillingResolvedAt", "overbilledAmountCents");

-- CreateIndex
CREATE INDEX "OrderHistory_orderId_createdAt_idx" ON "OrderHistory"("orderId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "OrderHistory_authorId_idx" ON "OrderHistory"("authorId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_skuId_idx" ON "OrderItem"("skuId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderNote_orderId_createdAt_idx" ON "OrderNote"("orderId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Refund_stripeRefundId_key" ON "Refund"("stripeRefundId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_creditNoteNumber_key" ON "Refund"("creditNoteNumber");

-- CreateIndex
CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");

-- CreateIndex
CREATE INDEX "Refund_status_processedAt_idx" ON "Refund"("status", "processedAt");

-- CreateIndex
CREATE INDEX "Refund_status_stripeRefundId_idx" ON "Refund"("status", "stripeRefundId");

-- CreateIndex
CREATE INDEX "Refund_createdAt_idx" ON "Refund"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "RefundItem_refundId_idx" ON "RefundItem"("refundId");

-- CreateIndex
CREATE INDEX "RefundItem_orderItemId_idx" ON "RefundItem"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_stripeDisputeId_key" ON "Dispute"("stripeDisputeId");

-- CreateIndex
CREATE INDEX "Dispute_orderId_idx" ON "Dispute"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Discount_code_key" ON "Discount"("code");

-- CreateIndex
CREATE INDEX "DiscountUsage_orderId_idx" ON "DiscountUsage"("orderId");

-- CreateIndex
CREATE INDEX "DiscountUsage_discountId_userId_idx" ON "DiscountUsage"("discountId", "userId");

-- CreateIndex
CREATE INDEX "DiscountUsage_userId_idx" ON "DiscountUsage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountUsage_discountId_orderId_key" ON "DiscountUsage"("discountId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductReview_orderItemId_key" ON "ProductReview"("orderItemId");

-- CreateIndex
CREATE INDEX "ProductReview_productId_status_deletedAt_idx" ON "ProductReview"("productId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "ProductReview_deletedAt_idx" ON "ProductReview"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductReview_userId_productId_key" ON "ProductReview"("userId", "productId");

-- CreateIndex
CREATE INDEX "ReviewMedia_reviewId_position_idx" ON "ReviewMedia"("reviewId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewResponse_reviewId_key" ON "ReviewResponse"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductReviewStats_productId_key" ON "ProductReviewStats"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_stripeEventId_key" ON "WebhookEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_processedAt_idx" ON "WebhookEvent"("status", "processedAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_receivedAt_idx" ON "WebhookEvent"("status", "receivedAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_attempts_processedAt_idx" ON "WebhookEvent"("status", "attempts", "processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostWebhookTask_idempotencyKey_key" ON "PostWebhookTask"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PostWebhookTask_status_attempts_createdAt_idx" ON "PostWebhookTask"("status", "attempts", "createdAt");

-- CreateIndex
CREATE INDEX "PostWebhookTask_status_attempts_lastAttemptAt_idx" ON "PostWebhookTask"("status", "attempts", "lastAttemptAt");

-- CreateIndex
CREATE INDEX "PostWebhookTask_status_createdAt_idx" ON "PostWebhookTask"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PostWebhookTask_webhookEventId_idx" ON "PostWebhookTask"("webhookEventId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSkuColor" ADD CONSTRAINT "ProductSkuColor_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSkuColor" ADD CONSTRAINT "ProductSkuColor_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSkuMaterial" ADD CONSTRAINT "ProductSkuMaterial_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSkuMaterial" ADD CONSTRAINT "ProductSkuMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCollection" ADD CONSTRAINT "ProductCollection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCollection" ADD CONSTRAINT "ProductCollection_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ProductType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSku" ADD CONSTRAINT "ProductSku_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkuMedia" ADD CONSTRAINT "SkuMedia_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "Wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderHistory" ADD CONSTRAINT "OrderHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderNote" ADD CONSTRAINT "OrderNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountUsage" ADD CONSTRAINT "DiscountUsage_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "Discount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountUsage" ADD CONSTRAINT "DiscountUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountUsage" ADD CONSTRAINT "DiscountUsage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewMedia" ADD CONSTRAINT "ReviewMedia_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ProductReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewResponse" ADD CONSTRAINT "ReviewResponse_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ProductReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReviewStats" ADD CONSTRAINT "ProductReviewStats_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostWebhookTask" ADD CONSTRAINT "PostWebhookTask_webhookEventId_fkey" FOREIGN KEY ("webhookEventId") REFERENCES "WebhookEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- ============================================================================
-- PARTIE 2 — ANNEXE DES GARDES BRUTS
-- (copie intégrale de prisma/sql/raw-guards.sql — garder les deux synchronisés)
-- ============================================================================

-- ============================================================================
-- GARDES SQL BRUTS — source de vérité unique (SSOT)
-- ============================================================================
--
-- Tout ce que `schema.prisma` ne sait PAS exprimer et que Prisma ne génère donc
-- jamais : CHECK constraints, index partiels / d'expression / NULLS NOT DISTINCT,
-- extensions, fonctions, triggers.
--
-- Pourquoi ce fichier existe (audit schéma 2026-07-26)
-- ----------------------------------------------------
-- Ces gardes vivaient éparpillés dans 140 migrations, et `prisma migrate diff`
-- ne les régénère pas : un baseline naïf du schéma les aurait TOUS perdus en
-- silence — dont le format de numéro de facture (Art. 286 CGI) et le trigger
-- d'unicité cross-table des avoirs. Ils sont désormais rassemblés ici, et
-- consommés par DEUX chemins qui doivent rester d'accord :
--
--   1. `prisma/migrations/0_init/migration.sql` — l'annexe du baseline, pour que
--      `prisma migrate deploy` reconstruise une base COMPLÈTE.
--   2. `test/integration/setup.ts` — appliqué après `db push`, pour que les tests
--      d'intégration s'exécutent contre les vraies contraintes. Avant cet audit
--      le setup n'en appliquait que 2 sur 52 : aucun invariant DB n'était vérifié.
--
-- ⚠️ INVARIANT : ce fichier est **idempotent** (chaque garde est précédée d'un
-- DROP ... IF EXISTS). Il doit pouvoir être rejoué sur une base déjà à jour sans
-- erreur — c'est ce qui permet aux deux chemins ci-dessus de le partager.
--
-- ⚠️ Ajouter un garde ici NE l'applique pas aux bases existantes : écrire aussi
-- une migration normale. Ce fichier décrit l'état CIBLE, pas une transition.
--
-- Vérifié par `test/contract/raw-guards-completeness.contract.test.ts`.
-- ============================================================================


-- ============================================================================
-- EXTENSIONS
-- ============================================================================
-- pg_trgm : recherche floue admin (produits, commandes, utilisateurs).
-- unaccent : recherche insensible aux diacritiques (« creole » trouve « créole »).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;


-- ============================================================================
-- FONCTIONS
-- ============================================================================
-- `unaccent()` est STABLE et non IMMUTABLE (elle dépend d'un dictionnaire), donc
-- inutilisable dans un index d'expression. Ce wrapper fixe explicitement le
-- dictionnaire, ce qui le rend légitimement IMMUTABLE et donc indexable.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent('public.unaccent', $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;


-- ## CHECK constraints

-- Cart
ALTER TABLE "Cart" DROP CONSTRAINT IF EXISTS "Cart_owner_required";
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_owner_required" CHECK ("userId" IS NOT NULL OR "sessionId" IS NOT NULL);

-- CartItem
ALTER TABLE "CartItem" DROP CONSTRAINT IF EXISTS "CartItem_priceAtAdd_positive";
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_priceAtAdd_positive" CHECK ("priceAtAdd" > 0);
ALTER TABLE "CartItem" DROP CONSTRAINT IF EXISTS "CartItem_quantity_positive";
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_quantity_positive" CHECK ("quantity" >= 1);

-- Discount
ALTER TABLE "Discount" DROP CONSTRAINT IF EXISTS "Discount_maxUsagePerUser_positive";
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_maxUsagePerUser_positive" CHECK ("maxUsagePerUser" IS NULL OR "maxUsagePerUser" > 0);
ALTER TABLE "Discount" DROP CONSTRAINT IF EXISTS "Discount_minOrderAmount_positive";
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_minOrderAmount_positive" CHECK ("minOrderAmount" IS NULL OR "minOrderAmount" > 0);
ALTER TABLE "Discount" DROP CONSTRAINT IF EXISTS "Discount_percentage_max_100";
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_percentage_max_100" CHECK ("type" != 'PERCENTAGE' OR "value" <= 100);
ALTER TABLE "Discount" DROP CONSTRAINT IF EXISTS "Discount_usageCount_non_negative";
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_usageCount_non_negative" CHECK ("usageCount" >= 0);
ALTER TABLE "Discount" DROP CONSTRAINT IF EXISTS "Discount_usageCount_within_limit";
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_usageCount_within_limit" CHECK ("maxUsageCount" IS NULL OR "usageCount" <= "maxUsageCount");
ALTER TABLE "Discount" DROP CONSTRAINT IF EXISTS "Discount_value_positive";
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_value_positive" CHECK ("value" > 0);

-- Dispute
ALTER TABLE "Dispute" DROP CONSTRAINT IF EXISTS "Dispute_amount_positive";
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "Dispute" DROP CONSTRAINT IF EXISTS "Dispute_currency_eur_check";
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_currency_eur_check" CHECK (currency = 'EUR');
ALTER TABLE "Dispute" DROP CONSTRAINT IF EXISTS "Dispute_fee_non_negative";
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_fee_non_negative" CHECK ("fee" >= 0);

-- Order
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_creditNoteNumber_format_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_creditNoteNumber_format_check" CHECK ("creditNoteNumber" IS NULL OR "creditNoteNumber" ~ '^A-[0-9]{4}-[0-9]{5}$');
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_creditNotePdfHash_format_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_creditNotePdfHash_format_check" CHECK ("creditNotePdfHash" IS NULL OR "creditNotePdfHash" ~ '^[a-f0-9]{64}$');
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_currency_eur_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_currency_eur_check" CHECK (currency = 'EUR');
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_discountAmount_non_negative";
ALTER TABLE "Order" ADD CONSTRAINT "Order_discountAmount_non_negative" CHECK ("discountAmount" >= 0);
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_invoiceDataHash_format_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_invoiceDataHash_format_check" CHECK ("invoiceDataHash" IS NULL OR "invoiceDataHash" ~ '^[a-f0-9]{64}$');
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_invoiceDataSnapshot_hash_coherence_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_invoiceDataSnapshot_hash_coherence_check" CHECK ( ("invoiceDataSnapshot" IS NULL AND "invoiceDataHash" IS NULL) OR ("invoiceDataSnapshot" IS NOT NULL AND "invoiceDataHash" IS NOT NULL) );
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_invoiceNumber_format";
ALTER TABLE "Order" ADD CONSTRAINT "Order_invoiceNumber_format" CHECK ("invoiceNumber" IS NULL OR "invoiceNumber" ~ '^F-[0-9]{4}-[0-9]{5}$');
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_invoicePdfHash_format_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_invoicePdfHash_format_check" CHECK ("invoicePdfHash" IS NULL OR "invoicePdfHash" ~ '^[a-f0-9]{64}$');
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_invoiceReconcileAttempts_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_invoiceReconcileAttempts_check" CHECK ("invoiceReconcileAttempts" >= 0);
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_overbilledAmountCents_positive_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_overbilledAmountCents_positive_check" CHECK ("overbilledAmountCents" IS NULL OR "overbilledAmountCents" > 0);
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_shippingCost_non_negative";
ALTER TABLE "Order" ADD CONSTRAINT "Order_shippingCost_non_negative" CHECK ("shippingCost" >= 0);
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_subtotal_non_negative";
ALTER TABLE "Order" ADD CONSTRAINT "Order_subtotal_non_negative" CHECK ("subtotal" >= 0);
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_taxAmount_non_negative";
ALTER TABLE "Order" ADD CONSTRAINT "Order_taxAmount_non_negative" CHECK ("taxAmount" >= 0);
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_total_formula";
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_formula" CHECK ("total" = GREATEST(0, "subtotal" - "discountAmount" + "shippingCost"));
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_total_non_negative";
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_non_negative" CHECK ("total" >= 0);
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_vendorApeCode_format_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_vendorApeCode_format_check" CHECK ("vendorApeCode" IS NULL OR "vendorApeCode" ~ '^[0-9]{2}\.[0-9]{2}[A-Z]$');
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_vendorBankBic_format_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_vendorBankBic_format_check" CHECK ("vendorBankBic" IS NULL OR "vendorBankBic" ~ '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$');
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_vendorBankIban_format_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_vendorBankIban_format_check" CHECK ("vendorBankIban" IS NULL OR "vendorBankIban" ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$');
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_vendorSiren_format_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_vendorSiren_format_check" CHECK ("vendorSiren" IS NULL OR "vendorSiren" ~ '^[0-9]{9}$');
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_vendorSiret_format_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_vendorSiret_format_check" CHECK ("vendorSiret" IS NULL OR "vendorSiret" ~ '^[0-9]{14}$');
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_vendorVatNumber_format_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_vendorVatNumber_format_check" CHECK ("vendorVatNumber" IS NULL OR "vendorVatNumber" ~ '^[A-Z]{2}[A-Z0-9]{2,13}$');

-- OrderItem
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_price_positive";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_price_positive" CHECK ("price" > 0);
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_quantity_positive";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_positive" CHECK ("quantity" > 0);

-- PostWebhookTask
ALTER TABLE "PostWebhookTask" DROP CONSTRAINT IF EXISTS "PostWebhookTask_attempts_non_negative";
ALTER TABLE "PostWebhookTask" ADD CONSTRAINT "PostWebhookTask_attempts_non_negative" CHECK ("attempts" >= 0);

-- ProductReview
ALTER TABLE "ProductReview" DROP CONSTRAINT IF EXISTS "ProductReview_rating_range";
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5);

-- ProductReviewStats
ALTER TABLE "ProductReviewStats" DROP CONSTRAINT IF EXISTS "ProductReviewStats_averageRating_range";
ALTER TABLE "ProductReviewStats" ADD CONSTRAINT "ProductReviewStats_averageRating_range" CHECK ("averageRating" >= 0 AND "averageRating" <= 5);

-- ProductSku
ALTER TABLE "ProductSku" DROP CONSTRAINT IF EXISTS "ProductSku_compareAtPrice_valid";
ALTER TABLE "ProductSku" ADD CONSTRAINT "ProductSku_compareAtPrice_valid" CHECK ("compareAtPrice" IS NULL OR "compareAtPrice" >= "priceInclTax");
ALTER TABLE "ProductSku" DROP CONSTRAINT IF EXISTS "ProductSku_inventory_non_negative";
ALTER TABLE "ProductSku" ADD CONSTRAINT "ProductSku_inventory_non_negative" CHECK (inventory >= 0);
ALTER TABLE "ProductSku" DROP CONSTRAINT IF EXISTS "ProductSku_priceInclTax_positive";
ALTER TABLE "ProductSku" ADD CONSTRAINT "ProductSku_priceInclTax_positive" CHECK ("priceInclTax" > 0);

-- Refund
ALTER TABLE "Refund" DROP CONSTRAINT IF EXISTS "Refund_amount_positive";
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "Refund" DROP CONSTRAINT IF EXISTS "Refund_creditNoteNumber_format_check";
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_creditNoteNumber_format_check" CHECK ("creditNoteNumber" IS NULL OR "creditNoteNumber" ~ '^A-[0-9]{4}-[0-9]{5}$');
ALTER TABLE "Refund" DROP CONSTRAINT IF EXISTS "Refund_creditNotePdfHash_format_check";
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_creditNotePdfHash_format_check" CHECK ("creditNotePdfHash" IS NULL OR "creditNotePdfHash" ~ '^[a-f0-9]{64}$');
ALTER TABLE "Refund" DROP CONSTRAINT IF EXISTS "Refund_currency_eur_check";
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_currency_eur_check" CHECK (currency = 'EUR');

-- RefundItem
ALTER TABLE "RefundItem" DROP CONSTRAINT IF EXISTS "RefundItem_amount_positive";
ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "RefundItem" DROP CONSTRAINT IF EXISTS "RefundItem_quantity_positive";
ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_quantity_positive" CHECK ("quantity" >= 1);

-- SkuMedia
ALTER TABLE "SkuMedia" DROP CONSTRAINT IF EXISTS "SkuMedia_dimensions_positive";
ALTER TABLE "SkuMedia" ADD CONSTRAINT "SkuMedia_dimensions_positive" CHECK ( ("width" IS NULL OR "width" > 0) AND ("height" IS NULL OR "height" > 0) );

-- StockMovement
ALTER TABLE "StockMovement" DROP CONSTRAINT IF EXISTS "StockMovement_delta_consistent";
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_delta_consistent" CHECK ("newInventory" = "previousInventory" + "delta");
ALTER TABLE "StockMovement" DROP CONSTRAINT IF EXISTS "StockMovement_inventory_non_negative";
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_inventory_non_negative" CHECK ("previousInventory" >= 0 AND "newInventory" >= 0);

-- StoreSettings
ALTER TABLE "StoreSettings" DROP CONSTRAINT IF EXISTS "StoreSettings_singleton_id";
ALTER TABLE "StoreSettings" ADD CONSTRAINT "StoreSettings_singleton_id" CHECK (id = 'store-settings-singleton');

-- Wishlist
ALTER TABLE "Wishlist" DROP CONSTRAINT IF EXISTS "Wishlist_owner_required";
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_owner_required" CHECK ("userId" IS NOT NULL OR "sessionId" IS NOT NULL);


-- ## Index partiels / expression / NULLS NOT DISTINCT
DROP INDEX IF EXISTS "Address_userId_isDefault_unique";
CREATE UNIQUE INDEX "Address_userId_isDefault_unique" ON "Address"("userId") WHERE "isDefault" = true;
DROP INDEX IF EXISTS "Order_customerEmail_unaccent_trgm_idx";
CREATE INDEX "Order_customerEmail_unaccent_trgm_idx" ON "Order" USING gin (immutable_unaccent("customerEmail") gin_trgm_ops);
DROP INDEX IF EXISTS "Order_customerName_unaccent_trgm_idx";
CREATE INDEX "Order_customerName_unaccent_trgm_idx" ON "Order" USING gin (immutable_unaccent("customerName") gin_trgm_ops);
DROP INDEX IF EXISTS "Order_invoiceRetryDeferred_idx";
CREATE INDEX "Order_invoiceRetryDeferred_idx" ON "Order" ("invoiceRetryDeferred", "paidAt") WHERE "invoiceRetryDeferred" = true;
DROP INDEX IF EXISTS "Order_overbilling_unresolved_idx";
CREATE INDEX "Order_overbilling_unresolved_idx" ON "Order" ("overbillingResolvedAt", "overbilledAmountCents") WHERE "overbilledAmountCents" IS NOT NULL AND "overbillingResolvedAt" IS NULL;
DROP INDEX IF EXISTS "Order_piiPurgedAt_paidAt_idx";
CREATE INDEX IF NOT EXISTS "Order_piiPurgedAt_paidAt_idx" ON "Order" ("piiPurgedAt", "paidAt") WHERE "piiPurgedAt" IS NULL;
DROP INDEX IF EXISTS "Order_unpaid_pii_purge_idx";
CREATE INDEX IF NOT EXISTS "Order_unpaid_pii_purge_idx" ON "Order" ("piiPurgedAt", "paidAt", "createdAt") WHERE "piiPurgedAt" IS NULL AND "paidAt" IS NULL;
DROP INDEX IF EXISTS "Product_description_unaccent_trgm_idx";
CREATE INDEX "Product_description_unaccent_trgm_idx" ON "Product" USING gin (immutable_unaccent(COALESCE(description, '')) gin_trgm_ops);
DROP INDEX IF EXISTS "Product_title_unaccent_trgm_idx";
CREATE INDEX "Product_title_unaccent_trgm_idx" ON "Product" USING gin (immutable_unaccent(title) gin_trgm_ops);
DROP INDEX IF EXISTS "ProductCollection_collectionId_isFeatured_unique";
CREATE UNIQUE INDEX "ProductCollection_collectionId_isFeatured_unique" ON "ProductCollection" ("collectionId") WHERE "isFeatured" = true;
DROP INDEX IF EXISTS "ProductSku_productId_isDefault_unique";
CREATE UNIQUE INDEX "ProductSku_productId_isDefault_unique" ON "ProductSku" ("productId") WHERE "isDefault" = true AND "deletedAt" IS NULL;
DROP INDEX IF EXISTS "SkuMedia_one_primary_per_sku";
CREATE UNIQUE INDEX "SkuMedia_one_primary_per_sku" ON "SkuMedia" ("skuId") WHERE "isPrimary" = true;
DROP INDEX IF EXISTS "User_email_unaccent_trgm_idx";
CREATE INDEX "User_email_unaccent_trgm_idx" ON "User" USING gin (immutable_unaccent(email) gin_trgm_ops);
DROP INDEX IF EXISTS "User_name_unaccent_trgm_idx";
CREATE INDEX "User_name_unaccent_trgm_idx" ON "User" USING gin (immutable_unaccent(COALESCE(name, '')) gin_trgm_ops);


-- ============================================================================
-- TRIGGERS — unicité CROSS-TABLE des numéros d'avoir (A-YYYY-NNNNN)
-- ============================================================================
--
-- La séquence avoir est PARTAGÉE entre `Order.creditNoteNumber` (full void) et
-- `Refund.creditNoteNumber` (avoir partiel). Les contraintes UNIQUE sont
-- PER-TABLE : elles ne voient pas un doublon entre les deux. L'unicité globale
-- repose côté applicatif sur l'advisory lock 2_000_000+year + lookup MAX sur
-- l'UNION (credit-note-sequence.service.ts) ; ce trigger est le filet DB contre
-- les écritures qui CONTOURNENT le lock (SQL manuel, script bugué).
--
-- Rejette en SQLSTATE 23505 (→ Prisma P2002, déjà couvert par les boucles de
-- retry de séquence). Limite assumée : sous READ COMMITTED deux transactions
-- concurrentes non verrouillées peuvent passer toutes deux (lignes non commitées
-- invisibles) — exclu pour les writers légitimes, détecté a posteriori par
-- check-sequence-continuity (cron reconcile-invoices).
--
-- Art. 286 CGI — numérotation séquentielle sans doublon.

CREATE OR REPLACE FUNCTION check_credit_note_cross_table_unique()
RETURNS trigger AS $$
BEGIN
	IF NEW."creditNoteNumber" IS NULL THEN
		RETURN NEW;
	END IF;

	IF TG_TABLE_NAME = 'Order' THEN
		IF EXISTS (
			SELECT 1 FROM "Refund" WHERE "creditNoteNumber" = NEW."creditNoteNumber"
		) THEN
			RAISE EXCEPTION 'creditNoteNumber % deja attribue dans Refund (sequence A-YYYY partagee, Art. 286 CGI)',
				NEW."creditNoteNumber"
				USING ERRCODE = '23505', CONSTRAINT = 'CreditNote_cross_table_unique';
		END IF;
	ELSE
		IF EXISTS (
			SELECT 1 FROM "Order" WHERE "creditNoteNumber" = NEW."creditNoteNumber"
		) THEN
			RAISE EXCEPTION 'creditNoteNumber % deja attribue dans Order (sequence A-YYYY partagee, Art. 286 CGI)',
				NEW."creditNoteNumber"
				USING ERRCODE = '23505', CONSTRAINT = 'CreditNote_cross_table_unique';
		END IF;
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "Order_creditNoteNumber_cross_unique" ON "Order";
CREATE TRIGGER "Order_creditNoteNumber_cross_unique"
	BEFORE INSERT OR UPDATE OF "creditNoteNumber" ON "Order"
	FOR EACH ROW EXECUTE FUNCTION check_credit_note_cross_table_unique();

DROP TRIGGER IF EXISTS "Refund_creditNoteNumber_cross_unique" ON "Refund";
CREATE TRIGGER "Refund_creditNoteNumber_cross_unique"
	BEFORE INSERT OR UPDATE OF "creditNoteNumber" ON "Refund"
	FOR EACH ROW EXECUTE FUNCTION check_credit_note_cross_table_unique();
