import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

vi.mock("@/shared/lib/media-validation", () => ({
	isAllowedMediaDomain: (url: string) => url.includes("utfs.io") || url.includes("uploadthing"),
}));

vi.mock("../../constants/review.constants", () => ({
	REVIEW_CONFIG: {
		MIN_RATING: 1,
		MAX_RATING: 5,
		MAX_TITLE_LENGTH: 150,
		MIN_CONTENT_LENGTH: 10,
		MAX_CONTENT_LENGTH: 2000,
		MAX_MEDIA_COUNT: 3,
		MAX_RESPONSE_LENGTH: 1000,
		MIN_RESPONSE_LENGTH: 20,
		DEFAULT_PER_PAGE: 10,
		MAX_PER_PAGE: 50,
	},
}));

vi.mock("@/shared/schemas/date.schemas", () => ({
	stringOrDateSchema: z.union([z.string(), z.date()]).optional(),
}));

import {
	reviewMediaSchema,
	createReviewSchema,
	updateReviewSchema,
	deleteReviewSchema,
	moderateReviewSchema,
	bulkHideReviewsSchema,
	createReviewResponseSchema,
	sendReviewRequestEmailSchema,
} from "../review.schemas";

const VALID_CUID = "clh1234567890abcdefghijklm";
const VALID_URL = "https://utfs.io/f/abc123.jpg";

// ============================================================================
// reviewMediaSchema
// ============================================================================

describe("reviewMediaSchema", () => {
	const validMedia = {
		url: VALID_URL,
	};

	it("should accept valid media object with UploadThing URL", () => {
		const result = reviewMediaSchema.safeParse(validMedia);

		expect(result.success).toBe(true);
	});

	it("should reject invalid URL", () => {
		const result = reviewMediaSchema.safeParse({
			...validMedia,
			url: "not-a-url",
		});

		expect(result.success).toBe(false);
	});

	it("should reject non-UploadThing domain", () => {
		const result = reviewMediaSchema.safeParse({
			...validMedia,
			url: "https://example.com/image.jpg",
		});

		expect(result.success).toBe(false);
	});

	describe("blurDataUrl", () => {
		it("should accept blurDataUrl starting with data:", () => {
			const result = reviewMediaSchema.safeParse({
				...validMedia,
				blurDataUrl: "data:image/png;base64,abc123==",
			});

			expect(result.success).toBe(true);
		});

		it("should reject blurDataUrl not starting with data:", () => {
			const result = reviewMediaSchema.safeParse({
				...validMedia,
				blurDataUrl: "https://utfs.io/f/blur.jpg",
			});

			expect(result.success).toBe(false);
		});

		it("should be optional", () => {
			const result = reviewMediaSchema.safeParse(validMedia);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.blurDataUrl).toBeUndefined();
			}
		});
	});

	describe("altText", () => {
		it("should accept altText within 255 chars", () => {
			const result = reviewMediaSchema.safeParse({
				...validMedia,
				altText: "A".repeat(255),
			});

			expect(result.success).toBe(true);
		});

		it("should reject altText exceeding 255 chars", () => {
			const result = reviewMediaSchema.safeParse({
				...validMedia,
				altText: "A".repeat(256),
			});

			expect(result.success).toBe(false);
		});

		it("should be optional", () => {
			const result = reviewMediaSchema.safeParse(validMedia);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.altText).toBeUndefined();
			}
		});
	});
});

// ============================================================================
// createReviewSchema
// ============================================================================

