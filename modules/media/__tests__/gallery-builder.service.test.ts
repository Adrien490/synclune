import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindSkuByVariants, MOCK_FALLBACK } = vi.hoisted(() => ({
	mockFindSkuByVariants: vi.fn(),
	MOCK_FALLBACK: { id: "fallback", url: "/fallback.svg", mediaType: "IMAGE" as const },
}));

vi.mock("@/modules/skus/services/sku-variant-finder.service", () => ({
	findSkuByVariants: mockFindSkuByVariants,
}));

vi.mock("@/modules/media/constants/product-fallback-image.constants", () => ({
	FALLBACK_PRODUCT_IMAGE: MOCK_FALLBACK,
}));

import { buildGallery } from "../services/gallery-builder.service";
import type { GetProductReturn } from "@/modules/products/types/product.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockImage(overrides = {}) {
	return {
		id: "img-1",
		url: "https://utfs.io/f/img1.jpg",
		thumbnailUrl: null,
		blurDataUrl: null,
		altText: null,
		mediaType: "IMAGE" as const,
		...overrides,
	};
}

function createMockSku(overrides: Record<string, unknown> = {}) {
	return {
		id: "sku-1",
		isActive: true,
		material: { name: "Or" },
		color: { name: "Rose" },
		size: null,
		images: [],
		...overrides,
	};
}

