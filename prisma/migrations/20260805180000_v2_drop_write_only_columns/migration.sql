-- Audit du module `orders` (2026-08-05) — colonnes, index et valeurs d'enum sans
-- AUCUN lecteur applicatif.
--
-- Les trois retraits n'ont rien en commun sinon leur critère d'admission : un
-- inventaire champ par champ des 4 modèles du domaine commandes, où chacun s'est
-- révélé écrit et jamais lu. Aucun changement de comportement attendu.
--
--
-- 1. `OrderHistory.authorId` — ~35 écrivains, ZÉRO lecteur.
--
-- La colonne n'apparaissait dans aucun `select`, aucun `where`, aucun composant :
-- elle était écrite par les 14 actions de commande, les services de facture et
-- d'avoir, les handlers de webhook et les tâches de réconciliation, puis jamais
-- relue. Sur une boutique à opératrice unique, elle valait de toute façon
-- toujours la même chose (l'id de Léane) ou la constante `SYSTEM_AUTHOR_ID`.
--
-- ⚠️ L'identité de l'auteur N'EST PAS perdue : `authorName` (affiché dans la
-- timeline admin) et `source` (badge Admin / Stripe / Client / Système) restent.
-- C'est `authorName` que la garde RGPD `order-history-no-customer-pii` protège —
-- un audit `source: CUSTOMER` doit y porter le libellé neutre « Client », jamais
-- le nom de la cliente, puisque la ligne survit 10 ans (Art. L123-22).
--
-- L'index `OrderHistory_authorId_idx` avait déjà été retiré à l'audit V1 ; il ne
-- reste donc que la colonne à faire tomber.
--
--
-- 2. `OrderItem.productId` — sélectionné 3 fois, lu 0 fois, et indexé.
--
-- Trois selects la chargeaient (admin, client, suivi de commande) et le type de
-- `order-items-list.tsx` la déclarait, mais aucun corps de fonction ne la
-- référençait. Les `productId` réellement utilisés par les chemins de restock
-- viennent d'ailleurs : du `RETURNING` SQL sur `ProductSku`.
--
-- C'était en outre un POINTEUR VIVANT dans une table de snapshot, contraire à
-- l'invariant « snapshots OrderItem figés au checkout » : les colonnes
-- `productTitle` / `productDescription` / `productImageUrl` portent déjà tout ce
-- que la commande doit conserver d'un produit, précisément pour survivre à sa
-- modification comme à sa suppression.
--
-- ⚠️ UN lecteur existait, que le grep avait manqué parce qu'il passait par la
-- forme abrégée `where: { productId }` : le compteur informatif de
-- `toggle-product-status.ts` (« Ce produit a N commandes associées »). Il a été
-- réécrit en `where: { sku: { productId } }`, ce qui est STRICTEMENT plus fiable
-- — `OrderItem.skuId` est en `onDelete: Restrict`, donc le SKU existe toujours,
-- là où l'ancien pointeur nullable en `SetNull` comptait 0 dès qu'il était
-- détaché. C'est le compilateur qui l'a trouvé (`OrderItemWhereInput`), pas le
-- grep : d'où le contract test `read-queries-schema-validity`.
--
--
-- 3. `PaymentMethod` — 3 valeurs mécaniquement inatteignables.
--
-- Le checkout déclare `payment_method_types: ["card"]`
-- (`initialize-payment.ts`) : Stripe ne peut pas produire `sepa_debit`,
-- `klarna` ni `bancontact`. La table de mapping les prévoyait au titre du mode de
-- règlement e-reporting DGFiP (arrêté 2022-1299 §4.3) — sauf que l'e-reporting a
-- été retiré du code, que le PDF facture n'imprime pas ce champ, et qu'aucun
-- export structuré n'existe : la valeur ne sort jamais du snapshot JSON.
--
-- `WALLET` et `LINK` sont CONSERVÉS et ne sont pas des moyens de paiement
-- alternatifs : ce sont des portefeuilles rendus SUR une carte, lus dans
-- `payment_method_details.card.wallet.type` — donc bien atteignables en card-only.
--
-- Postgres ne sait pas retirer une valeur d'un enum : on recrée le type. Le
-- `USING` est un cast direct, sans table de correspondance, parce qu'aucune ligne
-- ne peut porter une des trois valeurs retirées (elles n'ont jamais été
-- atteignables). Le garde-fou est le CHECK temporaire ci-dessous : si une ligne
-- en portait une malgré tout, la migration échoue AVANT de détruire l'ancien type,
-- plutôt que de faire tomber la commande sur un cast invalide.

-- 1. OrderHistory.authorId
ALTER TABLE "OrderHistory" DROP COLUMN "authorId";

-- 2. OrderItem.productId (+ son index et sa FK vers Product)
DROP INDEX "OrderItem_productId_idx";
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";
ALTER TABLE "OrderItem" DROP COLUMN "productId";

-- 3. PaymentMethod : CARD | LINK | WALLET | OTHER
DO $$
DECLARE
  offenders bigint;
BEGIN
  SELECT count(*) INTO offenders
  FROM "Order"
  WHERE "paymentMethod"::text IN ('SEPA_DEBIT', 'KLARNA', 'BANCONTACT');

  IF offenders > 0 THEN
    RAISE EXCEPTION
      'Migration refusée : % commande(s) portent un PaymentMethod retiré (SEPA_DEBIT/KLARNA/BANCONTACT). Les remapper sur OTHER avant de rejouer.',
      offenders;
  END IF;
END $$;

CREATE TYPE "PaymentMethod_new" AS ENUM ('CARD', 'LINK', 'WALLET', 'OTHER');

ALTER TABLE "Order"
  ALTER COLUMN "paymentMethod" DROP DEFAULT,
  ALTER COLUMN "paymentMethod" TYPE "PaymentMethod_new"
    USING ("paymentMethod"::text::"PaymentMethod_new"),
  ALTER COLUMN "paymentMethod" SET DEFAULT 'CARD';

DROP TYPE "PaymentMethod";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";

-- 4. Refund : index sans requête.
--
-- Aucune requête ne filtre sur une VALEUR de `stripeRefundId` conjointement à
-- `status`. Les lookups par id Stripe passent par la contrainte UNIQUE, et les
-- deux requêtes qui combinent les colonnes (`reconcile-refunds`) ne testent
-- qu'une NULLITÉ — la sélectivité vient de `status`, déjà couvert en préfixe par
-- `[status, processedAt]`, conservé.
DROP INDEX "Refund_status_stripeRefundId_idx";