describe("createReviewSchema", () => {
	const validData = {
		productId: VALID_CUID,
		orderItemId: VALID_CUID,
		rating: 4,
		content: "This is a valid review content.",
	};

	it("should accept valid complete input", () => {
		const result = createReviewSchema.safeParse(validData);

		expect(result.success).toBe(true);
	});

	it("should reject missing productId", () => {
		const { productId: _productId, ...withoutProductId } = validData;
		const result = createReviewSchema.safeParse(withoutProductId);

		expect(result.success).toBe(false);
	});

	it("should reject invalid productId (not cuid2)", () => {
		const result = createReviewSchema.safeParse({
			...validData,
			productId: "not-a-cuid2",
		});

		expect(result.success).toBe(false);
	});

	describe("rating", () => {
		it("should accept rating of 1", () => {
			const result = createReviewSchema.safeParse({ ...validData, rating: 1 });

			expect(result.success).toBe(true);
		});

		it("should accept rating of 5", () => {
			const result = createReviewSchema.safeParse({ ...validData, rating: 5 });

			expect(result.success).toBe(true);
		});

		it("should reject rating of 0", () => {
			const result = createReviewSchema.safeParse({ ...validData, rating: 0 });

			expect(result.success).toBe(false);
		});

		it("should reject rating of 6", () => {
			const result = createReviewSchema.safeParse({ ...validData, rating: 6 });

			expect(result.success).toBe(false);
		});

		it("should reject non-integer rating (3.5)", () => {
			const result = createReviewSchema.safeParse({ ...validData, rating: 3.5 });

			expect(result.success).toBe(false);
		});
	});

	describe("title", () => {
		it("should be optional", () => {
			const { ...withoutTitle } = validData;
			const result = createReviewSchema.safeParse(withoutTitle);

			expect(result.success).toBe(true);
		});

		it("should transform empty string to null", () => {
			const result = createReviewSchema.safeParse({ ...validData, title: "" });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.title).toBeNull();
			}
		});

		it("should transform undefined to null", () => {
			const result = createReviewSchema.safeParse({ ...validData, title: undefined });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.title).toBeNull();
			}
		});

		it("should preserve a valid title value", () => {
			const result = createReviewSchema.safeParse({ ...validData, title: "Great product" });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.title).toBe("Great product");
			}
		});
	});

	describe("content", () => {
		it("should reject content shorter than 10 chars", () => {
			const result = createReviewSchema.safeParse({ ...validData, content: "Too short" });

			expect(result.success).toBe(false);
		});

		it("should accept content of exactly 10 chars", () => {
			const result = createReviewSchema.safeParse({ ...validData, content: "A".repeat(10) });

			expect(result.success).toBe(true);
		});

		it("should reject content exceeding 2000 chars", () => {
			const result = createReviewSchema.safeParse({ ...validData, content: "A".repeat(2001) });

			expect(result.success).toBe(false);
		});

		it("should accept content of exactly 2000 chars", () => {
			const result = createReviewSchema.safeParse({ ...validData, content: "A".repeat(2000) });

			expect(result.success).toBe(true);
		});
	});

	describe("media", () => {
		it("should default to empty array when not provided", () => {
			const result = createReviewSchema.safeParse(validData);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.media).toEqual([]);
			}
		});

		it("should accept up to 3 media items", () => {
			const mediaItem = { url: VALID_URL };
			const result = createReviewSchema.safeParse({
				...validData,
				media: [mediaItem, mediaItem, mediaItem],
			});

			expect(result.success).toBe(true);
		});

		it("should reject more than 3 media items", () => {
			const mediaItem = { url: VALID_URL };
			const result = createReviewSchema.safeParse({
				...validData,
				media: [mediaItem, mediaItem, mediaItem, mediaItem],
			});

			expect(result.success).toBe(false);
		});
	});
});

// ============================================================================
// updateReviewSchema
// ============================================================================

describe("updateReviewSchema", () => {
	const validData = {
		id: VALID_CUID,
		rating: 3,
		content: "Updated review content here.",
	};

	it("should accept valid input with id", () => {
		const result = updateReviewSchema.safeParse(validData);

		expect(result.success).toBe(true);
	});

	it("should reject missing id", () => {
		const { id: _id, ...withoutId } = validData;
		const result = updateReviewSchema.safeParse(withoutId);

		expect(result.success).toBe(false);
	});

	describe("rating", () => {
		it("should reject rating of 0", () => {
			const result = updateReviewSchema.safeParse({ ...validData, rating: 0 });

			expect(result.success).toBe(false);
		});

		it("should reject rating of 6", () => {
			const result = updateReviewSchema.safeParse({ ...validData, rating: 6 });

			expect(result.success).toBe(false);
		});

		it("should reject non-integer rating (3.5)", () => {
			const result = updateReviewSchema.safeParse({ ...validData, rating: 3.5 });

			expect(result.success).toBe(false);
		});

		it("should accept valid rating within 1-5", () => {
			const result = updateReviewSchema.safeParse({ ...validData, rating: 2 });

			expect(result.success).toBe(true);
		});
	});
});

// ============================================================================
// deleteReviewSchema
// ============================================================================

