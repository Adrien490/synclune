import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("@/modules/media/constants/product-fallback-image.constants", () => ({
	FALLBACK_PRODUCT_IMAGE: {
		id: "fallback-image",
		url: "data:image/svg+xml;base64,fallback",
		alt: "Photo du produit à venir - En préparation",
		mediaType: "IMAGE" as const,
		blurDataUrl: undefined,
	},
}));

vi.mock("@/modules/media/constants/media.constants", () => ({
	MAX_GALLERY_IMAGES: 20,
}));

vi.mock("@/modules/skus/services/sku-variant-finder.service", () => ({
	findSkuByVariants: vi.fn(),
}));

import { buildGallery } from "../gallery-builder.service";
import { findSkuByVariants } from "@/modules/skus/services/sku-variant-finder.service";

// ============================================================================
// Helpers
// ============================================================================

function makeImage(id: string, url: string, mediaType: "IMAGE" | "VIDEO" = "IMAGE") {
	return {
		id,
		url,
		thumbnailUrl: null,
		blurDataUrl: null,
		altText: null as string | null,
		mediaType,
	};
}

function makeSku(
	id: string,
	images: ReturnType<typeof makeImage>[],
	overrides: Record<string, unknown> = {},
) {
	return {
		id,
		isActive: true,
		images,
		material: { name: "Argent" },
		color: { name: "Rose" },
		size: null,
		...overrides,
	};
}

function makeProduct(skus: ReturnType<typeof makeSku>[], overrides: Record<string, unknown> = {}) {
	return {
		title: "Bague Éclat",
		type: { label: "Bague" },
		skus,
		...overrides,
	};
}

// ============================================================================
// buildGallery
// ============================================================================

