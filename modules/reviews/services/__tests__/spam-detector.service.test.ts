import { describe, it, expect } from "vitest";
import { detectReviewSpam } from "../spam-detector.service";

describe("detectReviewSpam", () => {
	// ============================================================================
	// HAPPY PATH
	// ============================================================================

	it("returns isSpam=false for normal review content", () => {
		const result = detectReviewSpam({
			title: "Très belle qualité",
			content: "Bijou délicat et bien fini, je recommande l'achat sur Synclune.",
		});

		expect(result.isSpam).toBe(false);
		expect(result.reasons).toEqual([]);
	});

	it("accepts a Synclune URL (allowed domain)", () => {
		const result = detectReviewSpam({
			content: "Voir aussi https://www.synclune.fr/creations pour d'autres pièces.",
		});

		expect(result.isSpam).toBe(false);
	});

	// ============================================================================
	// EXTERNAL URL
	// ============================================================================

	it("flags external URL", () => {
		const result = detectReviewSpam({
			content: "Visitez https://my-jewelry-shop.com pour des prix bas !",
		});

		expect(result.isSpam).toBe(true);
		expect(result.reasons).toContain("external_url");
	});

	// ============================================================================
	// PHONE NUMBERS
	// ============================================================================

	it("flags French phone number", () => {
		const result = detectReviewSpam({
			content: "Contactez moi au 06 12 34 56 78 pour plus d'infos.",
		});

		expect(result.isSpam).toBe(true);
		expect(result.reasons).toContain("phone_number");
	});

	it("flags E.164 international phone", () => {
		const result = detectReviewSpam({
			content: "Mon numéro WhatsApp : +33 6 12 34 56 78",
		});

		expect(result.isSpam).toBe(true);
		expect(result.reasons).toContain("phone_number");
	});

	// ============================================================================
	// BLACKLISTED KEYWORDS
	// ============================================================================

	it("flags crypto/trading scam keyword", () => {
		const result = detectReviewSpam({
			content: "Investissement garanti dans le bitcoin, écrivez-moi !",
		});

		expect(result.isSpam).toBe(true);
		expect(result.reasons).toContain("blacklisted_keyword");
	});

	it("flags competitor abuse keyword", () => {
		const result = detectReviewSpam({
			content: "Trouvez mieux que Synclune ailleurs.",
		});

		// "meilleur que" requires literal match
		const result2 = detectReviewSpam({
			content: "Pas mal, mais on trouve meilleur que ce qu'ils vendent.",
		});

		expect(result.isSpam).toBe(false); // "trouvez mieux que" not in blacklist (only "meilleur que")
		expect(result2.isSpam).toBe(true);
		expect(result2.reasons).toContain("blacklisted_keyword");
	});

	// ============================================================================
	// EXCESSIVE CAPS / REPEATED CHARS
	// ============================================================================

	it("flags excessive caps (> 60% on content > 20 chars)", () => {
		const result = detectReviewSpam({
			content: "TROP DECEVANT VRAIMENT TRES MAUVAIS BIJOU",
		});

		expect(result.isSpam).toBe(true);
		expect(result.reasons).toContain("excessive_caps");
	});

	it("does NOT flag occasional caps on short content", () => {
		const result = detectReviewSpam({
			content: "OK super",
		});

		expect(result.isSpam).toBe(false);
	});

	it("flags repeated characters", () => {
		const result = detectReviewSpam({
			content: "Très bien!!!!!!!!! franchement aaaaaaa.",
		});

		expect(result.isSpam).toBe(true);
		expect(result.reasons).toContain("repeated_chars");
	});

	// ============================================================================
	// MULTIPLE REASONS
	// ============================================================================

	it("returns multiple reasons when several patterns match", () => {
		const result = detectReviewSpam({
			content: "GAGNER DE L'ARGENT FACILEMENT !!! Contactez-moi sur https://scam-site.com.",
		});

		expect(result.isSpam).toBe(true);
		expect(result.reasons.length).toBeGreaterThanOrEqual(2);
		expect(result.reasons).toContain("blacklisted_keyword");
		expect(result.reasons).toContain("external_url");
	});

	// ============================================================================
	// TITLE + CONTENT
	// ============================================================================

	it("scans title in addition to content", () => {
		const result = detectReviewSpam({
			title: "VISITEZ MON SITE",
			content: "Contenu normal sans souci.",
		});

		expect(result.isSpam).toBe(true);
		expect(result.reasons).toContain("blacklisted_keyword");
	});

	it("handles null/undefined title gracefully", () => {
		const result = detectReviewSpam({
			title: null,
			content: "Bijou parfait, bonne finition.",
		});

		expect(result.isSpam).toBe(false);
	});
});
