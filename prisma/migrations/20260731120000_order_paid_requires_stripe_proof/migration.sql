-- Filet DB de l'invariant #8 « Pas de vente manuelle / pas de caisse » (2026-07-31)
--
-- CLAUDE.md § Facturation électronique, invariant 8 : aucune commande ne doit
-- devenir payée sans être née d'un checkout Stripe. Une commande PAID sans preuve
-- PSP produit une facture fiscale (Art. 286 / 289-I CGI) sans contrepartie réelle
-- — c'est exactement ce qui fait basculer Synclune dans la qualification
-- « logiciel de caisse » NF 525 non conforme.
--
-- Jusqu'ici l'invariant tenait à 100 % sur l'application (2 writers PAID, tous
-- deux ancrés sur un PaymentIntent) plus un scan statique. Aucun filet ne
-- couvrait le vecteur que le trigger d'unicité des avoirs couvre déjà pour
-- Art. 286 : « les écritures qui CONTOURNENT le lock (SQL manuel, script bugué) ».
-- Ces deux CHECK ferment cet écart.
--
-- Aucune donnée à rétro-corriger : vérifié avant déploiement par la requête de
-- pré-check du runbook (doit retourner 0).

-- Cohérence PAID ↔ paidAt. Adossé à EINV-SEQ-008 : `persistInvoiceNumber` refuse
-- une commande dont `paidAt` est NULL **et** le statut n'est pas PAID. Sans ce
-- CHECK, l'état (PAID, paidAt NULL) passerait cette garde par la seconde branche
-- de la disjonction tout en étant comptablement indatable.
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_paid_requires_paidAt";
ALTER TABLE "Order" ADD CONSTRAINT "Order_paid_requires_paidAt"
  CHECK ("paymentStatus" <> 'PAID' OR "paidAt" IS NOT NULL);

-- Preuve Stripe obligatoire sur toute commande payée.
--
-- ⚠️ L'échappatoire `piiPurgedAt` est STRUCTURELLE, pas une commodité.
-- `ORDER_PII_SCRUB` (modules/orders/constants/pii-scrub.ts) nulle
-- `stripePaymentIntentId` — identifiant pseudonyme rattachable à une personne via
-- Stripe — sur des lignes qui restent `paymentStatus = 'PAID'` (la ligne
-- comptable survit à la purge, seule la PII part). Sans cette troisième branche,
-- `hard-delete-retention` échouerait à `paidAt + 10 ans`, c'est-à-dire des années
-- après le déploiement, sur un cron : la panne serait découverte tard et loin de
-- sa cause.
--
-- C'est sûr parce que le scrub et le marqueur sont écrits dans le MÊME
-- `updateMany` (hard-delete-retention.service.ts, `data: { ...ORDER_PII_SCRUB,
-- piiPurgedAt: new Date() }`) : un CHECK est évalué par ligne APRÈS l'instruction,
-- jamais entre deux colonnes d'un même UPDATE. Toute future purge qui séparerait
-- les deux écritures casserait ici — et devrait le faire.
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_paid_requires_stripe_proof";
ALTER TABLE "Order" ADD CONSTRAINT "Order_paid_requires_stripe_proof"
  CHECK (
    "paymentStatus" <> 'PAID'
    OR "stripePaymentIntentId" IS NOT NULL
    OR "piiPurgedAt" IS NOT NULL
  );