describe("buildGallery", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ---- Fallback ----

	it("returns fallback image when product has no SKUs", () => {
		const product = makeProduct([]);
		const result = buildGallery({ product: product as never, selectedVariants: {} });

		expect(result).toHaveLength(1);
		expect(result[0]!.id).toBe("fallback-image");
		expect(result[0]!.source).toBe("default");
		expect(result[0]!.skuId).toBeUndefined();
	});

	it("includes product type in fallback alt text", () => {
		const product = makeProduct([]);
		const result = buildGallery({ product: product as never, selectedVariants: {} });

		expect(result[0]!.alt).toBe("Bague Bague Éclat - Image bientôt disponible");
	});

	it("uses product title only in fallback alt when no type", () => {
		const product = makeProduct([], { type: null });
		const result = buildGallery({ product: product as never, selectedVariants: {} });

		expect(result[0]!.alt).toBe("Bague Éclat - Image bientôt disponible");
	});

	it("returns fallback when SKU has empty images array", () => {
		const product = makeProduct([makeSku("sku-1", [])]);
		const result = buildGallery({ product: product as never, selectedVariants: {} });

		expect(result).toHaveLength(1);
		expect(result[0]!.id).toBe("fallback-image");
	});

	// ---- Priority 1: Selected SKU images ----

	it("uses selected SKU images first", () => {
		const selectedSku = makeSku("sku-selected", [
			makeImage("img-1", "https://utfs.io/f/a.jpg"),
			makeImage("img-2", "https://utfs.io/f/b.jpg"),
		]);
		const defaultSku = makeSku("sku-default", [makeImage("img-3", "https://utfs.io/f/c.jpg")]);
		const product = makeProduct([defaultSku, selectedSku]);

		vi.mocked(findSkuByVariants).mockReturnValue(selectedSku as never);

		const result = buildGallery({
			product: product as never,
			selectedVariants: { colorSlug: "rose" },
		});

		expect(result[0]!.url).toBe("https://utfs.io/f/a.jpg");
		expect(result[0]!.source).toBe("selected");
		expect(result[0]!.skuId).toBe("sku-selected");
		expect(result[1]!.url).toBe("https://utfs.io/f/b.jpg");
	});

	it("does not search variants when no variant selectors are provided", () => {
		const sku = makeSku("sku-1", [makeImage("img-1", "https://utfs.io/f/a.jpg")]);
		const product = makeProduct([sku]);

		const result = buildGallery({ product: product as never, selectedVariants: {} });

		expect(findSkuByVariants).not.toHaveBeenCalled();
		expect(result[0]!.source).toBe("default");
	});

	// ---- Priority 2: Default SKU images ----

	it("fills from default SKU (product.skus[0]) after selected SKU", () => {
		const selectedSku = makeSku("sku-selected", [makeImage("img-1", "https://utfs.io/f/a.jpg")]);
		const defaultSku = makeSku("sku-default", [
			makeImage("img-2", "https://utfs.io/f/b.jpg"),
			makeImage("img-3", "https://utfs.io/f/c.jpg"),
		]);
		const product = makeProduct([defaultSku, selectedSku]);

		vi.mocked(findSkuByVariants).mockReturnValue(selectedSku as never);

		const result = buildGallery({
			product: product as never,
			selectedVariants: { colorSlug: "rose" },
		});

		expect(result).toHaveLength(3);
		expect(result[0]!.source).toBe("selected");
		expect(result[1]!.source).toBe("default");
		expect(result[2]!.source).toBe("default");
	});

	it("skips default SKU when it is the same as selected SKU", () => {
		const sku = makeSku("sku-1", [makeImage("img-1", "https://utfs.io/f/a.jpg")]);
		const product = makeProduct([sku]);

		vi.mocked(findSkuByVariants).mockReturnValue(sku as never);

		const result = buildGallery({
			product: product as never,
			selectedVariants: { colorSlug: "rose" },
		});

		// Should NOT duplicate images from same SKU
		expect(result).toHaveLength(1);
	});

	// ---- Priority 3: Other active SKU images ----

	it("fills from other active SKUs when gallery has < 5 images", () => {
		const defaultSku = makeSku("sku-1", [
			makeImage("img-1", "https://utfs.io/f/a.jpg"),
			makeImage("img-2", "https://utfs.io/f/b.jpg"),
		]);
		const otherSku = makeSku("sku-2", [
			makeImage("img-3", "https://utfs.io/f/c.jpg"),
			makeImage("img-4", "https://utfs.io/f/d.jpg"),
		]);
		const product = makeProduct([defaultSku, otherSku]);

		const result = buildGallery({ product: product as never, selectedVariants: {} });

		expect(result).toHaveLength(4);
		expect(result[2]!.source).toBe("sku");
		expect(result[2]!.skuId).toBe("sku-2");
	});

	it("does not fill from other SKUs when gallery has >= 5 images", () => {
		const images = Array.from({ length: 6 }, (_, i) =>
			makeImage(`img-${i}`, `https://utfs.io/f/${i}.jpg`),
		);
		const defaultSku = makeSku("sku-1", images);
		const otherSku = makeSku("sku-2", [makeImage("extra", "https://utfs.io/f/extra.jpg")]);
		const product = makeProduct([defaultSku, otherSku]);

		const result = buildGallery({ product: product as never, selectedVariants: {} });

		// Should only have images from default SKU, not other SKU
		expect(result.every((m) => m.source !== "sku")).toBe(true);
	});

	it("skips inactive SKUs when filling", () => {
		const defaultSku = makeSku("sku-1", [makeImage("img-1", "https://utfs.io/f/a.jpg")]);
		const inactiveSku = makeSku("sku-2", [makeImage("img-2", "https://utfs.io/f/b.jpg")], {
			isActive: false,
		});
		const product = makeProduct([defaultSku, inactiveSku]);

		const result = buildGallery({ product: product as never, selectedVariants: {} });

		expect(result).toHaveLength(1);
	});

	// ---- Deduplication ----

	it("deduplicates images by URL across SKUs", () => {
		const sharedUrl = "https://utfs.io/f/shared.jpg";
		const defaultSku = makeSku("sku-1", [makeImage("img-1", sharedUrl)]);
		const otherSku = makeSku("sku-2", [makeImage("img-2", sharedUrl)]);
		const product = makeProduct([defaultSku, otherSku]);

		const result = buildGallery({ product: product as never, selectedVariants: {} });

		expect(result).toHaveLength(1);
	});

	// ---- MAX_GALLERY_IMAGES cap ----

	it("caps gallery at MAX_GALLERY_IMAGES (20)", () => {
		const images = Array.from({ length: 25 }, (_, i) =>
			makeImage(`img-${i}`, `https://utfs.io/f/${i}.jpg`),
		);
		const defaultSku = makeSku("sku-1", images);
		const product = makeProduct([defaultSku]);

		const result = buildGallery({ product: product as never, selectedVariants: {} });

		expect(result).toHaveLength(20);
	});

	// ---- Alt text generation ----

	it("generates alt text with product type and variant info", () => {
		const sku = makeSku("sku-1", [makeImage("img-1", "https://utfs.io/f/a.jpg")], {
			material: { name: "Or" },
			color: { name: "Rose" },
		});
		const product = makeProduct([sku]);

		const result = buildGallery({ product: product as never, selectedVariants: {} });

		expect(result[0]!.alt).toBe("Bague Bague Éclat en Or Rose - Photo 1");
	});

	it("avoids duplicate color/material in alt text", () => {
		const sku = makeSku("sku-1", [makeImage("img-1", "https://utfs.io/f/a.jpg")], {
			material: { name: "Or Rose" },
			color: { name: "Or Rose" }, // same as material
		});
		const product = makeProduct([sku]);

		const result = buildGallery({ product: product as never, selectedVariants: {} });

		// Should not repeat "Or Rose" twice
		expect(result[0]!.alt).toBe("Bague Bague Éclat en Or Rose - Photo 1");
	});

	it("includes size in alt text when present", () => {
		const sku = makeSku("sku-1", [makeImage("img-1", "https://utfs.io/f/a.jpg")], {
			material: { name: "Argent" },
			color: null,
			size: "52",
		});
		const product = makeProduct([sku]);

		const result = buildGallery({ product: product as never, selectedVariants: {} });

		expect(result[0]!.alt).toContain("Taille 52");
	});

	it("uses manually defined alt text from DB when available", () => {
		const sku = makeSku("sku-1", [
			{
				...makeImage("img-1", "https://utfs.io/f/a.jpg"),
				altText: "Custom alt from DB",
			},
		]);
		const product = makeProduct([sku]);

		const result = buildGallery({ product: product as never, selectedVariants: {} });

		expect(result[0]!.alt).toBe("Custom alt from DB");
	});

	it("updates 'Photo X' to 'Vue X sur Y' when gallery has multiple images", () => {
		const images = Array.from({ length: 3 }, (_, i) =>
			makeImage(`img-${i}`, `https://utfs.io/f/${i}.jpg`),
		);
		const sku = makeSku("sku-1", images);
		const product = makeProduct([sku]);

		const result = buildGallery({ product: product as never, selectedVariants: {} });

		expect(result[0]!.alt).toContain("Vue 1 sur 3");
		expect(result[1]!.alt).toContain("Vue 2 sur 3");
		expect(result[2]!.alt).toContain("Vue 3 sur 3");
	});

	it("keeps 'Photo X' format when gallery has only one image", () => {
		const sku = makeSku("sku-1", [makeImage("img-1", "https://utfs.io/f/a.jpg")]);
		const product = makeProduct([sku]);

		const result = buildGallery({ product: product as never, selectedVariants: {} });

		expect(result[0]!.alt).toContain("Photo 1");
		expect(result[0]!.alt).not.toContain("sur");
	});

	// ---- Video support ----

	it("includes video media in gallery", () => {
		const sku = makeSku("sku-1", [makeImage("vid-1", "https://utfs.io/f/video.mp4", "VIDEO")]);
		const product = makeProduct([sku]);

		const result = buildGallery({ product: product as never, selectedVariants: {} });

		expect(result[0]!.mediaType).toBe("VIDEO");
	});

	// ---- Variant selectors ----

	it("passes materialSlug to findSkuByVariants", () => {
		const sku = makeSku("sku-1", [makeImage("img-1", "https://utfs.io/f/a.jpg")]);
		const product = makeProduct([sku]);

		vi.mocked(findSkuByVariants).mockReturnValue(null);

		buildGallery({
			product: product as never,
			selectedVariants: { materialSlug: "or-rose" },
		});

		expect(findSkuByVariants).toHaveBeenCalledWith(product, {
			colorSlug: undefined,
			materialSlug: "or-rose",
			size: undefined,
		});
	});

	it("passes size to findSkuByVariants", () => {
		const sku = makeSku("sku-1", [makeImage("img-1", "https://utfs.io/f/a.jpg")]);
		const product = makeProduct([sku]);

		vi.mocked(findSkuByVariants).mockReturnValue(null);

		buildGallery({
			product: product as never,
			selectedVariants: { size: "52" },
		});

		expect(findSkuByVariants).toHaveBeenCalledWith(product, {
			colorSlug: undefined,
			materialSlug: undefined,
			size: "52",
		});
	});
});
