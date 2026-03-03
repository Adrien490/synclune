import { describe, it, expect } from "vitest";

vi.mock("../services/carrier-detection.service", () => ({
	getTrackingUrl: vi.fn(),
	detectCarrierAndUrl: vi.fn(),
}));

import { vi } from "vitest";
import { CARRIERS, getCarrierLabel } from "../carrier.utils";

// ============================================================================
// CARRIERS constant
// ============================================================================

describe("CARRIERS", () => {
	it("has 11 entries", () => {
		expect(CARRIERS).toHaveLength(11);
	});

	it("contains all expected carriers", () => {
		const values = CARRIERS.map((c) => c.value);
		expect(values).toContain("colissimo");
		expect(values).toContain("lettre_suivie");
		expect(values).toContain("mondial_relay");
		expect(values).toContain("chronopost");
		expect(values).toContain("dpd");
		expect(values).toContain("gls");
		expect(values).toContain("dhl");
		expect(values).toContain("ups");
		expect(values).toContain("fedex");
		expect(values).toContain("relais_colis");
		expect(values).toContain("autre");
	});
});

// ============================================================================
// getCarrierLabel
// ============================================================================

describe("getCarrierLabel", () => {
	it("returns 'Colissimo' for colissimo", () => {
		expect(getCarrierLabel("colissimo" as never)).toBe("Colissimo");
	});

	it("returns 'Lettre Suivie' for lettre_suivie", () => {
		expect(getCarrierLabel("lettre_suivie" as never)).toBe("Lettre Suivie");
	});

	it("returns 'Mondial Relay' for mondial_relay", () => {
		expect(getCarrierLabel("mondial_relay" as never)).toBe("Mondial Relay");
	});

	it("returns 'FedEx' for fedex", () => {
		expect(getCarrierLabel("fedex" as never)).toBe("FedEx");
	});

	it("returns 'Autre transporteur' for unknown carrier", () => {
		expect(getCarrierLabel("unknown_carrier" as never)).toBe("Autre transporteur");
	});

	it("returns 'Autre transporteur' for autre", () => {
		expect(getCarrierLabel("autre" as never)).toBe("Autre transporteur");
	});
});
