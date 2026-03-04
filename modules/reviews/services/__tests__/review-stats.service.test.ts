import { describe, it, expect, vi } from "vitest";
import { formatReviewStats } from "../review-stats.service";
import type { ReviewStats } from "../../types/review.types";

vi.mock("../../constants/review.constants", () => ({
	REVIEW_CONFIG: { MAX_RATING: 5 },
}));

// ============================================================================
// formatReviewStats
// ============================================================================

describe("formatReviewStats", () => {
	it("returns zeros and an empty distribution when input is null", () => {
		const result = formatReviewStats(null);

		expect(result.totalCount).toBe(0);
		expect(result.averageRating).toBe(0);
		expect(result.distribution).toHaveLength(5);
		expect(result.distribution.every((d) => d.count === 0 && d.percentage === 0)).toBe(true);
	});

	it("returns zeros for stats with totalCount 0", () => {
		const stats: ReviewStats = {
			totalCount: 0,
			averageRating: 4.2,
			rating1Count: 0,
			rating2Count: 0,
			rating3Count: 0,
			rating4Count: 0,
			rating5Count: 0,
		};

		const result = formatReviewStats(stats);

		expect(result.totalCount).toBe(0);
		expect(result.averageRating).toBe(0);
		expect(result.distribution.every((d) => d.count === 0 && d.percentage === 0)).toBe(true);
	});

	it("calculates percentages correctly", () => {
		const stats: ReviewStats = {
			totalCount: 10,
			averageRating: 4.0,
			rating1Count: 0,
			rating2Count: 0,
			rating3Count: 0,
			rating4Count: 4,
			rating5Count: 6,
		};

		const result = formatReviewStats(stats);

		const entry5 = result.distribution.find((d) => d.rating === 5);
		const entry4 = result.distribution.find((d) => d.rating === 4);

		expect(entry5?.percentage).toBe(60);
		expect(entry4?.percentage).toBe(40);
	});

	it("returns the distribution ordered from 5 to 1", () => {
		const stats: ReviewStats = {
			totalCount: 5,
			averageRating: 3.0,
			rating1Count: 1,
			rating2Count: 1,
			rating3Count: 1,
			rating4Count: 1,
			rating5Count: 1,
		};

		const result = formatReviewStats(stats);
		const ratings = result.distribution.map((d) => d.rating);

		expect(ratings).toEqual([5, 4, 3, 2, 1]);
	});

	it("gives 100% to the only rating that was given", () => {
		const stats: ReviewStats = {
			totalCount: 8,
			averageRating: 5.0,
			rating1Count: 0,
			rating2Count: 0,
			rating3Count: 0,
			rating4Count: 0,
			rating5Count: 8,
		};

		const result = formatReviewStats(stats);

		const entry5 = result.distribution.find((d) => d.rating === 5);
		expect(entry5?.percentage).toBe(100);
		expect(entry5?.count).toBe(8);

		const otherEntries = result.distribution.filter((d) => d.rating !== 5);
		expect(otherEntries.every((d) => d.percentage === 0 && d.count === 0)).toBe(true);
	});

	it("rounds percentages to the nearest integer", () => {
		// 1 / 3 = 33.33...% -> rounds to 33
		// 2 / 3 = 66.66...% -> rounds to 67
		const stats: ReviewStats = {
			totalCount: 3,
			averageRating: 4.33,
			rating1Count: 0,
			rating2Count: 0,
			rating3Count: 0,
			rating4Count: 1,
			rating5Count: 2,
		};

		const result = formatReviewStats(stats);

		const entry5 = result.distribution.find((d) => d.rating === 5);
		const entry4 = result.distribution.find((d) => d.rating === 4);

		expect(entry5?.percentage).toBe(67);
		expect(entry4?.percentage).toBe(33);
	});

	it("preserves averageRating and totalCount from input", () => {
		const stats: ReviewStats = {
			totalCount: 42,
			averageRating: 4.76,
			rating1Count: 0,
			rating2Count: 1,
			rating3Count: 2,
			rating4Count: 9,
			rating5Count: 30,
		};

		const result = formatReviewStats(stats);

		expect(result.totalCount).toBe(42);
		expect(result.averageRating).toBe(4.76);
	});
});
