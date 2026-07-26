-- Drop newsletter module (cf audit 2026-05-02 : sur-dimensionné pour 20-30 cmd/mois).
-- NewsletterSubscriber + enum NewsletterStatus + Order.newsletterOptIn supprimés.

-- 1. Drop FK NewsletterSubscriber → User
ALTER TABLE IF EXISTS "NewsletterSubscriber" DROP CONSTRAINT IF EXISTS "NewsletterSubscriber_userId_fkey";

-- 2. Drop NewsletterSubscriber table
DROP TABLE IF EXISTS "NewsletterSubscriber" CASCADE;

-- 3. Drop NewsletterStatus enum
DROP TYPE IF EXISTS "NewsletterStatus";

-- 4. Drop Order.newsletterOptIn column
ALTER TABLE IF EXISTS "Order" DROP COLUMN IF EXISTS "newsletterOptIn";
