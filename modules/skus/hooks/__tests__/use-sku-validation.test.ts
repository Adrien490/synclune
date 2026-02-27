import { describe, it, expect, vi } from "vitest"

// ---------------------------------------------------------------------------
// Mock sku-info-extraction so we control what extractVariantInfo returns
// ---------------------------------------------------------------------------

const { mockExtractVariantInfo } = vi.hoisted(() => ({
	mockExtractVariantInfo: vi.fn(),
}))

vi.mock("@/modules/skus/services/sku-info-extraction.service", () => ({
	extractVariantInfo: mockExtractVariantInfo,
}))

// ---------------------------------------------------------------------------
// Import under test (after mocks are set up)
// ---------------------------------------------------------------------------

import { useVariantValidation } from "../use-sku-validation"
import type { VariantSelection } from "../../types/sku.types"
import type { GetProductReturn } from "@/modules/products/types/product.types"
import type { ProductVariantInfo } from "@/shared/types/product-sku.types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a minimal product fixture.
 * The hook only reads product.skus.length and product.type.slug,
 * so we keep the shape thin.
 */
function makeProduct(
	overrides: {
		skusCount?: number
		typeSlug?: string | null
	} = {}
): GetProductReturn {
	const { skusCount = 2, typeSlug = "ring" } = overrides

	// Build a minimal array of skus of the requested length
	const skus = Array.from({ length: skusCount }, (_, i) => ({
		id: `sku-${i + 1}`,
	})) as unknown as GetProductReturn["skus"]

	return {
		id: "prod-1",
		title: "Test Product",
		slug: "test-product",
		skus,
		type: typeSlug !== null ? ({ id: "type-1", slug: typeSlug } as GetProductReturn["type"]) : null,
	} as unknown as GetProductReturn
}

/**
 * Default variant info with no variants (single-SKU product).
 */
function makeVariantInfo(overrides: Partial<ProductVariantInfo> = {}): ProductVariantInfo {
	return {
		availableColors: [],
		availableMaterials: [],
		availableSizes: [],
		priceRange: { min: 1000, max: 1000 },
		totalStock: 10,
		...overrides,
	}
}

