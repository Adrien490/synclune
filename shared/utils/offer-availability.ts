import { ORDERS_AVAILABLE } from "@/shared/constants/orders-availability";
import { EXTERNAL_URLS } from "@/shared/constants/urls";

/**
 * Availability schema.org d'une Offer JSON-LD, gatée par ORDERS_AVAILABLE.
 *
 * Pré-lancement (`ORDERS_AVAILABLE === false`), le catalogue est visible mais
 * rien n'est achetable : annoncer InStock aux crawlers (rich snippets, Google
 * Merchant) serait mensonger. Tout est déclaré OutOfStock ; comportement
 * auto-corrigé au go-live quand le flag passe à `true`.
 *
 * SSOT — toute Offer/AggregateOffer JSON-LD doit dériver son `availability`
 * d'ici, jamais d'un ternaire stock-only local.
 */
export function getOfferAvailability(inStock: boolean): string {
	if (!ORDERS_AVAILABLE) return EXTERNAL_URLS.SCHEMA_ORG.OUT_OF_STOCK;
	return inStock ? EXTERNAL_URLS.SCHEMA_ORG.IN_STOCK : EXTERNAL_URLS.SCHEMA_ORG.OUT_OF_STOCK;
}
