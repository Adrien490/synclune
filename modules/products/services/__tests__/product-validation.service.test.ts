import { describe, it, expect } from "vitest";

import {
	validateProductForPublication,
	validatePublicProductCreation,
} from "../product-validation.service";

describe("validateProductForPublication", () => {
	// Schéma lean : le média vit sur le PRODUIT (plus sur la variante).
	const validProduct = {
		name: "Bague Lune",
		variants: [
			{
				id: "variant-1",
				active: true,
				stock: 5,
			},
		],
		media: [{ type: "IMAGE" }],
	};

	it("should return valid for a complete product", () => {
		const result = validateProductForPublication(validProduct);
		expect(result).toEqual({ isValid: true, errorMessage: null });
	});

	it("should reject product with empty name", () => {
		const result = validateProductForPublication({ ...validProduct, name: "" });
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("nom");
	});

	it("should reject product with whitespace-only name", () => {
		const result = validateProductForPublication({ ...validProduct, name: "   " });
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("nom");
	});

	it("should reject product with no active variants", () => {
		const result = validateProductForPublication({
			...validProduct,
			variants: [{ id: "variant-1", active: false, stock: 5 }],
		});
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("variante active");
	});

	it("should reject product with empty variants array", () => {
		const result = validateProductForPublication({ ...validProduct, variants: [] });
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("variante active");
	});

	it("should reject product with no stock on active variants", () => {
		const result = validateProductForPublication({
			...validProduct,
			variants: [{ id: "variant-1", active: true, stock: 0 }],
		});
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("stock");
	});

	it("should reject product with no media", () => {
		const result = validateProductForPublication({ ...validProduct, media: [] });
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("image");
	});

	it("should only consider active variants for stock check", () => {
		const result = validateProductForPublication({
			...validProduct,
			variants: [
				{ id: "variant-1", active: false, stock: 10 },
				{ id: "variant-2", active: true, stock: 3 },
			],
		});
		expect(result.isValid).toBe(true);
	});

	// MEDIA-AUDIT-002 : une video ne compte pas comme image principale.
	it("should reject a product whose only media is a video", () => {
		const result = validateProductForPublication({
			...validProduct,
			media: [{ type: "VIDEO" }],
		});
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("image");
	});

	// MEDIA-AUDIT-002 : un produit avec video + image reste publiable (l'image suffit).
	it("should accept a product mixing a video and an image", () => {
		const result = validateProductForPublication({
			...validProduct,
			media: [{ type: "VIDEO" }, { type: "IMAGE" }],
		});
		expect(result.isValid).toBe(true);
	});
});

describe("validatePublicProductCreation", () => {
	it("should return valid for active variant with stock", () => {
		const result = validatePublicProductCreation({ active: true, stock: 5 });
		expect(result).toEqual({ isValid: true, errorMessage: null });
	});

	it("should reject inactive variant", () => {
		const result = validatePublicProductCreation({ active: false, stock: 5 });
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("variante inactive");
	});

	it("should reject variant with zero stock", () => {
		const result = validatePublicProductCreation({ active: true, stock: 0 });
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("stock");
	});

	it("should reject variant with negative stock", () => {
		const result = validatePublicProductCreation({ active: true, stock: -1 });
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("stock");
	});

	it("should check active before stock", () => {
		const result = validatePublicProductCreation({ active: false, stock: 0 });
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("variante inactive");
	});
});
