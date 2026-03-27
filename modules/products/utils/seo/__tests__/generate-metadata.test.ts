import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted Mocks ───────────────────────────────────────────────────────────

const { mockGetProductBySlug } = vi.hoisted(() => ({
	mockGetProductBySlug: vi.fn(),
}));

vi.mock("@/modules/products/data/get-product", () => ({
	getProductBySlug: mockGetProductBySlug,
}));

vi.mock("@/shared/constants/urls", () => ({
	PRODUCTION_URL: "https://synclune.fr",
}));

import { generateProductMetadata } from "../generate-metadata";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSku(overrides: Record<string, unknown> = {}) {
	return {
		priceInclTax: 4999,
		inventory: 5,
		images: [{ url: "https://cdn.example.com/img1.jpg", isPrimary: true, altText: "Vue face" }],
		...overrides,
	} as never;
}

function makeProduct(overrides: Record<string, unknown> = {}) {
	return {
		title: "Bracelet Lune",
		slug: "bracelet-lune",
		description: "Un bracelet artisanal fait main.",
		status: "PUBLIC",
		type: { label: "Bracelet", slug: "bracelets" },
		skus: [makeSku()],
		...overrides,
	} as never;
}

function makeParams(slug: string = "bracelet-lune") {
	return Promise.resolve({ slug });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("generateProductMetadata", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	// ─── Not Found / Non-Public ───────────────────────────────────────────

	describe("not found / non-public", () => {
		it("returns noindex metadata when product is null", async () => {
			mockGetProductBySlug.mockResolvedValue(null);

			const result = await generateProductMetadata({ params: makeParams() });

			expect(result.title).toBe("Produit non trouvé - Synclune");
			expect(result.description).toBe("Ce produit n'existe pas ou n'est plus disponible.");
			expect(result.robots).toEqual({ index: false, follow: false });
		});

		it("returns noindex metadata when product status is DRAFT", async () => {
			mockGetProductBySlug.mockResolvedValue(makeProduct({ status: "DRAFT" }));

			const result = await generateProductMetadata({ params: makeParams() });

			expect(result.title).toBe("Produit non trouvé - Synclune");
			expect(result.robots).toEqual({ index: false, follow: false });
		});

		it("returns noindex metadata when product status is ARCHIVED", async () => {
			mockGetProductBySlug.mockResolvedValue(makeProduct({ status: "ARCHIVED" }));

			const result = await generateProductMetadata({ params: makeParams() });

			expect(result.title).toBe("Produit non trouvé - Synclune");
			expect(result.robots).toEqual({ index: false, follow: false });
		});
	});

	// ─── Title Building ───────────────────────────────────────────────────

	describe("title building", () => {
		it("builds title with price when it fits within 60 chars", async () => {
			mockGetProductBySlug.mockResolvedValue(
				makeProduct({
					title: "Bracelet Lune",
					skus: [makeSku({ priceInclTax: 4999 })],
				}),
			);

			const result = await generateProductMetadata({ params: makeParams() });

			expect(result.title).toBe("Bracelet Lune à 49.99€ | Synclune");
			expect((result.title as string).length).toBeLessThanOrEqual(60);
		});

		it("truncates long title but keeps price when full title exceeds 60 chars", async () => {
			mockGetProductBySlug.mockResolvedValue(
				makeProduct({
					title: "Bracelet Artisanal Fait Main Collection Printemps Étoile",
					skus: [makeSku({ priceInclTax: 4999 })],
				}),
			);

			const result = await generateProductMetadata({ params: makeParams() });

			const title = result.title as string;
			expect(title.length).toBeLessThanOrEqual(60);
			expect(title).toContain("49.99€");
			expect(title).toContain("| Synclune");
			expect(title).toContain("...");
		});

		it("truncates very long title without price with ellipsis", async () => {
			mockGetProductBySlug.mockResolvedValue(
				makeProduct({
					title: "Bracelet Artisanal Fait Main Collection Printemps Étoile Dorée",
					skus: [],
				}),
			);

			const result = await generateProductMetadata({ params: makeParams() });

			const title = result.title as string;
			expect(title.length).toBeLessThanOrEqual(60);
			expect(title).toContain("...");
			expect(title).toContain("| Synclune");
		});

		it("builds title without price when no SKU is available", async () => {
			mockGetProductBySlug.mockResolvedValue(
				makeProduct({
					title: "Bracelet Lune",
					skus: [],
				}),
			);

			const result = await generateProductMetadata({ params: makeParams() });

			expect(result.title).toBe("Bracelet Lune | Synclune");
		});
	});

	// ─── Description ─────────────────────────────────────────────────────

	describe("description", () => {
		it("uses product description when available", async () => {
			mockGetProductBySlug.mockResolvedValue(
				makeProduct({ description: "Une belle description courte." }),
			);

			const result = await generateProductMetadata({ params: makeParams() });

			expect(result.description).toBe("Une belle description courte.");
		});

		it("truncates product description to 155 chars with ellipsis", async () => {
			const longDescription =
				"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco.";
			mockGetProductBySlug.mockResolvedValue(makeProduct({ description: longDescription }));

			const result = await generateProductMetadata({ params: makeParams() });

			expect((result.description as string).length).toBeLessThanOrEqual(155);
			expect(result.description).toContain("...");
		});

		it("generates fallback description when product description is null", async () => {
			mockGetProductBySlug.mockResolvedValue(
				makeProduct({
					title: "Bracelet Lune",
					description: null,
					type: { label: "Bracelet", slug: "bracelets" },
				}),
			);

			const result = await generateProductMetadata({ params: makeParams() });

			expect(result.description).toContain("Bracelet Lune");
			expect(result.description).toContain("bijou artisanal");
			expect(result.description).toContain("Synclune");
		});

		it("includes product type label in fallback description when available", async () => {
			mockGetProductBySlug.mockResolvedValue(
				makeProduct({
					description: null,
					type: { label: "Collier", slug: "colliers" },
				}),
			);

			const result = await generateProductMetadata({ params: makeParams() });

			expect(result.description).toContain("Collier");
		});

		it("generates fallback description without type when product type is null", async () => {
			mockGetProductBySlug.mockResolvedValue(
				makeProduct({
					title: "Bague Soleil",
					description: null,
					type: null,
				}),
			);

			const result = await generateProductMetadata({ params: makeParams() });

			expect(result.description).toContain("Bague Soleil");
			expect(result.description).not.toContain("Type:");
		});
	});

	// ─── URLs ─────────────────────────────────────────────────────────────

	describe("URLs", () => {
		it("sets canonical URL as /creations/{slug}", async () => {
			mockGetProductBySlug.mockResolvedValue(makeProduct({ slug: "bague-soleil" }));

			const result = await generateProductMetadata({ params: makeParams("bague-soleil") });

			expect(result.alternates?.canonical).toBe("/creations/bague-soleil");
		});

		it("sets full Open Graph URL including PRODUCTION_URL", async () => {
			mockGetProductBySlug.mockResolvedValue(makeProduct({ slug: "bague-soleil" }));

			const result = await generateProductMetadata({ params: makeParams("bague-soleil") });

			expect((result.openGraph as { url: string }).url).toBe(
				"https://synclune.fr/creations/bague-soleil",
			);
		});
	});

	// ─── Images ───────────────────────────────────────────────────────────

	describe("images", () => {
		it("uses isPrimary image when available", async () => {
			const images = [
				{ url: "https://cdn.example.com/primary.jpg", isPrimary: true },
				{ url: "https://cdn.example.com/secondary.jpg", isPrimary: false },
			];
			mockGetProductBySlug.mockResolvedValue(makeProduct({ skus: [makeSku({ images })] }));

			const result = await generateProductMetadata({ params: makeParams() });

			const ogImages = (result.openGraph as { images: Array<{ url: string }> }).images;
			expect(ogImages[0]!.url).toBe("https://cdn.example.com/primary.jpg");
		});

		it("falls back to first image when no isPrimary image", async () => {
			const images = [
				{ url: "https://cdn.example.com/first.jpg", isPrimary: false },
				{ url: "https://cdn.example.com/second.jpg", isPrimary: false },
			];
			mockGetProductBySlug.mockResolvedValue(makeProduct({ skus: [makeSku({ images })] }));

			const result = await generateProductMetadata({ params: makeParams() });

			const ogImages = (result.openGraph as { images: Array<{ url: string }> }).images;
			expect(ogImages[0]!.url).toBe("https://cdn.example.com/first.jpg");
		});

		it("falls back to opengraph-image URL when no images are present", async () => {
			mockGetProductBySlug.mockResolvedValue(makeProduct({ skus: [makeSku({ images: [] })] }));

			const result = await generateProductMetadata({ params: makeParams() });

			const ogImages = (result.openGraph as { images: Array<{ url: string }> }).images;
			expect(ogImages[0]!.url).toBe("https://synclune.fr/opengraph-image");
		});
	});

	// ─── Product Meta Tags ────────────────────────────────────────────────

	describe("product meta tags", () => {
		it("sets availability to 'in stock' when inventory > 0", async () => {
			mockGetProductBySlug.mockResolvedValue(makeProduct({ skus: [makeSku({ inventory: 3 })] }));

			const result = await generateProductMetadata({ params: makeParams() });

			expect((result.other as Record<string, string>)["product:availability"]).toBe("in stock");
		});

		it("sets availability to 'out of stock' when inventory is 0", async () => {
			mockGetProductBySlug.mockResolvedValue(makeProduct({ skus: [makeSku({ inventory: 0 })] }));

			const result = await generateProductMetadata({ params: makeParams() });

			expect((result.other as Record<string, string>)["product:availability"]).toBe("out of stock");
		});

		it("sets availability to 'out of stock' when no SKU", async () => {
			mockGetProductBySlug.mockResolvedValue(makeProduct({ skus: [] }));

			const result = await generateProductMetadata({ params: makeParams() });

			expect((result.other as Record<string, string>)["product:availability"]).toBe("out of stock");
		});

		it("formats price amount correctly from priceInclTax in cents", async () => {
			mockGetProductBySlug.mockResolvedValue(
				makeProduct({ skus: [makeSku({ priceInclTax: 7550 })] }),
			);

			const result = await generateProductMetadata({ params: makeParams() });

			// price string ("75.50€") is used directly as the amount value
			expect((result.other as Record<string, string>)["product:price:amount"]).toBe("75.50€");
		});

		it("sets currency to EUR, condition to new, brand to Synclune", async () => {
			mockGetProductBySlug.mockResolvedValue(makeProduct());

			const result = await generateProductMetadata({ params: makeParams() });

			const other = result.other as Record<string, string>;
			expect(other["product:price:currency"]).toBe("EUR");
			expect(other["product:condition"]).toBe("new");
			expect(other["product:brand"]).toBe("Synclune");
		});
	});
});