const noSelection: VariantSelection = { color: null, material: null, size: null }
const fullSelection: VariantSelection = { color: "or-rose", material: "argent-925", size: "52" }

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useVariantValidation", () => {
	// -------------------------------------------------------------------------
	// Single-SKU product — nothing is required
	// -------------------------------------------------------------------------

	describe("single-SKU product (skus.length <= 1)", () => {
		it("is valid with no selection when there is only one SKU", () => {
			mockExtractVariantInfo.mockReturnValue(
				makeVariantInfo({
					availableColors: [{ id: "c1", name: "Or Rose", slug: "or-rose", availableSkus: 1 }],
					availableSizes: [{ size: "52", availableSkus: 1 }],
				})
			)

			const product = makeProduct({ skusCount: 1, typeSlug: "ring" })
			const { isValid, validationErrors } = useVariantValidation({
				product,
				selection: noSelection,
			})

			expect(isValid).toBe(true)
			expect(validationErrors).toHaveLength(0)
		})
	})

	// -------------------------------------------------------------------------
	// requiresColor
	// -------------------------------------------------------------------------

	describe("requiresColor", () => {
		it("is false when there is only one available color", () => {
			mockExtractVariantInfo.mockReturnValue(
				makeVariantInfo({
					availableColors: [{ id: "c1", name: "Or Rose", slug: "or-rose", availableSkus: 2 }],
				})
			)

			const product = makeProduct({ skusCount: 2 })
			const { requiresColor } = useVariantValidation({
				product,
				selection: noSelection,
			})

			expect(requiresColor).toBeFalsy()
		})

		it("is true when there are multiple available colors and multiple SKUs", () => {
			mockExtractVariantInfo.mockReturnValue(
				makeVariantInfo({
					availableColors: [
						{ id: "c1", name: "Or Rose", slug: "or-rose", availableSkus: 1 },
						{ id: "c2", name: "Argent", slug: "argent", availableSkus: 1 },
					],
				})
			)

			const product = makeProduct({ skusCount: 2 })
			const { requiresColor } = useVariantValidation({
				product,
				selection: noSelection,
			})

			expect(requiresColor).toBeTruthy()
		})

		it("produces a validation error when color is required but not selected", () => {
			mockExtractVariantInfo.mockReturnValue(
				makeVariantInfo({
					availableColors: [
						{ id: "c1", name: "Or Rose", slug: "or-rose", availableSkus: 1 },
						{ id: "c2", name: "Argent", slug: "argent", availableSkus: 1 },
					],
				})
			)

			const product = makeProduct({ skusCount: 2 })
			const { validationErrors, isValid } = useVariantValidation({
				product,
				selection: noSelection,
			})

			expect(isValid).toBe(false)
			expect(validationErrors).toContain("Veuillez sélectionner une couleur")
		})

		it("does not produce a color error when color is selected", () => {
			mockExtractVariantInfo.mockReturnValue(
				makeVariantInfo({
					availableColors: [
						{ id: "c1", name: "Or Rose", slug: "or-rose", availableSkus: 1 },
						{ id: "c2", name: "Argent", slug: "argent", availableSkus: 1 },
					],
				})
			)

			const product = makeProduct({ skusCount: 2 })
			const { validationErrors } = useVariantValidation({
				product,
				selection: { color: "or-rose", material: null, size: null },
			})

			expect(validationErrors).not.toContain("Veuillez sélectionner une couleur")
		})
	})

	// -------------------------------------------------------------------------
	// requiresMaterial
	// -------------------------------------------------------------------------

	describe("requiresMaterial", () => {
		it("is false when there is only one available material", () => {
			mockExtractVariantInfo.mockReturnValue(
				makeVariantInfo({
					availableMaterials: [{ name: "Argent 925", availableSkus: 2 }],
				})
			)

			const product = makeProduct({ skusCount: 2 })
			const { requiresMaterial } = useVariantValidation({
				product,
				selection: noSelection,
			})

			expect(requiresMaterial).toBeFalsy()
		})

		it("is true when there are multiple available materials and multiple SKUs", () => {
			mockExtractVariantInfo.mockReturnValue(
				makeVariantInfo({
					availableMaterials: [
						{ name: "Argent 925", availableSkus: 1 },
						{ name: "Or 18K", availableSkus: 1 },
					],
				})
			)

			const product = makeProduct({ skusCount: 2 })
			const { requiresMaterial } = useVariantValidation({
				product,
				selection: noSelection,
			})

			expect(requiresMaterial).toBeTruthy()
		})

		it("produces a validation error when material is required but not selected", () => {
			mockExtractVariantInfo.mockReturnValue(
				makeVariantInfo({
					availableMaterials: [
						{ name: "Argent 925", availableSkus: 1 },
						{ name: "Or 18K", availableSkus: 1 },
					],
				})
			)

			const product = makeProduct({ skusCount: 2 })
			const { validationErrors, isValid } = useVariantValidation({
				product,
				selection: noSelection,
			})

			expect(isValid).toBe(false)
			expect(validationErrors).toContain("Veuillez sélectionner un matériau")
		})

		it("does not produce a material error when material is selected", () => {
			mockExtractVariantInfo.mockReturnValue(
				makeVariantInfo({
					availableMaterials: [
						{ name: "Argent 925", availableSkus: 1 },
						{ name: "Or 18K", availableSkus: 1 },
					],
				})
			)

			const product = makeProduct({ skusCount: 2 })
			const { validationErrors } = useVariantValidation({
				product,
				selection: { color: null, material: "argent-925", size: null },
			})

			expect(validationErrors).not.toContain("Veuillez sélectionner un matériau")
		})
	})

	// -------------------------------------------------------------------------
	// requiresSize – product types requiring size
	// -------------------------------------------------------------------------

	describe("requiresSize", () => {
		it("is true for a ring (slug: ring) with multiple sizes and multiple SKUs", () => {
			mockExtractVariantInfo.mockReturnValue(
				makeVariantInfo({
					availableSizes: [
						{ size: "50", availableSkus: 1 },
						{ size: "52", availableSkus: 1 },
					],
				})
			)

			const product = makeProduct({ skusCount: 2, typeSlug: "ring" })
			const { requiresSize } = useVariantValidation({
				product,
				selection: noSelection,
			})

			expect(requiresSize).toBeTruthy()
		})

		it("is true for a bracelet (slug: bracelet) with multiple sizes", () => {
			mockExtractVariantInfo.mockReturnValue(
				makeVariantInfo({
					availableSizes: [
						{ size: "S", availableSkus: 1 },
						{ size: "M", availableSkus: 1 },
					],
				})
			)

			const product = makeProduct({ skusCount: 2, typeSlug: "bracelet" })
			const { requiresSize } = useVariantValidation({
				product,
				selection: noSelection,
			})

			expect(requiresSize).toBeTruthy()
		})

		it("is false for a necklace (slug: necklace) even with multiple sizes", () => {
			mockExtractVariantInfo.mockReturnValue(
				makeVariantInfo({
					availableSizes: [
						{ size: "40cm", availableSkus: 1 },
						{ size: "45cm", availableSkus: 1 },
					],
				})
			)

			const product = makeProduct({ skusCount: 2, typeSlug: "necklace" })
			const { requiresSize } = useVariantValidation({
				product,
				selection: noSelection,
			})

			expect(requiresSize).toBeFalsy()
		})

		it("is false when the product type is null", () => {
			mockExtractVariantInfo.mockReturnValue(
				makeVariantInfo({
					availableSizes: [
						{ size: "50", availableSkus: 1 },
						{ size: "52", availableSkus: 1 },
					],
				})
			)

			const product = makeProduct({ skusCount: 2, typeSlug: null })
			const { requiresSize } = useVariantValidation({
				product,
				selection: noSelection,
			})

			expect(requiresSize).toBeFalsy()
		})

		it("produces a validation error when size is required but not selected", () => {
			mockExtractVariantInfo.mockReturnValue(
				makeVariantInfo({
					availableSizes: [
						{ size: "50", availableSkus: 1 },
						{ size: "52", availableSkus: 1 },
					],
				})
			)

			const product = makeProduct({ skusCount: 2, typeSlug: "ring" })
			const { validationErrors, isValid } = useVariantValidation({
				product,
				selection: noSelection,
			})

			expect(isValid).toBe(false)
			expect(validationErrors).toContain("Veuillez sélectionner une taille")
		})

		it("does not produce a size error when size is selected", () => {
			mockExtractVariantInfo.mockReturnValue(
				makeVariantInfo({
					availableSizes: [
						{ size: "50", availableSkus: 1 },
						{ size: "52", availableSkus: 1 },
					],
				})
			)

			const product = makeProduct({ skusCount: 2, typeSlug: "ring" })
			const { validationErrors } = useVariantValidation({
				product,
				selection: { color: null, material: null, size: "52" },
			})

			expect(validationErrors).not.toContain("Veuillez sélectionner une taille")
		})
	})

	// -------------------------------------------------------------------------
	// Adjustable sizes — size is NOT required
	// -------------------------------------------------------------------------

	describe("adjustable sizes", () => {
		it("is false when all sizes include 'ajustable' (case-insensitive)", () => {
			mockExtractVariantInfo.mockReturnValue(
				makeVariantInfo({
					availableSizes: [
						{ size: "Ajustable", availableSkus: 1 },
						{ size: "ajustable large", availableSkus: 1 },
					],
				})
			)

			const product = makeProduct({ skusCount: 2, typeSlug: "ring" })
			const { requiresSize } = useVariantValidation({
				product,
				selection: noSelection,
			})

			expect(requiresSize).toBeFalsy()
		})

		it("is false when at least one size is adjustable even with non-adjustable sizes present", () => {
			mockExtractVariantInfo.mockReturnValue(
				makeVariantInfo({
					availableSizes: [
						{ size: "52", availableSkus: 1 },
						{ size: "Ajustable", availableSkus: 1 },
					],
				})
			)

			const product = makeProduct({ skusCount: 2, typeSlug: "ring" })
			const { requiresSize } = useVariantValidation({
				product,
				selection: noSelection,
			})

			// hasAdjustableSizes = true because at least one includes "ajustable"
			expect(requiresSize).toBeFalsy()
		})

		it("is false when no sizes are available at all for a ring", () => {
			mockExtractVariantInfo.mockReturnValue(
				makeVariantInfo({
					availableSizes: [],
				})
			)

			const product = makeProduct({ skusCount: 2, typeSlug: "ring" })
			const { requiresSize } = useVariantValidation({
				product,
				selection: noSelection,
			})

			// availableSizes.length === 0 → requiresSize is false
			expect(requiresSize).toBeFalsy()
		})
	})

	// -------------------------------------------------------------------------
	// Multiple concurrent validation errors
	// -------------------------------------------------------------------------

	describe("multiple validation errors", () => {
		it("accumulates errors for all missing required variants", () => {
			mockExtractVariantInfo.mockReturnValue(
				makeVariantInfo({
					availableColors: [
						{ id: "c1", name: "Or Rose", slug: "or-rose", availableSkus: 1 },
						{ id: "c2", name: "Argent", slug: "argent", availableSkus: 1 },
					],
					availableMaterials: [
						{ name: "Argent 925", availableSkus: 1 },
						{ name: "Or 18K", availableSkus: 1 },
					],
					availableSizes: [
						{ size: "50", availableSkus: 1 },
						{ size: "52", availableSkus: 1 },
					],
				})
			)

			const product = makeProduct({ skusCount: 3, typeSlug: "ring" })
			const { validationErrors, isValid } = useVariantValidation({
				product,
				selection: noSelection,
			})

			expect(isValid).toBe(false)
			expect(validationErrors).toHaveLength(3)
			expect(validationErrors).toContain("Veuillez sélectionner une couleur")
			expect(validationErrors).toContain("Veuillez sélectionner un matériau")
			expect(validationErrors).toContain("Veuillez sélectionner une taille")
		})

		it("is valid when all required variants are provided", () => {
			mockExtractVariantInfo.mockReturnValue(
				makeVariantInfo({
					availableColors: [
						{ id: "c1", name: "Or Rose", slug: "or-rose", availableSkus: 1 },
						{ id: "c2", name: "Argent", slug: "argent", availableSkus: 1 },
					],
					availableMaterials: [
						{ name: "Argent 925", availableSkus: 1 },
						{ name: "Or 18K", availableSkus: 1 },
					],
					availableSizes: [
						{ size: "50", availableSkus: 1 },
						{ size: "52", availableSkus: 1 },
					],
				})
			)

			const product = makeProduct({ skusCount: 3, typeSlug: "ring" })
			const { validationErrors, isValid } = useVariantValidation({
				product,
				selection: fullSelection,
			})

			expect(isValid).toBe(true)
			expect(validationErrors).toHaveLength(0)
		})
	})

	// -------------------------------------------------------------------------
	// Return shape
	// -------------------------------------------------------------------------

	describe("return shape", () => {
		it("always returns the five expected fields", () => {
			mockExtractVariantInfo.mockReturnValue(makeVariantInfo())
			const product = makeProduct({ skusCount: 1 })
			const result = useVariantValidation({ product, selection: noSelection })

			expect(result).toHaveProperty("validationErrors")
			expect(result).toHaveProperty("isValid")
			expect(result).toHaveProperty("requiresColor")
			expect(result).toHaveProperty("requiresMaterial")
			expect(result).toHaveProperty("requiresSize")
		})
	})
})
