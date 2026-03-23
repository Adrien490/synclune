import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { getPrimaryImageForListMock } = vi.hoisted(() => ({
	getPrimaryImageForListMock: vi.fn(),
}));

vi.mock("@/modules/products/services/product-display.service", () => ({
	getPrimaryImageForList: getPrimaryImageForListMock,
}));

vi.mock("@/modules/media/constants/product-fallback-image.constants", () => ({
	FALLBACK_PRODUCT_IMAGE: { id: "fallback-image" },
}));

import { extractHeroImages, type HeroProductImage } from "../extract-hero-images";

beforeEach(() => {
	getPrimaryImageForListMock.mockReset();
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProduct(slug: string, title: string) {
	return { slug, title } as Parameters<typeof extractHeroImages>[0][number];
}

function makeImage(id: string, url: string, alt?: string, blurDataUrl?: string) {
	return { id, url, alt, blurDataUrl, mediaType: "IMAGE" as const };
}

/** Sets up mock to return a real image for each product by index */
function mockRealImages(count: number, options?: { blurPrefix?: string }) {
	for (let i = 0; i < count; i++) {
		getPrimaryImageForListMock.mockReturnValueOnce(
			makeImage(
				`img-${i}`,
				`/img-${i}.jpg`,
				`Alt ${i}`,
				options?.blurPrefix ? `${options.blurPrefix}-${i}` : undefined,
			),
		);
	}
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("extractHeroImages", () => {
	it("returns 4 images when 4+ products have real images", () => {
		const products = Array.from({ length: 6 }, (_, i) =>
			makeProduct(`product-${i}`, `Product ${i}`),
		);
		mockRealImages(6);

		const result = extractHeroImages(products);

		expect(result).toHaveLength(4);
		expect(result[0]).toEqual<HeroProductImage>({
			url: "/img-0.jpg",
			alt: "Alt 0",
			blurDataUrl: undefined,
			slug: "product-0",
			title: "Product 0",
		});
	});

	it("returns empty array when fewer than 4 real images", () => {
		const products = Array.from({ length: 3 }, (_, i) => makeProduct(`p-${i}`, `Product ${i}`));
		mockRealImages(3);

		const result = extractHeroImages(products);
		expect(result).toEqual([]);
	});

	it("returns empty array for empty products list", () => {
		const result = extractHeroImages([]);
		expect(result).toEqual([]);
	});

	it("skips products with fallback placeholder images", () => {
		const products = Array.from({ length: 5 }, (_, i) => makeProduct(`p-${i}`, `Product ${i}`));

		getPrimaryImageForListMock
			.mockReturnValueOnce(makeImage("fallback-image", "/fallback.svg"))
			.mockReturnValueOnce(makeImage("fallback-image", "/fallback.svg"))
			.mockReturnValueOnce(makeImage("img-2", "/2.jpg", "Alt 2"))
			.mockReturnValueOnce(makeImage("img-3", "/3.jpg", "Alt 3"))
			.mockReturnValueOnce(makeImage("img-4", "/4.jpg", "Alt 4"));

		// Only 3 real images (< 4), returns empty
		const result = extractHeroImages(products);
		expect(result).toEqual([]);
	});

	it("uses product title as alt fallback when image alt is undefined", () => {
		const products = Array.from({ length: 4 }, (_, i) => makeProduct(`p-${i}`, `Product ${i}`));

		for (let i = 0; i < 4; i++) {
			getPrimaryImageForListMock.mockReturnValueOnce(
				makeImage(`img-${i}`, `/img-${i}.jpg`, undefined),
			);
		}

		const result = extractHeroImages(products);
		expect(result).toHaveLength(4);
		result.forEach((img, i) => {
			expect(img.alt).toBe(`Product ${i}`);
		});
	});

	it("stops collecting after 4 images even with more products", () => {
		const products = Array.from({ length: 10 }, (_, i) => makeProduct(`p-${i}`, `Product ${i}`));
		mockRealImages(10);

		const result = extractHeroImages(products);
		expect(result).toHaveLength(4);
		expect(result[3]!.slug).toBe("p-3");
	});

	it("preserves blurDataUrl when present", () => {
		const products = Array.from({ length: 4 }, (_, i) => makeProduct(`p-${i}`, `Product ${i}`));
		mockRealImages(4, { blurPrefix: "blur-data" });

		const result = extractHeroImages(products);
		expect(result[0]!.blurDataUrl).toBe("blur-data-0");
		expect(result[3]!.blurDataUrl).toBe("blur-data-3");
	});

	it("returns exactly 4 when exactly 4 real images are available (with fallbacks mixed in)", () => {
		const products = Array.from({ length: 6 }, (_, i) => makeProduct(`p-${i}`, `Product ${i}`));

		getPrimaryImageForListMock
			.mockReturnValueOnce(makeImage("img-0", "/0.jpg", "A0"))
			.mockReturnValueOnce(makeImage("fallback-image", "/f.svg"))
			.mockReturnValueOnce(makeImage("img-2", "/2.jpg", "A2"))
			.mockReturnValueOnce(makeImage("img-3", "/3.jpg", "A3"))
			.mockReturnValueOnce(makeImage("fallback-image", "/f.svg"))
			.mockReturnValueOnce(makeImage("img-5", "/5.jpg", "A5"));

		const result = extractHeroImages(products);
		expect(result).toHaveLength(4);
		expect(result.map((r) => r.slug)).toEqual(["p-0", "p-2", "p-3", "p-5"]);
	});
});
