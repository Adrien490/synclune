import { EXTERNAL_URLS } from "@/shared/constants/urls";

/**
 * Availability schema.org d'une Offer JSON-LD.
 *
 * SSOT — toute Offer/AggregateOffer JSON-LD doit dériver son `availability`
 * d'ici, jamais d'un ternaire stock-only local.
 */
export function getOfferAvailability(inStock: boolean): string {
	return inStock ? EXTERNAL_URLS.SCHEMA_ORG.IN_STOCK : EXTERNAL_URLS.SCHEMA_ORG.OUT_OF_STOCK;
}
