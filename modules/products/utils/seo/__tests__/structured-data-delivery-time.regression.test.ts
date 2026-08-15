/**
 * @regression structured-data-delivery-time-ssot
 *
 * Le nœud `OfferShippingDetails` du JSON-LD produit est une allégation
 * commerciale lue par Google : chaque valeur DOIT dériver des SSOT livraison.
 * Avant le 2026-08-15, `deliveryTime` codait `handlingTime 2-3` en littéral
 * quand `PREPARATION_BUSINESS_DAYS` dit 2-4 — Google affichait une promesse
 * plus courte que les CGV, la dérive exacte que le commentaire du même bloc
 * dénonçait (et avait déjà corrigée pour `shippingRate` et `returnFees`).
 *
 * Ce test échoue si un littéral remplace à nouveau une dérivation : changer le
 * délai de préparation ou le barème FR doit se refléter ici sans autre édition.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

import {
	PREPARATION_BUSINESS_DAYS,
	SHIPPING_RATES,
} from "@/modules/orders/constants/shipping-rates";
import { parseEstimatedDays } from "@/modules/orders/services/shipping.service";
import { buildOfferShippingDetails } from "../generate-structured-data";

describe("buildOfferShippingDetails — dérivation SSOT", () => {
	const details = buildOfferShippingDetails();

	it("handlingTime = PREPARATION_BUSINESS_DAYS (préparation atelier)", () => {
		expect(details.deliveryTime.handlingTime.minValue).toBe(PREPARATION_BUSINESS_DAYS[0]);
		expect(details.deliveryTime.handlingTime.maxValue).toBe(PREPARATION_BUSINESS_DAYS[1]);
	});

	it("transitTime = délai transport du barème FR", () => {
		const [transitMin, transitMax] = parseEstimatedDays(SHIPPING_RATES.FR.estimatedDays);
		expect(details.deliveryTime.transitTime.minValue).toBe(transitMin);
		expect(details.deliveryTime.transitTime.maxValue).toBe(transitMax);
	});

	it("shippingRate = tarif FR de SHIPPING_RATES, en euros", () => {
		expect(details.shippingRate.value).toBe((SHIPPING_RATES.FR.amount / 100).toFixed(2));
		expect(details.shippingRate.currency).toBe("EUR");
	});
});
