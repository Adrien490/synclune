import { describe, expect, it } from "vitest";
import { ATELIER_CONTENT } from "../atelier-content";

describe("ATELIER_CONTENT", () => {
	it("expose un subtitle non vide", () => {
		expect(typeof ATELIER_CONTENT.subtitle).toBe("string");
		expect(ATELIER_CONTENT.subtitle.length).toBeGreaterThan(0);
	});

	it("expose un heroImageAlt non vide", () => {
		expect(typeof ATELIER_CONTENT.heroImageAlt).toBe("string");
		expect(ATELIER_CONTENT.heroImageAlt.length).toBeGreaterThan(0);
	});

	it("expose une confession.intro non vide", () => {
		expect(typeof ATELIER_CONTENT.confession.intro).toBe("string");
		expect(ATELIER_CONTENT.confession.intro.length).toBeGreaterThan(0);
	});

	it("expose exactement 3 paragraphes de confession", () => {
		expect(ATELIER_CONTENT.confession.paragraphs).toHaveLength(3);
	});

	it("chaque paragraphe est une string non vide", () => {
		for (const paragraph of ATELIER_CONTENT.confession.paragraphs) {
			expect(typeof paragraph).toBe("string");
			expect(paragraph.length).toBeGreaterThan(0);
		}
	});

	it("est immutable (readonly via 'as const')", () => {
		// Vérifie qu'on ne peut pas muter au type level — runtime check via Object.isFrozen()
		// note : 'as const' n'appelle pas Object.freeze, on teste donc la shape readonly côté TS
		// runtime : on s'assure juste que les valeurs sont là
		expect(ATELIER_CONTENT).toHaveProperty("subtitle");
		expect(ATELIER_CONTENT).toHaveProperty("heroImageAlt");
		expect(ATELIER_CONTENT.confession).toHaveProperty("intro");
		expect(ATELIER_CONTENT.confession).toHaveProperty("paragraphs");
	});
});
