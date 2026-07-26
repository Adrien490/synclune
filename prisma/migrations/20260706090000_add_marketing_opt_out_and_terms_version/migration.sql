-- Audit RGPD 2026-07-06 — remédiation P1-1 + P1-3.
-- termsVersion : version des CGV/politique acceptée (accountability Art. 7 RGPD) ;
--   posée à l'inscription email et via le bandeau d'acceptation OAuth. NULL pour
--   les comptes existants (acceptation antérieure non versionnée).
-- marketingOptOutAt : opposition marketing (Art. 21(3) RGPD), posée par l'endpoint
--   /notifications/desinscription ; filtre les envois back-in-stock + review-request.

ALTER TABLE "User" ADD COLUMN "termsVersion" VARCHAR(20);

ALTER TABLE "User" ADD COLUMN "marketingOptOutAt" TIMESTAMP(3);
