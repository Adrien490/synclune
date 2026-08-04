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


-- Order
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_creditNoteNumber_format_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_creditNoteNumber_format_check" CHECK ("creditNoteNumber" IS NULL OR "creditNoteNumber" ~ '^A-[0-9]{4}-[0-9]{5}$');
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_creditNotePdfHash_format_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_creditNotePdfHash_format_check" CHECK ("creditNotePdfHash" IS NULL OR "creditNotePdfHash" ~ '^[a-f0-9]{64}$');
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_invoiceNumber_format";
ALTER TABLE "Order" ADD CONSTRAINT "Order_invoiceNumber_format" CHECK ("invoiceNumber" IS NULL OR "invoiceNumber" ~ '^F-[0-9]{4}-[0-9]{5}$');
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_invoicePdfHash_format_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_invoicePdfHash_format_check" CHECK ("invoicePdfHash" IS NULL OR "invoicePdfHash" ~ '^[a-f0-9]{64}$');
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_overbilledAmountCents_positive_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_overbilledAmountCents_positive_check" CHECK ("overbilledAmountCents" IS NULL OR "overbilledAmountCents" > 0);
-- Invariant #8 (NF 525) : aucune commande payée sans preuve Stripe.
-- ⚠️ La branche `piiPurgedAt` est structurelle : `ORDER_PII_SCRUB` nulle
-- `stripePaymentIntentId` sur des lignes restées PAID (purge 10 ans). Elle est
-- sûre parce que scrub et marqueur partent dans le MÊME updateMany.
-- Cf. prisma/migrations/20260731120000_order_paid_requires_stripe_proof/.
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_paid_requires_paidAt";
ALTER TABLE "Order" ADD CONSTRAINT "Order_paid_requires_paidAt" CHECK ("paymentStatus" <> 'PAID' OR "paidAt" IS NOT NULL);
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_paid_requires_stripe_proof";
ALTER TABLE "Order" ADD CONSTRAINT "Order_paid_requires_stripe_proof" CHECK ("paymentStatus" <> 'PAID' OR "stripePaymentIntentId" IS NOT NULL OR "piiPurgedAt" IS NOT NULL);
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_shippingCost_non_negative";
ALTER TABLE "Order" ADD CONSTRAINT "Order_shippingCost_non_negative" CHECK ("shippingCost" >= 0);
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_subtotal_non_negative";
ALTER TABLE "Order" ADD CONSTRAINT "Order_subtotal_non_negative" CHECK ("subtotal" >= 0);
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_total_formula";
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_formula" CHECK ("total" = GREATEST(0, "subtotal" + "shippingCost"));
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_total_non_negative";
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_non_negative" CHECK ("total" >= 0);

-- OrderItem
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_price_positive";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_price_positive" CHECK ("price" > 0);
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_quantity_positive";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_positive" CHECK ("quantity" > 0);

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

-- SkuMedia
ALTER TABLE "SkuMedia" DROP CONSTRAINT IF EXISTS "SkuMedia_dimensions_positive";
ALTER TABLE "SkuMedia" ADD CONSTRAINT "SkuMedia_dimensions_positive" CHECK ( ("width" IS NULL OR "width" > 0) AND ("height" IS NULL OR "height" > 0) );

-- StoreSettings
ALTER TABLE "StoreSettings" DROP CONSTRAINT IF EXISTS "StoreSettings_singleton_id";
ALTER TABLE "StoreSettings" ADD CONSTRAINT "StoreSettings_singleton_id" CHECK (id = 'store-settings-singleton');

-- User
-- `email @unique` est un index Postgres SENSIBLE À LA CASSE. Ce CHECK impose que la
-- valeur STOCKÉE soit déjà normalisée, ce qui rend fiables les lookups en comparaison
-- exacte — dont le garde de compte révoqué de `/sign-in/email` (auth.ts), qui
-- minuscule l'entrée puis compare : une ligne en casse mixte le faisait échouer en
-- silence, laissant se connecter un compte suspendu. La normalisation à l'écriture est
-- assurée par `databaseHooks.user.{create,update}.before` (point de passage unique des
-- trois chemins : email/mot de passe, Google, changeEmail).
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_lowercase";
ALTER TABLE "User" ADD CONSTRAINT "User_email_lowercase" CHECK ("email" = lower("email"));

-- Wishlist : plus aucun garde — les tables Wishlist/WishlistItem sont droppées
-- (favoris en cookie, migration 20260803210000_drop_wishlist_tables).


-- ## Index partiels / expression / NULLS NOT DISTINCT
DROP INDEX IF EXISTS "Order_customerEmail_unaccent_trgm_idx";
CREATE INDEX "Order_customerEmail_unaccent_trgm_idx" ON "Order" USING gin (immutable_unaccent("customerEmail") gin_trgm_ops);
DROP INDEX IF EXISTS "Order_customerName_unaccent_trgm_idx";
CREATE INDEX "Order_customerName_unaccent_trgm_idx" ON "Order" USING gin (immutable_unaccent("customerName") gin_trgm_ops);
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
-- Unicité de l'email INSENSIBLE À LA CASSE. Le `@unique` Prisma sur la colonne ne
-- couvre que l'égalité binaire : `Alice@x.com` et `alice@x.com` y passaient comme
-- deux comptes. Index d'EXPRESSION — non exprimable en Prisma, au même titre que les
-- GIN ci-dessous. Complète (et ne remplace pas) `User_email_lowercase`, qui garantit
-- que la valeur stockée est déjà minuscule.
DROP INDEX IF EXISTS "User_email_lower_key";
CREATE UNIQUE INDEX "User_email_lower_key" ON "User" (lower("email"));


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
