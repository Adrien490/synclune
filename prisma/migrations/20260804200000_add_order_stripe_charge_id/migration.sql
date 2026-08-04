-- `Order.stripeChargeId` — l'identifiant de Charge Stripe (`PaymentIntent.latest_charge`)
-- figé au moment de l'encaissement.
--
-- Pourquoi il manquait, et pourquoi c'est un défaut et pas un choix : le champ
-- existait déjà de bout en bout côté application — `InvoiceData.payment.stripeChargeId`
-- (`modules/invoices/types/invoice-data.ts`), validé par `invoice.schema.ts` — mais
-- `buildInvoiceData` l'écrivait `null` EN DUR, faute de colonne à lire. Le snapshot
-- `Order.invoiceDataSnapshot` étant figé sous SHA-256 et conservé 10 ans
-- (Art. L102 B LPF), chaque facture émise depuis l'introduction du snapshot porte donc
-- un `stripeChargeId: null` définitif.
--
-- Ce que le PaymentIntent ne remplace pas : le support Stripe et la soumission de
-- preuves de litige (`charge.dispute.*`) raisonnent sur la CHARGE, pas sur le PI. Les
-- handlers de refund manipulaient déjà `charge.id` (`refund-handlers.ts`) sans jamais
-- le persister — l'information transitait puis se perdait.
--
-- UNIQUE, comme `stripePaymentIntentId` et `Refund.stripeRefundId` : une charge
-- appartient à une seule commande. L'index sert aussi le seul vrai chemin de lecture,
-- le support (« Stripe me donne ch_xxx, quelle commande ? »).
--
-- Nullable et SANS backfill : les commandes antérieures restent à NULL, ce qui est
-- exact — l'information n'a jamais été captée pour elles. Un backfill depuis l'API
-- Stripe serait possible mais réécrirait une donnée dans des lignes dont la facture
-- est déjà figée, sans pouvoir corriger le snapshot correspondant (il est sous hash).

ALTER TABLE "Order" ADD COLUMN "stripeChargeId" TEXT;

CREATE UNIQUE INDEX "Order_stripeChargeId_key" ON "Order"("stripeChargeId");
