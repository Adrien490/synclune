/**
 * @regression offer-availability-prelaunch-gating
 *
 * Verrouille le gating pré-lancement de l'availability schema.org des Offer
 * JSON-LD : tant que `ORDERS_AVAILABLE === false`, `getOfferAvailability`
 * doit retourner OutOfStock quel que soit le stock réel (annoncer InStock
 * aux crawlers alors que rien n'est achetable serait mensonger), puis
 * revenir au comportement stock-driven normal au go-live (flag `true`).
 *
 * `ORDERS_AVAILABLE` étant importé statiquement par la source, chaque cas
 * utilise `vi.resetModules()` + `vi.doMock()` + import dynamique pour
 * contrôler la valeur du flag.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const IN_STOCK = "https://schema.org/InStock";
const OUT_OF_STOCK = "https://schema.org/OutOfStock";

async function importWithFlag(ordersAvailable: boolean) {
	vi.doMock("@/shared/constants/orders-availability", () => ({
		ORDERS_AVAILABLE: ordersAvailable,
	}));
	const { getOfferAvailability } = await import("../offer-availability");
	return getOfferAvailability;
}

beforeEach(() => {
	vi.resetModules();
});

afterEach(() => {
	vi.doUnmock("@/shared/constants/orders-availability");
});

describe("getOfferAvailability — pré-lancement (ORDERS_AVAILABLE = false)", () => {
	it("retourne OutOfStock même si le produit est en stock", async () => {
		const getOfferAvailability = await importWithFlag(false);

		expect(getOfferAvailability(true)).toBe(OUT_OF_STOCK);
	});

	it("retourne OutOfStock si le produit est hors stock", async () => {
		const getOfferAvailability = await importWithFlag(false);

		expect(getOfferAvailability(false)).toBe(OUT_OF_STOCK);
	});
});

describe("getOfferAvailability — go-live (ORDERS_AVAILABLE = true)", () => {
	it("retourne InStock si le produit est en stock", async () => {
		const getOfferAvailability = await importWithFlag(true);

		expect(getOfferAvailability(true)).toBe(IN_STOCK);
	});

	it("retourne OutOfStock si le produit est hors stock", async () => {
		const getOfferAvailability = await importWithFlag(true);

		expect(getOfferAvailability(false)).toBe(OUT_OF_STOCK);
	});
});
