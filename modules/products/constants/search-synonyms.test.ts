import { describe, expect, it } from "vitest"

import { SEARCH_SYNONYMS } from "./search-synonyms"

describe("SEARCH_SYNONYMS", () => {
	it("is a Map with entries", () => {
		expect(SEARCH_SYNONYMS).toBeInstanceOf(Map)
		expect(SEARCH_SYNONYMS.size).toBeGreaterThan(0)
	})

	describe("bidirectionality", () => {
		it("maps bague -> anneau and anneau -> bague", () => {
			expect(SEARCH_SYNONYMS.get("bague")).toContain("anneau")
			expect(SEARCH_SYNONYMS.get("anneau")).toContain("bague")
		})

		it("maps collier -> pendentif and pendentif -> collier", () => {
			expect(SEARCH_SYNONYMS.get("collier")).toContain("pendentif")
			expect(SEARCH_SYNONYMS.get("pendentif")).toContain("collier")
		})

		it("maps boheme -> boho and boho -> boheme", () => {
			expect(SEARCH_SYNONYMS.get("boheme")).toContain("boho")
			expect(SEARCH_SYNONYMS.get("boho")).toContain("boheme")
		})
	})

	describe("no self-reference", () => {
		it("does not include the key in its own synonym list", () => {
			for (const [key, synonyms] of SEARCH_SYNONYMS) {
				expect(synonyms).not.toContain(key)
			}
		})
	})

	describe("case normalization", () => {
		it("stores all keys as lowercase", () => {
			for (const key of SEARCH_SYNONYMS.keys()) {
				expect(key).toBe(key.toLowerCase())
			}
		})

		it("stores all synonyms as lowercase", () => {
			for (const synonyms of SEARCH_SYNONYMS.values()) {
				for (const synonym of synonyms) {
					expect(synonym).toBe(synonym.toLowerCase())
				}
			}
		})
	})

	describe("no duplicates within synonym lists", () => {
		it("has unique entries in each synonym list", () => {
			for (const [key, synonyms] of SEARCH_SYNONYMS) {
				const unique = [...new Set(synonyms)]
				expect(synonyms).toHaveLength(unique.length)
			}
		})
	})

	describe("group completeness", () => {
		it("includes all ring synonyms", () => {
			const ringTerms = ["bague", "anneau", "alliance", "chevaliere"]
			for (const term of ringTerms) {
				expect(SEARCH_SYNONYMS.has(term)).toBe(true)
				const synonyms = SEARCH_SYNONYMS.get(term)!
				const expectedSynonyms = ringTerms.filter((t) => t !== term)
				for (const expected of expectedSynonyms) {
					expect(synonyms).toContain(expected)
				}
			}
		})

		it("includes all earring synonyms without multi-word entries", () => {
			const earringTerms = ["boucle", "boucles", "clou", "creole", "creoles", "dormeuse", "dormeuses"]
			for (const term of earringTerms) {
				expect(SEARCH_SYNONYMS.has(term)).toBe(true)
			}
		})
	})

	describe("single-word entries only", () => {
		it("has no multi-word keys", () => {
			for (const key of SEARCH_SYNONYMS.keys()) {
				expect(key).not.toMatch(/\s/)
			}
		})

		it("has no multi-word synonyms", () => {
			for (const synonyms of SEARCH_SYNONYMS.values()) {
				for (const synonym of synonyms) {
					expect(synonym).not.toMatch(/\s/)
				}
			}
		})
	})
})
