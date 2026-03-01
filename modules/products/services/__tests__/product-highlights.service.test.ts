import { describe, it, expect } from "vitest";

import { generateHighlights } from "../product-highlights.service";
import type { GetProductReturn } from "../../types/product.types";

// ============================================================================
// HELPERS
// ============================================================================

function makeSku(
	overrides: Partial<{
		material: { id: string; name: string } | null;
		size: string | null;
		isActive: boolean;
	}> = {},
): GetProductReturn["skus"][0] {
	return {
		id: "sku-1",
		sku: "TEST-SKU",
		isActive: true,
		isDefault: true,
		inventory: 10,
		priceInclTax: 5000,
		compareAtPrice: null,
		size: null,
		color: null,
		material: null,
		images: [],
		...overrides,
	} as unknown as GetProductReturn["skus"][0];
}

function makeCollection(
	overrides: Partial<{
		status: string;
		name: string;
	}> = {},
): GetProductReturn["collections"][0] {
	return {
		collection: {
			id: "col-1",
			name: overrides.name ?? "Printemps",
			status: overrides.status ?? "PUBLIC",
			slug: "printemps",
		},
	} as unknown as GetProductReturn["collections"][0];
}

function makeProduct(
	overrides: Partial<{
		skus: GetProductReturn["skus"];
		collections: GetProductReturn["collections"];
	}> = {},
): GetProductReturn {
	return {
		id: "prod-1",
		title: "Bague en or",
		slug: "bague-en-or",
		skus: overrides.skus ?? [],
		collections: overrides.collections ?? [],
	} as unknown as GetProductReturn;
}

// ============================================================================
// generateHighlights
// ============================================================================

describe("generateHighlights", () => {
	it("should always include handmade highlight with priority 2", () => {
		const result = generateHighlights(makeProduct());
		const handmade = result.find((h) => h.id === "handmade");
		expect(handmade).toBeDefined();
		expect(handmade?.priority).toBe(2);
	});

	it("should always include french highlight with priority 3", () => {
		const result = generateHighlights(makeProduct());
		const french = result.find((h) => h.id === "french");
		expect(french).toBeDefined();
		expect(french?.priority).toBe(3);
	});

	it("should include material highlight when first sku has material", () => {
		const product = makeProduct({
			skus: [makeSku({ material: { id: "mat-1", name: "Argent 925" } })],
		});
		const result = generateHighlights(product);
		const material = result.find((h) => h.id === "material");
		expect(material).toBeDefined();
		expect(material?.label).toBe("Argent 925");
		expect(material?.priority).toBe(1);
	});

	it("should not include material highlight when first sku has no material", () => {
		const product = makeProduct({ skus: [makeSku({ material: null })] });
		const result = generateHighlights(product);
		expect(result.find((h) => h.id === "material")).toBeUndefined();
	});

	it("should not include material highlight when skus array is empty", () => {
		const product = makeProduct({ skus: [] });
		const result = generateHighlights(product);
		expect(result.find((h) => h.id === "material")).toBeUndefined();
	});

	it("should include adjustable highlight when any sku has ajustable size", () => {
		const product = makeProduct({
			skus: [makeSku({ size: "52" }), makeSku({ size: "Taille ajustable" })],
		});
		const result = generateHighlights(product);
		const adjustable = result.find((h) => h.id === "adjustable");
		expect(adjustable).toBeDefined();
		expect(adjustable?.priority).toBe(4);
	});

	it("should not include adjustable highlight when no sku has ajustable size", () => {
		const product = makeProduct({ skus: [makeSku({ size: "52" })] });
		const result = generateHighlights(product);
		expect(result.find((h) => h.id === "adjustable")).toBeUndefined();
	});

	it("should include collection highlight when product belongs to a PUBLIC collection", () => {
		const product = makeProduct({
			collections: [makeCollection({ name: "Printemps", status: "PUBLIC" })],
		});
		const result = generateHighlights(product);
		const collection = result.find((h) => h.id === "collection");
		expect(collection).toBeDefined();
		expect(collection?.label).toBe("Collection Printemps");
		expect(collection?.priority).toBe(5);
	});

	it("should not include collection highlight for non-PUBLIC collections", () => {
		const product = makeProduct({
			collections: [makeCollection({ status: "DRAFT" })],
		});
		const result = generateHighlights(product);
		expect(result.find((h) => h.id === "collection")).toBeUndefined();
	});

	it("should truncate long collection names with ellipsis", () => {
		const longName = "Une très très longue collection de printemps";
		const product = makeProduct({
			collections: [makeCollection({ name: longName, status: "PUBLIC" })],
		});
		const result = generateHighlights(product);
		const collection = result.find((h) => h.id === "collection");
		expect(collection?.label).toMatch(/^Collection .{1,20}…$/);
	});

	it("should not truncate collection names within the 20-char limit", () => {
		const shortName = "Éternel";
		const product = makeProduct({
			collections: [makeCollection({ name: shortName, status: "PUBLIC" })],
		});
		const result = generateHighlights(product);
		const collection = result.find((h) => h.id === "collection");
		expect(collection?.label).toBe(`Collection ${shortName}`);
	});

	it("should return highlights sorted by priority", () => {
		const product = makeProduct({
			skus: [makeSku({ material: { id: "mat-1", name: "Or 18k" }, size: "Taille ajustable" })],
			collections: [makeCollection({ status: "PUBLIC" })],
		});
		const result = generateHighlights(product);
		const priorities = result.map((h) => h.priority);
		expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
	});

	it("should return at most 5 highlights", () => {
		const product = makeProduct({
			skus: [makeSku({ material: { id: "mat-1", name: "Or 18k" }, size: "Taille ajustable" })],
			collections: [makeCollection({ status: "PUBLIC" })],
		});
		const result = generateHighlights(product);
		expect(result.length).toBeLessThanOrEqual(5);
	});
});
