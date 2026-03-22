import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockExtractVariantInfo,
	mockUseVariantValidation,
	mockUseSelectedSku,
	mockColorSelector,
	mockMaterialSelector,
	mockSizeSelector,
	mockSearchParamsGet,
} = vi.hoisted(() => ({
	mockExtractVariantInfo: vi.fn(),
	mockUseVariantValidation: vi.fn(),
	mockUseSelectedSku: vi.fn(),
	mockColorSelector: vi.fn(),
	mockMaterialSelector: vi.fn(),
	mockSizeSelector: vi.fn(),
	mockSearchParamsGet: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useSearchParams: () => ({
		get: mockSearchParamsGet,
	}),
}));

vi.mock("@/modules/skus/services/sku-info-extraction.service", () => ({
	extractVariantInfo: mockExtractVariantInfo,
}));

vi.mock("@/modules/skus/hooks/use-sku-validation", () => ({
	useVariantValidation: mockUseVariantValidation,
}));

vi.mock("@/modules/skus/hooks/use-selected-sku", () => ({
	useSelectedSku: mockUseSelectedSku,
}));

vi.mock("@/modules/colors/components/color-selector", () => ({
	ColorSelector: (props: Record<string, unknown>) => {
		mockColorSelector(props);
		return <div data-testid="color-selector" />;
	},
}));

vi.mock("@/modules/skus/components/material-selector", () => ({
	MaterialSelector: (props: Record<string, unknown>) => {
		mockMaterialSelector(props);
		return <div data-testid="material-selector" />;
	},
}));

vi.mock("@/modules/skus/components/size-selector", () => ({
	SizeSelector: (props: Record<string, unknown>) => {
		mockSizeSelector(props);
		return <div data-testid="size-selector" />;
	},
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { VariantSelector } from "../sku-selector";

// ============================================================================
// FIXTURES
// ============================================================================

function makeSku(id: string) {
	return {
		id,
		sku: `SKU-${id}`,
		productId: "prod_1",
		priceInclTax: 2999,
		compareAtPrice: null,
		inventory: 10,
		isActive: true,
		isDefault: id === "sku-1",
		color: { id: "color_1", slug: "or-rose", name: "Or Rose", hex: "#B76E79" },
		material: null,
		size: null,
		images: [],
	};
}

function makeProduct(skuCount: number) {
	const skus = Array.from({ length: skuCount }, (_, i) => makeSku(`sku-${i + 1}`));
	return {
		id: "prod_1",
		title: "Bague Étoile",
		slug: "bague-etoile",
		skus,
		type: { slug: "rings", label: "Bague" },
	};
}

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	mockSearchParamsGet.mockReturnValue(null);

	mockExtractVariantInfo.mockReturnValue({
		availableColors: [{ id: "or-rose", slug: "or-rose", name: "Or Rose", hex: "#B76E79" }],
		availableMaterials: [],
		availableSizes: [],
		priceRange: { min: 2999, max: 2999 },
		totalStock: 10,
	});

	mockUseVariantValidation.mockReturnValue({
		validationErrors: [],
		isValid: true,
		requiresColor: true,
		requiresMaterial: false,
		requiresSize: false,
	});

	mockUseSelectedSku.mockReturnValue({ selectedSku: null });
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ============================================================================
// TESTS
// ============================================================================

describe("VariantSelector", () => {
	describe("single SKU product", () => {
		it("returns null when product has only one SKU", () => {
			const product = makeProduct(1) as unknown as Parameters<typeof VariantSelector>[0]["product"];
			const { container } = render(<VariantSelector product={product} />);

			expect(container.firstChild).toBeNull();
		});
	});

	describe("multi-SKU product", () => {
		it("renders a card with title 'Choisissez vos options'", () => {
			const product = makeProduct(2) as unknown as Parameters<typeof VariantSelector>[0]["product"];
			render(<VariantSelector product={product} />);

			expect(screen.getByText("Choisissez vos options")).toBeInTheDocument();
		});

		it("renders ColorSelector always", () => {
			const product = makeProduct(2) as unknown as Parameters<typeof VariantSelector>[0]["product"];
			render(<VariantSelector product={product} />);

			expect(screen.getByTestId("color-selector")).toBeInTheDocument();
		});

		it("does not render MaterialSelector when only one material", () => {
			mockExtractVariantInfo.mockReturnValue({
				availableColors: [{ id: "or-rose", slug: "or-rose", name: "Or Rose", hex: "#B76E79" }],
				availableMaterials: [{ name: "Argent 925" }],
				availableSizes: [],
				priceRange: { min: 2999, max: 2999 },
				totalStock: 10,
			});

			const product = makeProduct(2) as unknown as Parameters<typeof VariantSelector>[0]["product"];
			render(<VariantSelector product={product} />);

			expect(screen.queryByTestId("material-selector")).not.toBeInTheDocument();
		});

		it("renders MaterialSelector when more than one material is available", () => {
			mockExtractVariantInfo.mockReturnValue({
				availableColors: [{ id: "or-rose", slug: "or-rose", name: "Or Rose", hex: "#B76E79" }],
				availableMaterials: [{ name: "Argent 925" }, { name: "Or 18k" }],
				availableSizes: [],
				priceRange: { min: 2999, max: 4999 },
				totalStock: 20,
			});

			const product = makeProduct(2) as unknown as Parameters<typeof VariantSelector>[0]["product"];
			render(<VariantSelector product={product} />);

			expect(screen.getByTestId("material-selector")).toBeInTheDocument();
		});

		it("does not render SizeSelector when requiresSize is false", () => {
			mockUseVariantValidation.mockReturnValue({
				validationErrors: [],
				isValid: true,
				requiresColor: true,
				requiresMaterial: false,
				requiresSize: false,
			});

			const product = makeProduct(2) as unknown as Parameters<typeof VariantSelector>[0]["product"];
			render(<VariantSelector product={product} />);

			expect(screen.queryByTestId("size-selector")).not.toBeInTheDocument();
		});

		it("renders SizeSelector when requiresSize is true and sizes are available", () => {
			mockExtractVariantInfo.mockReturnValue({
				availableColors: [{ id: "or-rose", slug: "or-rose", name: "Or Rose", hex: "#B76E79" }],
				availableMaterials: [],
				availableSizes: [{ size: "50" }, { size: "52" }],
				priceRange: { min: 2999, max: 2999 },
				totalStock: 20,
			});

			mockUseVariantValidation.mockReturnValue({
				validationErrors: [],
				isValid: false,
				requiresColor: true,
				requiresMaterial: false,
				requiresSize: true,
			});

			const product = makeProduct(2) as unknown as Parameters<typeof VariantSelector>[0]["product"];
			render(<VariantSelector product={product} />);

			expect(screen.getByTestId("size-selector")).toBeInTheDocument();
		});

		it("renders an ARIA live region for availability announcements", () => {
			const product = makeProduct(2) as unknown as Parameters<typeof VariantSelector>[0]["product"];
			render(<VariantSelector product={product} />);

			const liveRegion = document.querySelector("[aria-live='polite']");

			expect(liveRegion).toBeInTheDocument();
		});
	});
});
