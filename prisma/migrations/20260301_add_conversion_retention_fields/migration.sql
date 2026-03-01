-- Cart: abandoned cart recovery email tracking
ALTER TABLE "Cart" ADD COLUMN "abandonedEmailSentAt" TIMESTAMP(3);

-- WishlistItem: back-in-stock notification tracking
ALTER TABLE "WishlistItem" ADD COLUMN "backInStockNotifiedAt" TIMESTAMP(3);

-- Order: review reminder (2nd attempt) tracking
ALTER TABLE "Order" ADD COLUMN "reviewReminderSentAt" TIMESTAMP(3);

-- Order: cross-sell post-delivery email tracking
ALTER TABLE "Order" ADD COLUMN "crossSellEmailSentAt" TIMESTAMP(3);

-- CustomizationRequest: inspiration images uploaded by client
ALTER TABLE "CustomizationRequest" ADD COLUMN "inspirationImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
