import { describe, it, expect } from "vitest";
import { getProductAggregateRating } from "../seo";

// ============================================================================
// getProductAggregateRating
// ============================================================================

describe("getProductAggregateRating", () => {
	it("returns null when reviewCount is 0", () => {
		expect(getProductAggregateRating(4.5, 0)).toBeNull();
	});

	it("returns Schema.org AggregateRating object for valid reviews", () => {
		const result = getProductAggregateRating(4.2, 15);

		expect(result).toEqual({
			"@type": "AggregateRating",
			ratingValue: "4.2",
			reviewCount: "15",
			bestRating: "5",
			worstRating: "1",
		});
	});

	it("converts ratingValue to string", () => {
		const result = getProductAggregateRating(3, 1);
		expect(result!.ratingValue).toBe("3");
	});

	it("converts reviewCount to string", () => {
		const result = getProductAggregateRating(5, 100);
		expect(result!.reviewCount).toBe("100");
	});

	it("always has bestRating 5 and worstRating 1", () => {
		const result = getProductAggregateRating(1, 1);
		expect(result!.bestRating).toBe("5");
		expect(result!.worstRating).toBe("1");
	});
});
