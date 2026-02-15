import { describe, expect, it } from "vitest"

import { matchesWordStart } from "./match-word-start"

describe("matchesWordStart", () => {
	describe("full-text match", () => {
		it("matches when text starts with query", () => {
			expect(matchesWordStart("Oreilles", "or")).toBe(true)
		})

		it("matches when query starts with text (reverse prefix)", () => {
			expect(matchesWordStart("Or", "oreilles")).toBe(true)
		})

		it("matches exact text", () => {
			expect(matchesWordStart("collier", "collier")).toBe(true)
		})
	})

	describe("word-start match", () => {
		it("matches query against word start in multi-word text", () => {
			// Splits on whitespace: ["boucles", "oreilles"] → "oreilles" starts with "or"
			expect(matchesWordStart("Boucles Oreilles", "or")).toBe(true)
		})

		it("does not match query in the middle of a word", () => {
			expect(matchesWordStart("Colorees", "or")).toBe(false)
		})

		it("does not match when query only appears mid-word after apostrophe", () => {
			// Splits on whitespace: ["boucles", "d'oreilles"] → neither starts with "or"
			expect(matchesWordStart("Boucles d'Oreilles", "or")).toBe(false)
		})

		it("matches first word", () => {
			expect(matchesWordStart("Boucles d'Oreilles", "bouc")).toBe(true)
		})
	})

	describe("case insensitivity", () => {
		it("matches regardless of case", () => {
			expect(matchesWordStart("COLLIER", "col")).toBe(true)
		})

		it("matches uppercase query against lowercase text", () => {
			expect(matchesWordStart("collier", "COL")).toBe(true)
		})
	})

	describe("accent handling", () => {
		it("matches unaccented query against accented text", () => {
			expect(matchesWordStart("Créole", "creole")).toBe(true)
		})

		it("matches accented query against accented text", () => {
			expect(matchesWordStart("Créole", "créole")).toBe(true)
		})

		it("matches accented query against unaccented text", () => {
			expect(matchesWordStart("Creole", "créo")).toBe(true)
		})

		it("matches across accented multi-word text", () => {
			expect(matchesWordStart("Boucles d'Oreilles Créoles", "creo")).toBe(true)
		})

		it("handles é/è/ê normalization", () => {
			expect(matchesWordStart("Émeraude", "emeraude")).toBe(true)
		})

		it("handles î normalization", () => {
			expect(matchesWordStart("Chaîne", "chaine")).toBe(true)
		})
	})

	describe("edge cases", () => {
		it("matches empty query (everything starts with empty string)", () => {
			expect(matchesWordStart("Collier", "")).toBe(true)
		})

		it("matches empty text when query starts with it (reverse prefix)", () => {
			// "collier".startsWith("") is true by JS spec
			expect(matchesWordStart("", "collier")).toBe(true)
		})

		it("handles single character query", () => {
			expect(matchesWordStart("Collier", "c")).toBe(true)
		})

		it("handles apostrophes in text", () => {
			expect(matchesWordStart("Boucles d'oreilles", "d'or")).toBe(true)
		})
	})
})
