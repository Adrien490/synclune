import { describe, it, expect } from "vitest";

import {
	validateProductForPublication,
	validatePublicProductCreation,
} from "./product-validation.service";

describe("validateProductForPublication", () => {
	const validProduct = {
		title: "Bague Lune",
		skus: [
			{
				id: "sku-1",
				isActive: true,
				inventory: 5,
				images: [{ id: "img-1" }],
			},
		],
	};

	it("should return valid for a complete product", () => {
		const result = validateProductForPublication(validProduct);
		expect(result).toEqual({ isValid: true, errorMessage: null });
	});

	it("should reject product with empty title", () => {
		const result = validateProductForPublication({ ...validProduct, title: "" });
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("titre");
	});

	it("should reject product with whitespace-only title", () => {
		const result = validateProductForPublication({ ...validProduct, title: "   " });
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("titre");
	});

	it("should reject product with no active SKUs", () => {
		const result = validateProductForPublication({
			...validProduct,
			skus: [{ id: "sku-1", isActive: false, inventory: 5, images: [{ id: "img-1" }] }],
		});
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("SKU actif");
	});

	it("should reject product with empty SKUs array", () => {
		const result = validateProductForPublication({ ...validProduct, skus: [] });
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("SKU actif");
	});

	it("should reject product with no stock on active SKUs", () => {
		const result = validateProductForPublication({
			...validProduct,
			skus: [{ id: "sku-1", isActive: true, inventory: 0, images: [{ id: "img-1" }] }],
		});
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("stock");
	});

	it("should reject product with no images on active SKUs", () => {
		const result = validateProductForPublication({
			...validProduct,
			skus: [{ id: "sku-1", isActive: true, inventory: 5, images: [] }],
		});
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("image");
	});

	it("should only consider active SKUs for stock check", () => {
		const result = validateProductForPublication({
			...validProduct,
			skus: [
				{ id: "sku-1", isActive: false, inventory: 10, images: [{ id: "img-1" }] },
				{ id: "sku-2", isActive: true, inventory: 3, images: [{ id: "img-2" }] },
			],
		});
		expect(result.isValid).toBe(true);
	});
});

describe("validatePublicProductCreation", () => {
	it("should return valid for active SKU", () => {
		const result = validatePublicProductCreation({ isActive: true });
		expect(result).toEqual({ isValid: true, errorMessage: null });
	});

	it("should reject inactive SKU", () => {
		const result = validatePublicProductCreation({ isActive: false });
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("SKU inactif");
	});
});