function createMockProduct(overrides: Record<string, unknown> = {}) {
	return {
		title: "Eclat de Lune",
		type: { label: "Boucles d'oreilles" },
		skus: [],
		...overrides,
	} as unknown as GetProductReturn;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildGallery", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// -----------------------------------------------------------------------
	// Null / empty product
	// -----------------------------------------------------------------------

	it("should return an empty array when product is null", () => {
		const result = buildGallery({
			product: null as unknown as GetProductReturn,
			selectedVariants: {},
		});

		expect(result).toEqual([]);
	});

	it("should return the fallback image when the product has no SKUs", () => {
		const product = createMockProduct({ skus: [] });

		const result = buildGallery({ product, selectedVariants: {} });

		expect(result).toHaveLength(1);
		expect(result[0]?.url).toBe("/fallback.svg");
		expect(result[0]?.id).toBe("fallback");
	});

	it("should include the product title and type in fallback alt text", () => {
		const product = createMockProduct({
			title: "Eclat de Lune",
			type: { label: "Boucles d'oreilles" },
			skus: [],
		});

		const result = buildGallery({ product, selectedVariants: {} });

		expect(result[0]?.alt).toBe("Boucles d'oreilles Eclat de Lune - Image bientôt disponible");
	});

	it("should use product title alone in fallback alt when no product type", () => {
		const product = createMockProduct({
			title: "Eclat de Lune",
			type: null,
			skus: [],
		});

		const result = buildGallery({ product, selectedVariants: {} });

		expect(result[0]?.alt).toBe("Eclat de Lune - Image bientôt disponible");
	});

	// -----------------------------------------------------------------------
	// Priority 1: Selected SKU images
	// -----------------------------------------------------------------------

	it("should show selected SKU images with source 'selected'", () => {
		const image = createMockImage({ id: "img-selected", url: "https://utfs.io/f/selected.jpg" });
		const selectedSku = createMockSku({ id: "sku-selected", images: [image] });

		const product = createMockProduct({ skus: [selectedSku] });
		mockFindSkuByVariants.mockReturnValue(selectedSku);

		const result = buildGallery({
			product,
			selectedVariants: { colorSlug: "rose" },
		});

		expect(result).toHaveLength(1);
		expect(result[0]?.source).toBe("selected");
		expect(result[0]?.url).toBe("https://utfs.io/f/selected.jpg");
		expect(result[0]?.skuId).toBe("sku-selected");
	});

	// -----------------------------------------------------------------------
	// Priority 2: Default SKU images
	// -----------------------------------------------------------------------

	it("should show default SKU images (skus[0]) with source 'default'", () => {
		const image = createMockImage({ id: "img-default", url: "https://utfs.io/f/default.jpg" });
		const defaultSku = createMockSku({ id: "sku-default", images: [image] });

		const product = createMockProduct({ skus: [defaultSku] });

		const result = buildGallery({ product, selectedVariants: {} });

		expect(result).toHaveLength(1);
		expect(result[0]?.source).toBe("default");
		expect(result[0]?.url).toBe("https://utfs.io/f/default.jpg");
		expect(result[0]?.skuId).toBe("sku-default");
	});

	it("should not call findSkuByVariants when no variants are selected", () => {
		const image = createMockImage();
		const defaultSku = createMockSku({ id: "sku-default", images: [image] });
		const product = createMockProduct({ skus: [defaultSku] });

		buildGallery({ product, selectedVariants: {} });

		expect(mockFindSkuByVariants).not.toHaveBeenCalled();
	});

	// -----------------------------------------------------------------------
	// Priority order: selected before default
	// -----------------------------------------------------------------------

	it("should place selected SKU images before default SKU images", () => {
		const selectedImage = createMockImage({
			id: "img-sel",
			url: "https://utfs.io/f/selected.jpg",
		});
		const defaultImage = createMockImage({
			id: "img-def",
			url: "https://utfs.io/f/default.jpg",
		});
		const selectedSku = createMockSku({ id: "sku-sel", images: [selectedImage] });
		const defaultSku = createMockSku({ id: "sku-def", images: [defaultImage] });

		const product = createMockProduct({ skus: [defaultSku, selectedSku] });
		mockFindSkuByVariants.mockReturnValue(selectedSku);

		const result = buildGallery({
			product,
			selectedVariants: { colorSlug: "rose" },
		});

		expect(result).toHaveLength(2);
		expect(result[0]?.source).toBe("selected");
		expect(result[1]?.source).toBe("default");
	});

	// -----------------------------------------------------------------------
	// Deduplication
	// -----------------------------------------------------------------------

	it("should deduplicate images sharing the same URL across SKUs", () => {
		const sharedUrl = "https://utfs.io/f/shared.jpg";
		const imageA = createMockImage({ id: "img-a", url: sharedUrl });
		const imageB = createMockImage({ id: "img-b", url: sharedUrl });

		const selectedSku = createMockSku({ id: "sku-sel", images: [imageA] });
		const defaultSku = createMockSku({ id: "sku-def", images: [imageB] });

		const product = createMockProduct({ skus: [defaultSku, selectedSku] });
		mockFindSkuByVariants.mockReturnValue(selectedSku);

		const result = buildGallery({
			product,
			selectedVariants: { colorSlug: "rose" },
		});

		expect(result).toHaveLength(1);
		expect(result[0]?.url).toBe(sharedUrl);
	});

	// -----------------------------------------------------------------------
	// Priority 3: Other active SKU images (gallery < MIN_GALLERY_IMAGES)
	// -----------------------------------------------------------------------

	it("should append other active SKU images when gallery has fewer than 5 images", () => {
		const defaultImage = createMockImage({
			id: "img-def",
			url: "https://utfs.io/f/default.jpg",
		});
		const otherImage = createMockImage({
			id: "img-other",
			url: "https://utfs.io/f/other.jpg",
		});

		const defaultSku = createMockSku({ id: "sku-default", images: [defaultImage] });
		const otherSku = createMockSku({ id: "sku-other", isActive: true, images: [otherImage] });

		const product = createMockProduct({ skus: [defaultSku, otherSku] });

		const result = buildGallery({ product, selectedVariants: {} });

		expect(result).toHaveLength(2);
		expect(result[1]?.source).toBe("sku");
		expect(result[1]?.skuId).toBe("sku-other");
	});

	it("should not append other SKU images when gallery already has 5 or more images", () => {
		const makeImage = (n: number) =>
			createMockImage({ id: `img-${n}`, url: `https://utfs.io/f/img${n}.jpg` });

		const defaultSku = createMockSku({
			id: "sku-default",
			images: [makeImage(1), makeImage(2), makeImage(3), makeImage(4), makeImage(5)],
		});
		const otherSku = createMockSku({
			id: "sku-other",
			isActive: true,
			images: [makeImage(6)],
		});

		const product = createMockProduct({ skus: [defaultSku, otherSku] });

		const result = buildGallery({ product, selectedVariants: {} });

		expect(result).toHaveLength(5);
		expect(result.every((m) => m.source !== "sku")).toBe(true);
	});

	it("should skip inactive SKUs when filling other images", () => {
		const defaultImage = createMockImage({
			id: "img-def",
			url: "https://utfs.io/f/default.jpg",
		});
		const inactiveImage = createMockImage({
			id: "img-inactive",
			url: "https://utfs.io/f/inactive.jpg",
		});

		const defaultSku = createMockSku({ id: "sku-default", images: [defaultImage] });
		const inactiveSku = createMockSku({
			id: "sku-inactive",
			isActive: false,
			images: [inactiveImage],
		});

		const product = createMockProduct({ skus: [defaultSku, inactiveSku] });

		const result = buildGallery({ product, selectedVariants: {} });

		expect(result).toHaveLength(1);
		expect(result[0]?.url).not.toBe("https://utfs.io/f/inactive.jpg");
	});

	// -----------------------------------------------------------------------
	// MAX_GALLERY_IMAGES (20) cap
	// -----------------------------------------------------------------------

	it("should cap total images at 20", () => {
		const makeImage = (n: number) =>
			createMockImage({ id: `img-${n}`, url: `https://utfs.io/f/img${n}.jpg` });

		const images = Array.from({ length: 25 }, (_, i) => makeImage(i + 1));
		const defaultSku = createMockSku({ id: "sku-default", images });

		const product = createMockProduct({ skus: [defaultSku] });

		const result = buildGallery({ product, selectedVariants: {} });

		expect(result).toHaveLength(20);
	});

	// -----------------------------------------------------------------------
	// Alt text generation
	// -----------------------------------------------------------------------

	it("should generate alt text with product type, material and color", () => {
		const image = createMockImage({ id: "img-1", url: "https://utfs.io/f/img1.jpg" });
		const sku = createMockSku({
			id: "sku-1",
			material: { name: "Or" },
			color: { name: "Rose" },
			size: null,
			images: [image],
		});

		const product = createMockProduct({
			title: "Eclat de Lune",
			type: { label: "Boucles d'oreilles" },
			skus: [sku],
		});

		const result = buildGallery({ product, selectedVariants: {} });

		expect(result[0]?.alt).toContain("Boucles d'oreilles Eclat de Lune");
		expect(result[0]?.alt).toContain("Or");
		expect(result[0]?.alt).toContain("Rose");
	});

	it("should use 'Vue X sur Y' format when gallery has multiple images", () => {
		const makeImage = (n: number) =>
			createMockImage({ id: `img-${n}`, url: `https://utfs.io/f/img${n}.jpg` });

		const sku = createMockSku({
			id: "sku-1",
			material: { name: "Or" },
			color: { name: "Rose" },
			images: [makeImage(1), makeImage(2), makeImage(3)],
		});

		const product = createMockProduct({
			title: "Eclat de Lune",
			type: { label: "Boucles d'oreilles" },
			skus: [sku],
		});

		const result = buildGallery({ product, selectedVariants: {} });

		expect(result).toHaveLength(3);
		expect(result[0]?.alt).toContain("Vue 1 sur 3");
		expect(result[1]?.alt).toContain("Vue 2 sur 3");
		expect(result[2]?.alt).toContain("Vue 3 sur 3");
	});

	it("should include size in generated alt text", () => {
		const image = createMockImage({ id: "img-1", url: "https://utfs.io/f/img1.jpg" });
		const sku = createMockSku({
			id: "sku-1",
			material: { name: "Argent" },
			color: { name: "Argent" },
			size: "M",
			images: [image],
		});

		const product = createMockProduct({
			title: "Alliance",
			type: { label: "Bague" },
			skus: [sku],
		});

		const result = buildGallery({ product, selectedVariants: {} });

		expect(result[0]?.alt).toContain("Taille M");
	});

	it("should not duplicate color in alt text when color and material names are equal", () => {
		const image = createMockImage({ id: "img-1", url: "https://utfs.io/f/img1.jpg" });
		const sku = createMockSku({
			id: "sku-1",
			material: { name: "Argent" },
			color: { name: "Argent" },
			size: null,
			images: [image],
		});

		const product = createMockProduct({
			title: "Solitaire",
			type: { label: "Bague" },
			skus: [sku],
		});

		const result = buildGallery({ product, selectedVariants: {} });

		// "Argent" should appear exactly once in the characteristics part
		const alt = result[0]?.alt ?? "";
		const occurrences = alt.split("Argent").length - 1;
		expect(occurrences).toBe(1);
	});

	// -----------------------------------------------------------------------
	// Custom alt text from DB is preserved
	// -----------------------------------------------------------------------

	it("should preserve custom altText from database instead of generating one", () => {
		const image = createMockImage({
			id: "img-1",
			url: "https://utfs.io/f/img1.jpg",
			altText: "Photo personnalisee depuis la BDD",
		});
		const sku = createMockSku({ id: "sku-1", images: [image] });
		const product = createMockProduct({ skus: [sku] });

		const result = buildGallery({ product, selectedVariants: {} });

		expect(result[0]?.alt).toBe("Photo personnalisee depuis la BDD");
	});

	// -----------------------------------------------------------------------
	// SKU ID and media type passthrough
	// -----------------------------------------------------------------------

	it("should attach the correct skuId to each gallery item", () => {
		const image = createMockImage({ id: "img-1", url: "https://utfs.io/f/img1.jpg" });
		const sku = createMockSku({ id: "sku-abc", images: [image] });
		const product = createMockProduct({ skus: [sku] });

		const result = buildGallery({ product, selectedVariants: {} });

		expect(result[0]?.skuId).toBe("sku-abc");
	});

	it("should pass through the mediaType from the source image", () => {
		const image = createMockImage({
			id: "vid-1",
			url: "https://utfs.io/f/vid1.mp4",
			mediaType: "VIDEO" as const,
		});
		const sku = createMockSku({ id: "sku-1", images: [image] });
		const product = createMockProduct({ skus: [sku] });

		const result = buildGallery({ product, selectedVariants: {} });

		expect(result[0]?.mediaType).toBe("VIDEO");
	});

	// -----------------------------------------------------------------------
	// blurDataUrl handling
	// -----------------------------------------------------------------------

	it("should include blurDataUrl when present on the image", () => {
		const image = createMockImage({
			id: "img-1",
			url: "https://utfs.io/f/img1.jpg",
			blurDataUrl: "data:image/jpeg;base64,blur",
		});
		const sku = createMockSku({ id: "sku-1", images: [image] });
		const product = createMockProduct({ skus: [sku] });

		const result = buildGallery({ product, selectedVariants: {} });

		expect(result[0]?.blurDataUrl).toBe("data:image/jpeg;base64,blur");
	});

	it("should set blurDataUrl to undefined when image has no blur", () => {
		const image = createMockImage({
			id: "img-1",
			url: "https://utfs.io/f/img1.jpg",
			blurDataUrl: null,
		});
		const sku = createMockSku({ id: "sku-1", images: [image] });
		const product = createMockProduct({ skus: [sku] });

		const result = buildGallery({ product, selectedVariants: {} });

		expect(result[0]?.blurDataUrl).toBeUndefined();
	});

	// -----------------------------------------------------------------------
	// Fallback source field
	// -----------------------------------------------------------------------

	it("should set source 'default' on the fallback image", () => {
		const product = createMockProduct({ skus: [] });

		const result = buildGallery({ product, selectedVariants: {} });

		expect(result[0]?.source).toBe("default");
	});

	it("should set skuId to undefined on the fallback image", () => {
		const product = createMockProduct({ skus: [] });

		const result = buildGallery({ product, selectedVariants: {} });

		expect(result[0]?.skuId).toBeUndefined();
	});
});
