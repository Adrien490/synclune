import { describe, expect, it } from "vitest";

import {
	FUZZY_SIMILARITY_THRESHOLD,
	FUZZY_MIN_LENGTH,
	MAX_SEARCH_LENGTH,
	FUZZY_MAX_RESULTS,
	FUZZY_MAX_WORDS,
	FUZZY_TIMEOUT_MS,
	SPELL_SUGGESTION_TIMEOUT_MS,
	RELEVANCE_WEIGHTS,
	SEARCH_RATE_LIMITS,
} from "../search.constants";

describe("search.constants", () => {
	describe("FUZZY_SIMILARITY_THRESHOLD", () => {
		it("is between 0 and 1", () => {
			expect(FUZZY_SIMILARITY_THRESHOLD).toBeGreaterThan(0);
			expect(FUZZY_SIMILARITY_THRESHOLD).toBeLessThanOrEqual(1);
		});
	});

	describe("FUZZY_MIN_LENGTH", () => {
		it("is at least 3 (trigram minimum)", () => {
			expect(FUZZY_MIN_LENGTH).toBeGreaterThanOrEqual(3);
		});
	});

	describe("MAX_SEARCH_LENGTH", () => {
		it("is a positive integer to prevent DoS", () => {
			expect(MAX_SEARCH_LENGTH).toBeGreaterThan(0);
			expect(Number.isInteger(MAX_SEARCH_LENGTH)).toBe(true);
		});

		it("is reasonable (not too small, not too large)", () => {
			expect(MAX_SEARCH_LENGTH).toBeGreaterThanOrEqual(10);
			expect(MAX_SEARCH_LENGTH).toBeLessThanOrEqual(500);
		});
	});

	describe("FUZZY_MAX_RESULTS", () => {
		it("is a positive integer", () => {
			expect(FUZZY_MAX_RESULTS).toBeGreaterThan(0);
			expect(Number.isInteger(FUZZY_MAX_RESULTS)).toBe(true);
		});
	});

	describe("FUZZY_MAX_WORDS", () => {
		it("limits SQL complexity to a reasonable number", () => {
			expect(FUZZY_MAX_WORDS).toBeGreaterThanOrEqual(1);
			expect(FUZZY_MAX_WORDS).toBeLessThanOrEqual(10);
		});
	});

	describe("timeouts", () => {
		it("FUZZY_TIMEOUT_MS is positive and reasonable", () => {
			expect(FUZZY_TIMEOUT_MS).toBeGreaterThan(0);
			expect(FUZZY_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
		});

		it("SPELL_SUGGESTION_TIMEOUT_MS is positive and reasonable", () => {
			expect(SPELL_SUGGESTION_TIMEOUT_MS).toBeGreaterThan(0);
			expect(SPELL_SUGGESTION_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
		});

		it("spell timeout is less than or equal to fuzzy timeout", () => {
			expect(SPELL_SUGGESTION_TIMEOUT_MS).toBeLessThanOrEqual(FUZZY_TIMEOUT_MS);
		});
	});

	describe("RELEVANCE_WEIGHTS", () => {
		it("has all required weight keys", () => {
			expect(RELEVANCE_WEIGHTS).toHaveProperty("exactTitle");
			expect(RELEVANCE_WEIGHTS).toHaveProperty("fuzzyTitle");
			expect(RELEVANCE_WEIGHTS).toHaveProperty("exactDescription");
			expect(RELEVANCE_WEIGHTS).toHaveProperty("fuzzyDescription");
		});

		it("title weights are higher than description weights", () => {
			expect(RELEVANCE_WEIGHTS.exactTitle).toBeGreaterThan(RELEVANCE_WEIGHTS.exactDescription);
			expect(RELEVANCE_WEIGHTS.fuzzyTitle).toBeGreaterThan(RELEVANCE_WEIGHTS.fuzzyDescription);
		});

		it("exact weights are higher than fuzzy weights", () => {
			expect(RELEVANCE_WEIGHTS.exactTitle).toBeGreaterThan(RELEVANCE_WEIGHTS.fuzzyTitle);
			expect(RELEVANCE_WEIGHTS.exactDescription).toBeGreaterThan(
				RELEVANCE_WEIGHTS.fuzzyDescription,
			);
		});

		it("all weights are positive", () => {
			Object.values(RELEVANCE_WEIGHTS).forEach((weight) => {
				expect(weight).toBeGreaterThan(0);
			});
		});
	});

	describe("SEARCH_RATE_LIMITS", () => {
		it("has authenticated and guest limits", () => {
			expect(SEARCH_RATE_LIMITS).toHaveProperty("authenticated");
			expect(SEARCH_RATE_LIMITS).toHaveProperty("guest");
		});

		it("authenticated limit is higher than guest limit", () => {
			expect(SEARCH_RATE_LIMITS.authenticated.limit).toBeGreaterThan(
				SEARCH_RATE_LIMITS.guest.limit,
			);
		});

		it("both have positive limits and windows", () => {
			expect(SEARCH_RATE_LIMITS.authenticated.limit).toBeGreaterThan(0);
			expect(SEARCH_RATE_LIMITS.authenticated.windowMs).toBeGreaterThan(0);
			expect(SEARCH_RATE_LIMITS.guest.limit).toBeGreaterThan(0);
			expect(SEARCH_RATE_LIMITS.guest.windowMs).toBeGreaterThan(0);
		});
	});
});
