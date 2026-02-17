import { describe, it, expect } from "vitest";

import {
	getTrackingUrl,
	detectCarrierAndUrl,
} from "../carrier-detection.service";

// ============================================================================
// getTrackingUrl
// ============================================================================

describe("getTrackingUrl", () => {
	it("should return La Poste URL for colissimo", () => {
		const url = getTrackingUrl("colissimo", "8N12345678901");
		expect(url).toBe(
			"https://www.laposte.fr/outils/suivre-vos-envois?code=8N12345678901"
		);
	});

	it("should return La Poste URL for lettre_suivie", () => {
		const url = getTrackingUrl("lettre_suivie", "1L12345678901");
		expect(url).toBe(
			"https://www.laposte.fr/outils/suivre-vos-envois?code=1L12345678901"
		);
	});

	it("should return Chronopost URL", () => {
		const url = getTrackingUrl("chronopost", "XY123456789FR");
		expect(url).toBe(
			"https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=XY123456789FR"
		);
	});

	it("should return Mondial Relay URL", () => {
		const url = getTrackingUrl("mondial_relay", "12345678");
		expect(url).toBe(
			"https://www.mondialrelay.fr/suivi-de-colis?numeroExpedition=12345678"
		);
	});

	it("should return DPD URL", () => {
		const url = getTrackingUrl("dpd", "12345678901234");
		expect(url).toBe("https://trace.dpd.fr/fr/trace/12345678901234");
	});

	it("should return null for 'autre' carrier", () => {
		expect(getTrackingUrl("autre", "UNKNOWN123")).toBeNull();
	});

	it("should trim whitespace from tracking number", () => {
		const url = getTrackingUrl("colissimo", "  8N12345678901  ");
		expect(url).toBe(
			"https://www.laposte.fr/outils/suivre-vos-envois?code=8N12345678901"
		);
	});
});

// ============================================================================
// detectCarrierAndUrl
// ============================================================================

describe("detectCarrierAndUrl", () => {
	describe("Chronopost detection", () => {
		it("should detect Chronopost format (2 letters + 9 digits + 2 letters)", () => {
			const result = detectCarrierAndUrl("XY123456789FR");
			expect(result.carrier).toBe("chronopost");
			expect(result.label).toBe("Chronopost");
			expect(result.url).toContain("chronopost.fr");
		});

		it("should detect Chronopost with lowercase input", () => {
			const result = detectCarrierAndUrl("xy123456789fr");
			expect(result.carrier).toBe("chronopost");
		});
	});

	describe("Colissimo detection", () => {
		const colissimoPrefixes = ["8N", "9V", "6A", "6M", "5K", "5W", "7Q", "8P"];

		for (const prefix of colissimoPrefixes) {
			it(`should detect Colissimo with prefix ${prefix}`, () => {
				const tracking = `${prefix}12345678901`;
				const result = detectCarrierAndUrl(tracking);
				expect(result.carrier).toBe("colissimo");
				expect(result.label).toBe("Colissimo");
				expect(result.url).toContain("laposte.fr");
			});
		}
	});

	describe("Lettre Suivie detection", () => {
		const lettreSuiviePrefixes = ["1H", "1K", "1L", "2L", "3C"];

		for (const prefix of lettreSuiviePrefixes) {
			it(`should detect Lettre Suivie with prefix ${prefix}`, () => {
				const tracking = `${prefix}12345678901`;
				const result = detectCarrierAndUrl(tracking);
				expect(result.carrier).toBe("lettre_suivie");
				expect(result.label).toBe("Lettre Suivie");
				expect(result.url).toContain("laposte.fr");
			});
		}
	});

	describe("Mondial Relay detection", () => {
		it("should detect 8-digit Mondial Relay number", () => {
			const result = detectCarrierAndUrl("12345678");
			expect(result.carrier).toBe("mondial_relay");
			expect(result.label).toBe("Mondial Relay");
			expect(result.url).toContain("mondialrelay.fr");
		});

		it("should detect 10-digit Mondial Relay number", () => {
			const result = detectCarrierAndUrl("1234567890");
			expect(result.carrier).toBe("mondial_relay");
		});

		it("should detect 12-digit Mondial Relay number", () => {
			const result = detectCarrierAndUrl("123456789012");
			expect(result.carrier).toBe("mondial_relay");
		});
	});

	describe("DPD detection", () => {
		it("should detect 14-digit DPD number", () => {
			const result = detectCarrierAndUrl("12345678901234");
			expect(result.carrier).toBe("dpd");
			expect(result.label).toBe("DPD");
			expect(result.url).toContain("dpd.fr");
		});
	});

	describe("Unknown carrier", () => {
		it("should return 'autre' for unrecognized format", () => {
			const result = detectCarrierAndUrl("UNKNOWN_FORMAT");
			expect(result.carrier).toBe("autre");
			expect(result.label).toBe("Autre transporteur");
			expect(result.url).toBeNull();
		});

		it("should return 'autre' for empty string", () => {
			const result = detectCarrierAndUrl("");
			expect(result.carrier).toBe("autre");
			expect(result.url).toBeNull();
		});

		it("should return 'autre' for whitespace-only string", () => {
			const result = detectCarrierAndUrl("   ");
			expect(result.carrier).toBe("autre");
			expect(result.url).toBeNull();
		});
	});

	describe("Input cleaning", () => {
		it("should strip spaces from tracking number", () => {
			const result = detectCarrierAndUrl("XY 123 456 789 FR");
			expect(result.carrier).toBe("chronopost");
		});

		it("should strip dashes from tracking number", () => {
			const result = detectCarrierAndUrl("XY-123456789-FR");
			expect(result.carrier).toBe("chronopost");
		});

		it("should strip dots from tracking number", () => {
			const result = detectCarrierAndUrl("XY.123456789.FR");
			expect(result.carrier).toBe("chronopost");
		});

		it("should handle mixed separators", () => {
			const result = detectCarrierAndUrl("8N-123.456 78901");
			expect(result.carrier).toBe("colissimo");
		});
	});
});
