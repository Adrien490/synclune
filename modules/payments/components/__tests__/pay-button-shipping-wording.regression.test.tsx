/**
 * @regression shipping-unavailable-wording
 *
 * Garantit que les trois surfaces qui signalent l'indisponibilité de la livraison
 * (ShippingMethodSection / PayButton / CheckoutSummary) consomment la même
 * SSOT `SHIPPING_UNAVAILABLE` — incident pré-audit : 3 phrasings divergents
 * pour la même condition.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { SHIPPING_UNAVAILABLE } from "../../constants/shipping-unavailable";

const root = join(__dirname, "..");

describe("shipping-unavailable wording (regression)", () => {
	it("ShippingMethodSection consomme la constante section + contactCta", () => {
		const src = readFileSync(join(root, "shipping-method-section.tsx"), "utf8");
		expect(src).toContain("SHIPPING_UNAVAILABLE.section");
		expect(src).toContain("SHIPPING_UNAVAILABLE.contactCta");
		expect(src).not.toMatch(/Nous ne livrons pas encore dans cette zone\./);
	});

	it("PayButton consomme la constante payButton", () => {
		const src = readFileSync(join(root, "pay-button.tsx"), "utf8");
		expect(src).toContain("SHIPPING_UNAVAILABLE.payButton");
		expect(src).not.toMatch(/Cette zone n'est pas livrable\./);
	});

	it("CheckoutSummary consomme la constante summary", () => {
		const src = readFileSync(join(root, "checkout-summary.tsx"), "utf8");
		expect(src).toContain("SHIPPING_UNAVAILABLE.summary");
		expect(src).not.toMatch(/Sélectionne ton pays/);
	});

	it("toutes les clés de SHIPPING_UNAVAILABLE sont non vides", () => {
		for (const value of Object.values(SHIPPING_UNAVAILABLE)) {
			expect(value).toBeTruthy();
			expect(value.length).toBeGreaterThan(2);
		}
	});
});
