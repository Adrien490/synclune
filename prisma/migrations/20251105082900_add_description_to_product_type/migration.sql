-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PUBLIC', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'GENERATED', 'SENT', 'ARCHIVED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'BANK_TRANSFER', 'PAYPAL', 'OTHER');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "firstName" TEXT,
    "lastName" TEXT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
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
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "postalCode" VARCHAR(5) NOT NULL,
    "city" TEXT NOT NULL,
    "country" VARCHAR(2) NOT NULL DEFAULT 'FR',
    "phone" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
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
    "name" TEXT NOT NULL,
    "hex" VARCHAR(7) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'PUBLIC',
    "typeId" TEXT,
    "collectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSku" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "colorId" TEXT,
    "material" TEXT,
    "size" TEXT,
    "priceInclTax" INTEGER NOT NULL,
    "compareAtPrice" INTEGER,
    "inventory" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkuImage" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "mediaType" "MediaType" NOT NULL DEFAULT 'IMAGE',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkuImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT,
    "subtotal" INTEGER NOT NULL,
    "shipping" INTEGER NOT NULL DEFAULT 0,
    "tax" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "shippingFirstName" TEXT NOT NULL,
    "shippingLastName" TEXT NOT NULL,
    "shippingAddress1" TEXT NOT NULL,
    "shippingAddress2" TEXT,
    "shippingPostalCode" VARCHAR(5) NOT NULL,
    "shippingCity" TEXT NOT NULL,
    "shippingCountry" VARCHAR(2) NOT NULL DEFAULT 'FR',
    "shippingPhone" TEXT NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentIntentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "invoiceStatus" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "invoicePdfUrl" TEXT,
    "invoiceIssuedAt" TIMESTAMP(3),
    "stripeInvoiceId" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CARD',
    "stripeCustomerEmail" TEXT,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "shippingMethod" TEXT,
    "trackingCode" TEXT,
    "shippedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "skuId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "productDescription" TEXT,
    "productImageUrl" TEXT,
    "skuColor" TEXT,
    "skuMaterial" TEXT,
    "skuSize" TEXT,
    "skuImageUrl" TEXT,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "percentage" INTEGER NOT NULL,
    "minOrderAmount" INTEGER,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderDiscount" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "discountCodeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "percentage" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "expiresAt" TIMESTAMP(3),
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
CREATE TABLE "newsletter_subscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribeToken" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "confirmationToken" TEXT,
    "confirmationSentAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "consentSource" TEXT DEFAULT 'newsletter_form',
    "consentTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_item" (
    "id" TEXT NOT NULL,
    "wishlistId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "priceAtAdd" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wishlist_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_stripeCustomerId_key" ON "user"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "user_deletedAt_idx" ON "user"("deletedAt");

-- CreateIndex
CREATE INDEX "user_deletedAt_firstName_lastName_id_idx" ON "user"("deletedAt", "firstName", "lastName", "id");

-- CreateIndex
CREATE INDEX "user_deletedAt_email_id_idx" ON "user"("deletedAt", "email", "id");

-- CreateIndex
CREATE INDEX "user_role_id_idx" ON "user"("role", "id");

-- CreateIndex
CREATE INDEX "user_emailVerified_id_idx" ON "user"("emailVerified", "id");

-- CreateIndex
CREATE INDEX "user_createdAt_id_idx" ON "user"("createdAt", "id");

-- CreateIndex
CREATE INDEX "user_firstName_lastName_id_idx" ON "user"("firstName", "lastName", "id");

-- CreateIndex
CREATE INDEX "user_email_id_idx" ON "user"("email", "id");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "session_token_idx" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_expiresAt_idx" ON "session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "session_expiresAt_id_idx" ON "session"("expiresAt", "id");

-- CreateIndex
CREATE INDEX "session_createdAt_id_idx" ON "session"("createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "account_userId_id_idx" ON "account"("userId", "id");

-- CreateIndex
CREATE INDEX "account_providerId_accountId_idx" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "account_createdAt_id_idx" ON "account"("createdAt", "id");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "address_userId_idx" ON "address"("userId");

-- CreateIndex
CREATE INDEX "address_userId_isDefault_idx" ON "address"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "address_userId_createdAt_idx" ON "address"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "address_createdAt_id_idx" ON "address"("createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductType_slug_key" ON "ProductType"("slug");

-- CreateIndex
CREATE INDEX "ProductType_slug_idx" ON "ProductType"("slug");

-- CreateIndex
CREATE INDEX "ProductType_isActive_idx" ON "ProductType"("isActive");

-- CreateIndex
CREATE INDEX "ProductType_isSystem_idx" ON "ProductType"("isSystem");

-- CreateIndex
CREATE INDEX "ProductType_label_id_idx" ON "ProductType"("label", "id");

-- CreateIndex
CREATE INDEX "ProductType_createdAt_id_idx" ON "ProductType"("createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Color_slug_key" ON "Color"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Color_name_key" ON "Color"("name");

-- CreateIndex
CREATE INDEX "Color_slug_idx" ON "Color"("slug");

-- CreateIndex
CREATE INDEX "Color_name_idx" ON "Color"("name");

-- CreateIndex
CREATE INDEX "Color_name_id_idx" ON "Color"("name", "id");

-- CreateIndex
CREATE INDEX "Color_createdAt_id_idx" ON "Color"("createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE INDEX "Collection_slug_idx" ON "Collection"("slug");

-- CreateIndex
CREATE INDEX "Collection_name_id_idx" ON "Collection"("name", "id");

-- CreateIndex
CREATE INDEX "Collection_createdAt_id_idx" ON "Collection"("createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_slug_idx" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "Product_status_id_idx" ON "Product"("status", "id");

-- CreateIndex
CREATE INDEX "Product_title_idx" ON "Product"("title");

-- CreateIndex
CREATE INDEX "Product_title_id_idx" ON "Product"("title", "id");

-- CreateIndex
CREATE INDEX "Product_typeId_idx" ON "Product"("typeId");

-- CreateIndex
CREATE INDEX "Product_typeId_status_idx" ON "Product"("typeId", "status");

-- CreateIndex
CREATE INDEX "Product_typeId_status_id_idx" ON "Product"("typeId", "status", "id");

-- CreateIndex
CREATE INDEX "Product_collectionId_idx" ON "Product"("collectionId");

-- CreateIndex
CREATE INDEX "Product_collectionId_status_idx" ON "Product"("collectionId", "status");

-- CreateIndex
CREATE INDEX "Product_collectionId_status_id_idx" ON "Product"("collectionId", "status", "id");

-- CreateIndex
CREATE INDEX "Product_createdAt_id_idx" ON "Product"("createdAt", "id");

-- CreateIndex
CREATE INDEX "Product_updatedAt_id_idx" ON "Product"("updatedAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSku_sku_key" ON "ProductSku"("sku");

-- CreateIndex
CREATE INDEX "ProductSku_productId_isActive_idx" ON "ProductSku"("productId", "isActive");

-- CreateIndex
CREATE INDEX "ProductSku_productId_isActive_priceInclTax_idx" ON "ProductSku"("productId", "isActive", "priceInclTax");

-- CreateIndex
CREATE INDEX "ProductSku_colorId_isActive_priceInclTax_idx" ON "ProductSku"("colorId", "isActive", "priceInclTax");

-- CreateIndex
CREATE INDEX "ProductSku_isActive_priceInclTax_idx" ON "ProductSku"("isActive", "priceInclTax");

-- CreateIndex
CREATE INDEX "ProductSku_isActive_priceInclTax_id_idx" ON "ProductSku"("isActive", "priceInclTax", "id");

-- CreateIndex
CREATE INDEX "ProductSku_isActive_inventory_idx" ON "ProductSku"("isActive", "inventory");

-- CreateIndex
CREATE INDEX "ProductSku_isActive_inventory_id_idx" ON "ProductSku"("isActive", "inventory", "id");

-- CreateIndex
CREATE INDEX "ProductSku_isActive_inventory_updatedAt_idx" ON "ProductSku"("isActive", "inventory", "updatedAt");

-- CreateIndex
CREATE INDEX "ProductSku_productId_isDefault_idx" ON "ProductSku"("productId", "isDefault");

-- CreateIndex
CREATE INDEX "ProductSku_isActive_createdAt_idx" ON "ProductSku"("isActive", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ProductSku_sku_idx" ON "ProductSku"("sku");

-- CreateIndex
CREATE INDEX "ProductSku_sku_id_idx" ON "ProductSku"("sku", "id");

-- CreateIndex
CREATE INDEX "ProductSku_size_idx" ON "ProductSku"("size");

-- CreateIndex
CREATE INDEX "ProductSku_inventory_id_idx" ON "ProductSku"("inventory", "id");

-- CreateIndex
CREATE INDEX "ProductSku_createdAt_id_idx" ON "ProductSku"("createdAt", "id");

-- CreateIndex
CREATE INDEX "ProductSku_colorId_id_idx" ON "ProductSku"("colorId", "id");

-- CreateIndex
CREATE INDEX "SkuImage_skuId_isPrimary_idx" ON "SkuImage"("skuId", "isPrimary");

-- CreateIndex
CREATE INDEX "SkuImage_skuId_createdAt_idx" ON "SkuImage"("skuId", "createdAt");

-- CreateIndex
CREATE INDEX "SkuImage_createdAt_id_idx" ON "SkuImage"("createdAt", "id");

-- CreateIndex
CREATE INDEX "SkuImage_mediaType_idx" ON "SkuImage"("mediaType");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_invoiceNumber_key" ON "Order"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeInvoiceId_key" ON "Order"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_status_id_idx" ON "Order"("status", "id");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_id_idx" ON "Order"("paymentStatus", "id");

-- CreateIndex
CREATE INDEX "Order_total_id_idx" ON "Order"("total", "id");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Order_createdAt_id_idx" ON "Order"("createdAt", "id");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_createdAt_idx" ON "Order"("paymentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_createdAt_id_idx" ON "Order"("paymentStatus", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Order_stripePaymentIntentId_idx" ON "Order"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Order_invoiceNumber_idx" ON "Order"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Order_invoiceStatus_idx" ON "Order"("invoiceStatus");

-- CreateIndex
CREATE INDEX "Order_invoiceStatus_invoiceDate_idx" ON "Order"("invoiceStatus", "invoiceDate" DESC);

-- CreateIndex
CREATE INDEX "Order_userId_invoiceDate_idx" ON "Order"("userId", "invoiceDate" DESC);

-- CreateIndex
CREATE INDEX "Order_stripeInvoiceId_idx" ON "Order"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_id_idx" ON "OrderItem"("orderId", "id");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_orderId_idx" ON "OrderItem"("productId", "orderId");

-- CreateIndex
CREATE INDEX "OrderItem_skuId_idx" ON "OrderItem"("skuId");

-- CreateIndex
CREATE INDEX "OrderItem_skuId_createdAt_idx" ON "OrderItem"("skuId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_skuColor_idx" ON "OrderItem"("skuColor");

-- CreateIndex
CREATE INDEX "OrderItem_skuSize_idx" ON "OrderItem"("skuSize");

-- CreateIndex
CREATE INDEX "OrderItem_createdAt_idx" ON "OrderItem"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "OrderItem_createdAt_id_idx" ON "OrderItem"("createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");

-- CreateIndex
CREATE INDEX "DiscountCode_code_idx" ON "DiscountCode"("code");

-- CreateIndex
CREATE INDEX "DiscountCode_isActive_startsAt_endsAt_idx" ON "DiscountCode"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "DiscountCode_createdAt_id_idx" ON "DiscountCode"("createdAt", "id");

-- CreateIndex
CREATE INDEX "DiscountCode_isActive_id_idx" ON "DiscountCode"("isActive", "id");

-- CreateIndex
CREATE INDEX "OrderDiscount_orderId_idx" ON "OrderDiscount"("orderId");

-- CreateIndex
CREATE INDEX "OrderDiscount_discountCodeId_idx" ON "OrderDiscount"("discountCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_sessionId_key" ON "Cart"("sessionId");

-- CreateIndex
CREATE INDEX "Cart_userId_idx" ON "Cart"("userId");

-- CreateIndex
CREATE INDEX "Cart_sessionId_idx" ON "Cart"("sessionId");

-- CreateIndex
CREATE INDEX "Cart_expiresAt_idx" ON "Cart"("expiresAt");

-- CreateIndex
CREATE INDEX "Cart_updatedAt_idx" ON "Cart"("updatedAt");

-- CreateIndex
CREATE INDEX "Cart_createdAt_id_idx" ON "Cart"("createdAt", "id");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE INDEX "CartItem_skuId_idx" ON "CartItem"("skuId");

-- CreateIndex
CREATE INDEX "CartItem_createdAt_id_idx" ON "CartItem"("createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_skuId_key" ON "CartItem"("cartId", "skuId");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscriber_email_key" ON "newsletter_subscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscriber_unsubscribeToken_key" ON "newsletter_subscriber"("unsubscribeToken");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscriber_confirmationToken_key" ON "newsletter_subscriber"("confirmationToken");

-- CreateIndex
CREATE INDEX "newsletter_subscriber_email_idx" ON "newsletter_subscriber"("email");

-- CreateIndex
CREATE INDEX "newsletter_subscriber_isActive_createdAt_idx" ON "newsletter_subscriber"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "newsletter_subscriber_emailVerified_isActive_idx" ON "newsletter_subscriber"("emailVerified", "isActive");

-- CreateIndex
CREATE INDEX "newsletter_subscriber_confirmationToken_idx" ON "newsletter_subscriber"("confirmationToken");

-- CreateIndex
CREATE INDEX "newsletter_subscriber_createdAt_id_idx" ON "newsletter_subscriber"("createdAt", "id");

-- CreateIndex
CREATE INDEX "newsletter_subscriber_unsubscribeToken_idx" ON "newsletter_subscriber"("unsubscribeToken");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_userId_key" ON "wishlist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_sessionId_key" ON "wishlist"("sessionId");

-- CreateIndex
CREATE INDEX "wishlist_userId_idx" ON "wishlist"("userId");

-- CreateIndex
CREATE INDEX "wishlist_sessionId_idx" ON "wishlist"("sessionId");

-- CreateIndex
CREATE INDEX "wishlist_updatedAt_idx" ON "wishlist"("updatedAt");

-- CreateIndex
CREATE INDEX "wishlist_createdAt_id_idx" ON "wishlist"("createdAt", "id");

-- CreateIndex
CREATE INDEX "wishlist_item_wishlistId_idx" ON "wishlist_item"("wishlistId");

-- CreateIndex
CREATE INDEX "wishlist_item_skuId_idx" ON "wishlist_item"("skuId");

-- CreateIndex
CREATE INDEX "wishlist_item_createdAt_id_idx" ON "wishlist_item"("createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_item_wishlistId_skuId_key" ON "wishlist_item"("wishlistId", "skuId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ProductType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSku" ADD CONSTRAINT "ProductSku_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSku" ADD CONSTRAINT "ProductSku_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkuImage" ADD CONSTRAINT "SkuImage_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDiscount" ADD CONSTRAINT "OrderDiscount_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDiscount" ADD CONSTRAINT "OrderDiscount_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_item" ADD CONSTRAINT "wishlist_item_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_item" ADD CONSTRAINT "wishlist_item_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProductSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;
