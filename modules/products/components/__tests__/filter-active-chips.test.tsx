import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

const mockHaptic = vi.fn();
vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

vi.mock("@/shared/components/scroll-fade", () => ({
	default: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="scroll-fade">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children }: { children: React.ReactNode }) => (
		<span data-testid="badge">{children}</span>
	),
}));

vi.mock("lucide-react", () => ({
	X: ({ className }: { className?: string }) => <span data-testid="x-icon" className={className} />,
}));

// ============================================================================
// IMPORT (after mocks)
// ============================================================================

import { FilterActiveChips, type FilterChipDescriptor } from "../filter-active-chips";

// ============================================================================
// TEST DATA
// ============================================================================

const baseDate = new Date("2026-01-01");

const colors = [
	{
		id: "c-or",
		slug: "or",
		name: "Or",
		hex: "#FFD700",
		isActive: true,
		position: 0,
		createdAt: baseDate,
		updatedAt: baseDate,
		_count: { skus: 10 },
	},
];

const materials = [{ id: "m-acier", slug: "acier", name: "Acier", _count: { skus: 15 } }];

const productTypes = [{ slug: "bagues", label: "Bagues", _count: { products: 20 } }];

const DEFAULT_PRICE_RANGE: [number, number] = [0, 500];

const emptyFormData = {
	colors: [] as string[],
	materials: [] as string[],
	productTypes: [] as string[],
	priceRange: DEFAULT_PRICE_RANGE,
	ratingMin: null,
	inStockOnly: false,
	onSale: false,
};

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("FilterActiveChips", () => {
	it("renders nothing when no filters are active", () => {
		const { container } = render(
			<FilterActiveChips
				formData={emptyFormData}
				colors={colors}
				materials={materials}
				productTypes={productTypes}
				defaultPriceRange={DEFAULT_PRICE_RANGE}
				onRemove={vi.fn()}
			/>,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders a chip for each active product type", () => {
		render(
			<FilterActiveChips
				formData={{ ...emptyFormData, productTypes: ["bagues"] }}
				colors={colors}
				materials={materials}
				productTypes={productTypes}
				defaultPriceRange={DEFAULT_PRICE_RANGE}
				onRemove={vi.fn()}
			/>,
		);
		expect(screen.getByText("Bagues")).toBeInTheDocument();
	});

	it("renders color chip with swatch", () => {
		render(
			<FilterActiveChips
				formData={{ ...emptyFormData, colors: ["or"] }}
				colors={colors}
				materials={materials}
				productTypes={productTypes}
				defaultPriceRange={DEFAULT_PRICE_RANGE}
				onRemove={vi.fn()}
			/>,
		);
		expect(screen.getByText("Or")).toBeInTheDocument();
	});

	it("renders price chip only when priceRange differs from default", () => {
		const { rerender, container } = render(
			<FilterActiveChips
				formData={emptyFormData}
				colors={colors}
				materials={materials}
				productTypes={productTypes}
				defaultPriceRange={DEFAULT_PRICE_RANGE}
				onRemove={vi.fn()}
			/>,
		);
		expect(container.firstChild).toBeNull();

		rerender(
			<FilterActiveChips
				formData={{ ...emptyFormData, priceRange: [50, 300] }}
				colors={colors}
				materials={materials}
				productTypes={productTypes}
				defaultPriceRange={DEFAULT_PRICE_RANGE}
				onRemove={vi.fn()}
			/>,
		);
		expect(screen.getByText("50€ — 300€")).toBeInTheDocument();
	});

	it("renders rating chip with stars", () => {
		render(
			<FilterActiveChips
				formData={{ ...emptyFormData, ratingMin: 4 }}
				colors={colors}
				materials={materials}
				productTypes={productTypes}
				defaultPriceRange={DEFAULT_PRICE_RANGE}
				onRemove={vi.fn()}
			/>,
		);
		expect(screen.getByText("4+ ★")).toBeInTheDocument();
	});

	it("renders stock + sale chips when toggles active", () => {
		render(
			<FilterActiveChips
				formData={{ ...emptyFormData, inStockOnly: true, onSale: true }}
				colors={colors}
				materials={materials}
				productTypes={productTypes}
				defaultPriceRange={DEFAULT_PRICE_RANGE}
				onRemove={vi.fn()}
			/>,
		);
		expect(screen.getByText("En stock")).toBeInTheDocument();
		expect(screen.getByText("En promotion")).toBeInTheDocument();
	});

	it("fires onRemove with matching descriptor when chip clicked", () => {
		const onRemove = vi.fn();
		render(
			<FilterActiveChips
				formData={{ ...emptyFormData, colors: ["or"] }}
				colors={colors}
				materials={materials}
				productTypes={productTypes}
				defaultPriceRange={DEFAULT_PRICE_RANGE}
				onRemove={onRemove}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: /Supprimer le filtre Or/i }));
		expect(onRemove).toHaveBeenCalledTimes(1);
		const descriptor = onRemove.mock.calls[0]![0] as FilterChipDescriptor;
		expect(descriptor.kind).toBe("color");
		if (descriptor.kind === "color") expect(descriptor.slug).toBe("or");
	});

	it("fires haptic('light') on remove", () => {
		render(
			<FilterActiveChips
				formData={{ ...emptyFormData, inStockOnly: true }}
				colors={colors}
				materials={materials}
				productTypes={productTypes}
				defaultPriceRange={DEFAULT_PRICE_RANGE}
				onRemove={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: /Supprimer le filtre En stock/i }));
		expect(mockHaptic).toHaveBeenCalledWith("light");
	});

	it("uses slug as label fallback when lookup misses", () => {
		render(
			<FilterActiveChips
				formData={{ ...emptyFormData, materials: ["unknown-slug"] }}
				colors={colors}
				materials={materials}
				productTypes={productTypes}
				defaultPriceRange={DEFAULT_PRICE_RANGE}
				onRemove={vi.fn()}
			/>,
		);
		expect(screen.getByText("unknown-slug")).toBeInTheDocument();
	});

	it("exposes aria-label with total chip count on section", () => {
		render(
			<FilterActiveChips
				formData={{
					...emptyFormData,
					colors: ["or"],
					inStockOnly: true,
					onSale: true,
				}}
				colors={colors}
				materials={materials}
				productTypes={productTypes}
				defaultPriceRange={DEFAULT_PRICE_RANGE}
				onRemove={vi.fn()}
			/>,
		);
		expect(screen.getByRole("region", { name: "Filtres actifs : 3" })).toBeInTheDocument();
	});
});