describe("deleteReviewSchema", () => {
	it("should accept valid id", () => {
		const result = deleteReviewSchema.safeParse({ id: VALID_CUID });

		expect(result.success).toBe(true);
	});

	it("should reject missing id", () => {
		const result = deleteReviewSchema.safeParse({});

		expect(result.success).toBe(false);
	});

	it("should reject invalid id format", () => {
		const result = deleteReviewSchema.safeParse({ id: "not-a-cuid2" });

		expect(result.success).toBe(false);
	});
});

// ============================================================================
// moderateReviewSchema
// ============================================================================

describe("moderateReviewSchema", () => {
	it("should accept valid id", () => {
		const result = moderateReviewSchema.safeParse({ id: VALID_CUID });

		expect(result.success).toBe(true);
	});

	it("should reject missing id", () => {
		const result = moderateReviewSchema.safeParse({});

		expect(result.success).toBe(false);
	});

	it("should reject invalid id format", () => {
		const result = moderateReviewSchema.safeParse({ id: "not-a-cuid2" });

		expect(result.success).toBe(false);
	});
});

// ============================================================================
// bulkHideReviewsSchema
// ============================================================================

describe("bulkHideReviewsSchema", () => {
	it("should accept array of valid ids", () => {
		const result = bulkHideReviewsSchema.safeParse({ ids: [VALID_CUID] });

		expect(result.success).toBe(true);
	});

	it("should accept multiple valid ids", () => {
		const result = bulkHideReviewsSchema.safeParse({
			ids: [VALID_CUID, VALID_CUID, VALID_CUID],
		});

		expect(result.success).toBe(true);
	});

	it("should reject empty array", () => {
		const result = bulkHideReviewsSchema.safeParse({ ids: [] });

		expect(result.success).toBe(false);
	});

	it("should reject non-cuid2 ids", () => {
		const result = bulkHideReviewsSchema.safeParse({ ids: ["not-a-cuid2"] });

		expect(result.success).toBe(false);
	});

	it("should reject missing ids field", () => {
		const result = bulkHideReviewsSchema.safeParse({});

		expect(result.success).toBe(false);
	});
});

// ============================================================================
// createReviewResponseSchema
// ============================================================================

describe("createReviewResponseSchema", () => {
	const validData = {
		reviewId: VALID_CUID,
		content: "Thank you for your kind review, we appreciate your feedback!",
	};

	it("should accept valid response", () => {
		const result = createReviewResponseSchema.safeParse(validData);

		expect(result.success).toBe(true);
	});

	it("should reject content shorter than 10 chars (MIN_CONTENT_LENGTH)", () => {
		const result = createReviewResponseSchema.safeParse({
			...validData,
			content: "Too short",
		});

		expect(result.success).toBe(false);
	});

	it("should accept content of exactly 10 chars", () => {
		const result = createReviewResponseSchema.safeParse({
			...validData,
			content: "A".repeat(10),
		});

		expect(result.success).toBe(true);
	});

	it("should reject content exceeding 1000 chars (MAX_RESPONSE_LENGTH)", () => {
		const result = createReviewResponseSchema.safeParse({
			...validData,
			content: "A".repeat(1001),
		});

		expect(result.success).toBe(false);
	});

	it("should accept content of exactly 1000 chars", () => {
		const result = createReviewResponseSchema.safeParse({
			...validData,
			content: "A".repeat(1000),
		});

		expect(result.success).toBe(true);
	});

	it("should reject missing reviewId", () => {
		const { reviewId: _reviewId, ...withoutReviewId } = validData;
		const result = createReviewResponseSchema.safeParse(withoutReviewId);

		expect(result.success).toBe(false);
	});

	it("should reject invalid reviewId format", () => {
		const result = createReviewResponseSchema.safeParse({
			...validData,
			reviewId: "not-a-cuid2",
		});

		expect(result.success).toBe(false);
	});
});

// ============================================================================
// sendReviewRequestEmailSchema
// ============================================================================

describe("sendReviewRequestEmailSchema", () => {
	it("should accept valid orderId", () => {
		const result = sendReviewRequestEmailSchema.safeParse({ orderId: VALID_CUID });

		expect(result.success).toBe(true);
	});

	it("should reject invalid orderId", () => {
		const result = sendReviewRequestEmailSchema.safeParse({ orderId: "not-a-cuid2" });

		expect(result.success).toBe(false);
	});

	it("should reject missing orderId", () => {
		const result = sendReviewRequestEmailSchema.safeParse({});

		expect(result.success).toBe(false);
	});
});
