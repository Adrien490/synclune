import { describe, it, expect } from "vitest";

import { getShippingZoneFromPostalCode } from "../shipping-zone.service";

// ============================================================================
// getShippingZoneFromPostalCode
// ============================================================================

describe("getShippingZoneFromPostalCode", () => {
	describe("METROPOLITAN zone", () => {
		it("should return METROPOLITAN for Paris (75001)", () => {
			const result = getShippingZoneFromPostalCode("75001");
			expect(result.zone).toBe("METROPOLITAN");
			expect(result.department).toBe("75");
		});

		it("should return METROPOLITAN for Lyon (69001)", () => {
			const result = getShippingZoneFromPostalCode("69001");
			expect(result.zone).toBe("METROPOLITAN");
			expect(result.department).toBe("69");
		});

		it("should return METROPOLITAN for Marseille (13001)", () => {
			const result = getShippingZoneFromPostalCode("13001");
			expect(result.zone).toBe("METROPOLITAN");
			expect(result.department).toBe("13");
		});

		it("should return METROPOLITAN for Nord (59000)", () => {
			const result = getShippingZoneFromPostalCode("59000");
			expect(result.zone).toBe("METROPOLITAN");
			expect(result.department).toBe("59");
		});
	});

	describe("CORSE zone", () => {
		it("should return CORSE/2A for Ajaccio (20000) - Corse-du-Sud", () => {
			const result = getShippingZoneFromPostalCode("20000");
			expect(result.zone).toBe("CORSE");
			expect(result.department).toBe("2A");
		});

		it("should return CORSE/2A for postal code 20190 (boundary of 2A)", () => {
			const result = getShippingZoneFromPostalCode("20190");
			expect(result.zone).toBe("CORSE");
			expect(result.department).toBe("2A");
		});

		it("should return CORSE/2B for postal code 20200 (start of Haute-Corse)", () => {
			const result = getShippingZoneFromPostalCode("20200");
			expect(result.zone).toBe("CORSE");
			expect(result.department).toBe("2B");
		});

		it("should return CORSE/2B for Bastia (20600) - Haute-Corse", () => {
			const result = getShippingZoneFromPostalCode("20600");
			expect(result.zone).toBe("CORSE");
			expect(result.department).toBe("2B");
		});
	});

	describe("DOM zone", () => {
		it("should return DOM for Martinique (97200)", () => {
			const result = getShippingZoneFromPostalCode("97200");
			expect(result.zone).toBe("DOM");
			expect(result.department).toBe("972");
		});

		it("should return DOM for Guadeloupe (97100)", () => {
			const result = getShippingZoneFromPostalCode("97100");
			expect(result.zone).toBe("DOM");
			expect(result.department).toBe("971");
		});

		it("should return DOM for La Réunion (97400)", () => {
			const result = getShippingZoneFromPostalCode("97400");
			expect(result.zone).toBe("DOM");
			expect(result.department).toBe("974");
		});
	});

	describe("TOM zone", () => {
		it("should return TOM for department 98x postal codes", () => {
			const result = getShippingZoneFromPostalCode("98700");
			expect(result.zone).toBe("TOM");
			expect(result.department).toBe("987");
		});
	});

	describe("UNKNOWN zone", () => {
		it("should return UNKNOWN for a non-french postal code", () => {
			const result = getShippingZoneFromPostalCode("99000");
			expect(result.zone).toBe("UNKNOWN");
			expect(result.department).toBe("99");
		});

		it("should return UNKNOWN for department 20 not in the list (would be Corse logic)", () => {
			// 20xxx are handled by the Corse logic above, this verifies 96 is unknown
			const result = getShippingZoneFromPostalCode("96000");
			expect(result.zone).toBe("UNKNOWN");
			expect(result.department).toBe("96");
		});
	});
});
