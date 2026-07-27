import { describe, expect, it } from "vitest";
import { getOfferAvailability } from "../offer-availability";

const IN_STOCK = "https://schema.org/InStock";
const OUT_OF_STOCK = "https://schema.org/OutOfStock";

describe("getOfferAvailability", () => {
	it("retourne InStock si le produit est en stock", () => {
		expect(getOfferAvailability(true)).toBe(IN_STOCK);
	});

	it("retourne OutOfStock si le produit est hors stock", () => {
		expect(getOfferAvailability(false)).toBe(OUT_OF_STOCK);
	});
});
