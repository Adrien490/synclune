-- Étend l'enum PaymentMethod pour couvrir les types Stripe utilisés par
-- Synclune (e-reporting B2C Phase 4 / EINV-EREPORT-001). Avant cette
-- migration, toutes les transactions étaient marquées CARD, même les
-- paiements SEPA, Klarna ou wallets — incompatible avec l'arrêté
-- 2022-1299 §4.3 (mode de règlement granulaire transmis à la DGFiP).
--
-- Postgres ≥ 12 supporte ALTER TYPE ... ADD VALUE dans une transaction.
-- Neon = Postgres 17 → OK.

ALTER TYPE "PaymentMethod" ADD VALUE 'SEPA_DEBIT';
ALTER TYPE "PaymentMethod" ADD VALUE 'KLARNA';
ALTER TYPE "PaymentMethod" ADD VALUE 'LINK';
ALTER TYPE "PaymentMethod" ADD VALUE 'WALLET';
ALTER TYPE "PaymentMethod" ADD VALUE 'BANCONTACT';
ALTER TYPE "PaymentMethod" ADD VALUE 'OTHER';
