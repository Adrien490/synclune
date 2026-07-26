-- Retrait du click & collect (right-sizing 2026-07-26).
--
-- Surface entièrement morte : aucune UI ne l'expose (ni storefront ni admin),
-- `StoreSettings.clickAndCollectEnabled` est resté à `false` depuis sa création,
-- et `Cart.fulfillmentType` n'a donc jamais valu autre chose que `SHIPPING`.
-- Le seul writer était l'action `setFulfillmentMode`, injoignable faute de
-- sélecteur de mode dans le tunnel d'achat.
--
-- `docs/BUSINESS.md` liste déjà le click & collect dans les choix de périmètre
-- assumés (« pas de click&collect »). Le code ne le reflétait pas encore.
--
-- À reconstruire avec le reste du flux (calcul de livraison, retrait en
-- boutique, créneaux) si l'activité ouvre un point de vente physique.

ALTER TABLE "Cart" DROP COLUMN IF EXISTS "fulfillmentType";
ALTER TABLE "StoreSettings" DROP COLUMN IF EXISTS "clickAndCollectEnabled";

DROP TYPE IF EXISTS "CartFulfillmentType";
