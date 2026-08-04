-- Dégraissage du modèle `Order` : 16 colonnes retirées sur 79.
--
-- Trois familles, toutes vérifiées writer PAR writer et lecteur PAR lecteur
-- (audit champ par champ du 2026-08-04) :
--
--  1. Écrites et jamais relues : `stripeCustomerId` (aucun lecteur — les liens
--     profonds Stripe passent tous par le PaymentIntent), `taxAmount` (littéral
--     0 : franchise en base Art. 293 B, déjà exclue de `Order_total_formula` et
--     ignorée par `buildInvoiceData` qui recalcule depuis les lignes),
--     `invoiceArchivedAt` (un writer, zéro lecteur), et les trois
--     `paymentFailure*` (le motif de refus vit désormais dans le log et dans
--     `OrderHistory.metadata` côté chemin terminal ; le dashboard Stripe en
--     reste la source autoritaire).
--
--  2. Structurellement inatteignables : les neuf `billing*`. Leur seul writer
--     était une action admin qui se verrouille dès `invoiceNumber != NULL`, or
--     le numéro de facture est posé dans les secondes suivant le paiement
--     (webhook `payment_intent.succeeded`). Sur une commande réelle elles
--     restaient NULL à jamais, et `buildBillingAddress` retombait déjà à 100 %
--     sur l'adresse de livraison — c'est bien elle qu'imprime le PDF sous
--     « Facturé à ». En B2C de vente à distance les deux adresses coïncident.
--     ⚠️ Réouverture datée : si les commandes CADEAU (livrées à un tiers)
--     cessent d'être marginales, ou au plus tard pour l'obligation d'émission
--     et d'e-reporting B2C du 1er septembre 2027, il faudra capter l'adresse de
--     l'acheteuse AU CHECKOUT — l'art. 242 nonies A ann. II CGI demande son
--     adresse (1°) ET l'adresse de livraison si elle diffère (7° bis), et en
--     format structuré ce sont deux blocs distincts (BT-75→79).
--
--  3. `customerPhone` : jamais écrite au checkout (absente du `create`). Le
--     téléphone du client vit dans `shippingPhone`, obligatoire et capté au
--     checkout ; il devient éditable via le formulaire d'adresse de livraison.
--
-- Deux index partent avec elles : `Order_stripeCustomerId_idx` (aucune requête
-- ne filtre sur cette colonne) et l'index composite sur `invoiceArchivedAt`,
-- remplacé par un index sur la seule colonne réellement filtrée.

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_taxAmount_non_negative";

DROP INDEX IF EXISTS "Order_stripeCustomerId_idx";
-- Nom RÉEL en base, hérité du `map:` (l'index portait un nom qui ne décrivait
-- plus ses colonnes). Le viser par le nom que Prisma déduirait ferait un no-op
-- silencieux.
DROP INDEX IF EXISTS "Order_invoiceStatus_invoicePdfUrl_idx";
CREATE INDEX "Order_invoiceStatus_idx" ON "Order"("invoiceStatus");

ALTER TABLE "Order"
  DROP COLUMN "stripeCustomerId",
  DROP COLUMN "customerPhone",
  DROP COLUMN "taxAmount",
  DROP COLUMN "paymentFailureCode",
  DROP COLUMN "paymentDeclineCode",
  DROP COLUMN "paymentFailureMessage",
  DROP COLUMN "invoiceArchivedAt",
  DROP COLUMN "billingSameAsShipping",
  DROP COLUMN "billingFirstName",
  DROP COLUMN "billingLastName",
  DROP COLUMN "billingAddress1",
  DROP COLUMN "billingAddress2",
  DROP COLUMN "billingPostalCode",
  DROP COLUMN "billingCity",
  DROP COLUMN "billingCountry",
  DROP COLUMN "billingPhone";
