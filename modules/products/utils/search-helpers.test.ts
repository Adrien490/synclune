import { describe, expect, it } from "vitest"

import { escapeLikePattern, splitSearchTerms } from "./search-helpers"
import { FUZZY_MAX_WORDS, MAX_SEARCH_LENGTH } from "../constants/search.constants"

// ─── escapeLikePattern ──────────────────────────────────────────

describe("escapeLikePattern", () => {
	it("returns unchanged string when no special characters", () => {
		expect(escapeLikePattern("bague")).toBe("bague")
	})

	it("escapes percent sign", () => {
		expect(escapeLikePattern("100%")).toBe("100\\%")
	})

	it("escapes underscore", () => {
		expect(escapeLikePattern("_test")).toBe("\\_test")
	})

	it("escapes backslash", () => {
		expect(escapeLikePattern("path\\to")).toBe("path\\\\to")
	})

	it("escapes multiple special characters", () => {
		expect(escapeLikePattern("%_\\")).toBe("\\%\\_\\\\")
	})

	it("handles empty string", () => {
		expect(escapeLikePattern("")).toBe("")
	})

	it("preserves other special characters", () => {
		expect(escapeLikePattern("bague+or (rose)")).toBe("bague+or (rose)")
	})

	it("escapes percent in the middle of text", () => {
		expect(escapeLikePattern("50% off")).toBe("50\\% off")
	})
})

describe("splitSearchTerms", () => {
	it("splits a simple multi-word query", () => {
		expect(splitSearchTerms("boucles oreilles")).toEqual(["boucles", "oreilles"])
	})

	it("returns a single word for a single-word query", () => {
		expect(splitSearchTerms("collier")).toEqual(["collier"])
	})

	it("trims leading and trailing whitespace", () => {
		expect(splitSearchTerms("  bague  ")).toEqual(["bague"])
	})

	it("handles multiple spaces between words", () => {
		expect(splitSearchTerms("boucles   oreilles   argent")).toEqual([
			"boucles",
			"oreilles",
			"argent",
		])
	})

	it("deduplicates words case-insensitively", () => {
		expect(splitSearchTerms("Or or OR")).toEqual(["Or"])
	})

	it("keeps first occurrence when deduplicating", () => {
		expect(splitSearchTerms("Bague bague BAGUE")).toEqual(["Bague"])
	})

	it("deduplicates mixed-case duplicates across positions", () => {
		expect(splitSearchTerms("argent collier Argent")).toEqual(["argent", "collier"])
	})

	it(`caps at FUZZY_MAX_WORDS (${FUZZY_MAX_WORDS}) words`, () => {
		const words = Array.from({ length: 10 }, (_, i) => `word${i}`)
		const result = splitSearchTerms(words.join(" "))
		expect(result).toHaveLength(FUZZY_MAX_WORDS)
		expect(result).toEqual(words.slice(0, FUZZY_MAX_WORDS))
	})

	it("returns empty array for empty string", () => {
		expect(splitSearchTerms("")).toEqual([])
	})

	it("returns empty array for whitespace-only string", () => {
		expect(splitSearchTerms("   ")).toEqual([])
	})

	it(`returns empty array for strings longer than MAX_SEARCH_LENGTH (${MAX_SEARCH_LENGTH})`, () => {
		const longString = "a".repeat(MAX_SEARCH_LENGTH + 1)
		expect(splitSearchTerms(longString)).toEqual([])
	})

	it("accepts strings at exactly MAX_SEARCH_LENGTH", () => {
		const exactLength = "a".repeat(MAX_SEARCH_LENGTH)
		const result = splitSearchTerms(exactLength)
		expect(result).toEqual([exactLength])
	})

	it("handles tab and newline characters as whitespace", () => {
		expect(splitSearchTerms("boucles\toreilles\nargent")).toEqual([
			"boucles",
			"oreilles",
			"argent",
		])
	})

	it("handles special characters within words", () => {
		expect(splitSearchTerms("collier-perle bague+or")).toEqual([
			"collier-perle",
			"bague+or",
		])
	})

	it("handles accented characters", () => {
		expect(splitSearchTerms("émeraude chaîne")).toEqual(["émeraude", "chaîne"])
	})

	it("handles unicode characters", () => {
		expect(splitSearchTerms("bijoux café résine")).toEqual(["bijoux", "café", "résine"])
	})
})
