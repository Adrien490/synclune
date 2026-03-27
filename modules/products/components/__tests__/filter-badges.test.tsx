import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { useSearchParams } from "next/navigation";
import type { FilterDefinition as FilterDefinitionType } from "@/shared/hooks/use-filter";

// Hoisted mocks
const {
	mockRouter,
	mockSearchParams,
	mockOptimisticActiveFilters,
	mockRemoveFilterOptimistic,
	mockRemoveFiltersOptimistic,
	mockClearAllFiltersOptimistic,
	mockCreateProductFilterFormatter,
} = vi.hoisted(() => {
	const mockRouter = { replace: vi.fn() };
	const mockSearchParams = { toString: vi.fn(() => ""), forEach: vi.fn() } as unknown as ReturnType<
		typeof useSearchParams
	>;
	const mockOptimisticActiveFilters: FilterDefinitionType[] = [];
	const mockRemoveFilterOptimistic = vi.fn();
	const mockRemoveFiltersOptimistic = vi.fn();
	const mockClearAllFiltersOptimistic = vi.fn();
	const mockCreateProductFilterFormatter = vi.fn();

	return {
		mockRouter,
		mockSearchParams,
		mockOptimisticActiveFilters,
		mockRemoveFilterOptimistic,
		mockRemoveFiltersOptimistic,
		mockClearAllFiltersOptimistic,
		mockCreateProductFilterFormatter,
	};
});

vi.mock("next/navigation", () => ({
	useRouter: () => mockRouter,
	useSearchParams: () => mockSearchParams,
}));

vi.mock("@/shared/hooks/use-filter", () => ({
	useFilter: () => ({
		optimisticActiveFilters: mockOptimisticActiveFilters,
		removeFilterOptimistic: mockRemoveFilterOptimistic,
		removeFiltersOptimistic: mockRemoveFiltersOptimistic,
		clearAllFiltersOptimistic: mockClearAllFiltersOptimistic,
		isPending: false,
	}),
}));

vi.mock("@/modules/products/utils/format-product-filter", () => ({
	createProductFilterFormatter: mockCreateProductFilterFormatter,
}));

// Stub FilterBadges — captures its props so we can inspect them
vi.mock("@/shared/components/filter-badges", () => ({
	FilterBadges: ({
		activeFilters,
		onRemove,
		onClearAll,
		className,
	}: {
		activeFilters: FilterDefinitionType[];
		onRemove: (key: string, value?: string) => void;
		onClearAll: () => void;
		formatFilter: unknown;
		className?: string;
		compactMobile?: boolean;
	}) => (
		<div data-testid="filter-badges" className={className}>
			{activeFilters.map((f) => (
				<div key={f.id} data-testid={`filter-${f.key}`}>
					<span>{f.displayValue ?? String(f.value ?? "")}</span>
					<button
						onClick={() => onRemove(f.key, f.value as string | undefined)}
						aria-label={`Supprimer ${f.key}`}
					>
						×
					</button>
				</div>
			))}
			{activeFilters.length > 0 && (
				<button onClick={onClearAll} aria-label="Effacer tous les filtres">
					Tout effacer
				</button>
			)}
		</div>
	),
}));

import { ProductFilterBadges } from "../filter-badges";

afterEach(cleanup);

// ─── Fixtures ──────────────────────────────────────────────────────────────

const defaultColors = [
	{ id: "c1", name: "Argent", slug: "argent", hex: "#C0C0C0" },
	{ id: "c2", name: "Or", slug: "or", hex: "#FFD700" },
];

const defaultMaterials = [{ id: "m1", name: "Argent 925", slug: "argent-925" }];

function makeFilter(overrides: Partial<FilterDefinitionType> = {}): FilterDefinitionType {
	return {
		id: "color-argent",
		key: "color",
		value: "argent",
		label: "Couleur",
		displayValue: "Argent",
		...overrides,
	};
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ProductFilterBadges", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		// Reset the shared mutable array
		mockOptimisticActiveFilters.length = 0;
		mockSearchParams.toString = vi.fn(() => "");
		mockCreateProductFilterFormatter.mockReturnValue(
			vi.fn(() => ({ label: "Couleur", displayValue: "Argent" })),
		);
	});

	it("renders the FilterBadges component", () => {
		render(
			<ProductFilterBadges
				colors={defaultColors as Parameters<typeof ProductFilterBadges>[0]["colors"]}
				materials={defaultMaterials}
			/>,
		);

		expect(screen.getByTestId("filter-badges")).toBeInTheDocument();
	});

	it("passes className to FilterBadges", () => {
		render(
			<ProductFilterBadges
				colors={defaultColors as Parameters<typeof ProductFilterBadges>[0]["colors"]}
				materials={defaultMaterials}
				className="custom-class"
			/>,
		);

		expect(screen.getByTestId("filter-badges")).toHaveClass("custom-class");
	});

	it("shows optimistic active filters from useFilter", () => {
		mockOptimisticActiveFilters.push(makeFilter());

		render(
			<ProductFilterBadges
				colors={defaultColors as Parameters<typeof ProductFilterBadges>[0]["colors"]}
				materials={defaultMaterials}
			/>,
		);

		expect(screen.getByTestId("filter-color")).toBeInTheDocument();
	});

	describe("with activeProductType", () => {
		it("prepends a synthetic categoryType filter when activeProductType is provided", () => {
			render(
				<ProductFilterBadges
					colors={defaultColors as Parameters<typeof ProductFilterBadges>[0]["colors"]}
					materials={defaultMaterials}
					activeProductType={{ slug: "bagues", label: "Bagues" }}
				/>,
			);

			expect(screen.getByTestId("filter-categoryType")).toBeInTheDocument();
			expect(screen.getByText("Bagues")).toBeInTheDocument();
		});

		it("does not show categoryType filter when activeProductType is not provided", () => {
			render(
				<ProductFilterBadges
					colors={defaultColors as Parameters<typeof ProductFilterBadges>[0]["colors"]}
					materials={defaultMaterials}
				/>,
			);

			expect(screen.queryByTestId("filter-categoryType")).not.toBeInTheDocument();
		});
	});

	describe("handleRemove", () => {
		it("navigates to /produits when categoryType filter is removed", () => {
			mockSearchParams.toString = vi.fn(() => "color=argent");

			render(
				<ProductFilterBadges
					colors={defaultColors as Parameters<typeof ProductFilterBadges>[0]["colors"]}
					materials={defaultMaterials}
					activeProductType={{ slug: "bagues", label: "Bagues" }}
				/>,
			);

			const removeBtn = screen.getByRole("button", { name: "Supprimer categoryType" });
			fireEvent.click(removeBtn);

			expect(mockRouter.replace).toHaveBeenCalledOnce();
			const [url] = mockRouter.replace.mock.calls[0] as [string, unknown];
			expect(url).toContain("/produits");
		});

		it("removes both priceMin and priceMax when priceMin filter is removed", () => {
			mockOptimisticActiveFilters.push(
				makeFilter({
					id: "priceMin-val",
					key: "priceMin",
					value: "1000",
					label: "Prix min",
					displayValue: "10 €",
				}),
			);

			render(
				<ProductFilterBadges
					colors={defaultColors as Parameters<typeof ProductFilterBadges>[0]["colors"]}
					materials={defaultMaterials}
				/>,
			);

			const removeBtn = screen.getByRole("button", { name: "Supprimer priceMin" });
			fireEvent.click(removeBtn);

			expect(mockRemoveFiltersOptimistic).toHaveBeenCalledWith(["priceMin", "priceMax"]);
		});

		it("calls removeFilterOptimistic for standard filters", () => {
			mockOptimisticActiveFilters.push(makeFilter());

			render(
				<ProductFilterBadges
					colors={defaultColors as Parameters<typeof ProductFilterBadges>[0]["colors"]}
					materials={defaultMaterials}
				/>,
			);

			const removeBtn = screen.getByRole("button", { name: "Supprimer color" });
			fireEvent.click(removeBtn);

			expect(mockRemoveFilterOptimistic).toHaveBeenCalledWith("color", "argent");
		});
	});

	describe("handleClearAll", () => {
		it("navigates to /produits when clearing all with activeProductType", () => {
			mockOptimisticActiveFilters.push(makeFilter());

			render(
				<ProductFilterBadges
					colors={defaultColors as Parameters<typeof ProductFilterBadges>[0]["colors"]}
					materials={defaultMaterials}
					activeProductType={{ slug: "bagues", label: "Bagues" }}
				/>,
			);

			const clearBtn = screen.getByRole("button", { name: "Effacer tous les filtres" });
			fireEvent.click(clearBtn);

			expect(mockRouter.replace).toHaveBeenCalledWith("/produits", { scroll: false });
		});

		it("calls clearAllFiltersOptimistic when there is no activeProductType", () => {
			mockOptimisticActiveFilters.push(makeFilter());

			render(
				<ProductFilterBadges
					colors={defaultColors as Parameters<typeof ProductFilterBadges>[0]["colors"]}
					materials={defaultMaterials}
				/>,
			);

			const clearBtn = screen.getByRole("button", { name: "Effacer tous les filtres" });
			fireEvent.click(clearBtn);

			expect(mockClearAllFiltersOptimistic).toHaveBeenCalledOnce();
			expect(mockRouter.replace).not.toHaveBeenCalled();
		});
	});

	describe("createProductFilterFormatter", () => {
		it("calls createProductFilterFormatter with colors, materials, productTypes and searchParams", () => {
			const productTypes = [{ slug: "bagues", label: "Bagues" }];

			render(
				<ProductFilterBadges
					colors={defaultColors as Parameters<typeof ProductFilterBadges>[0]["colors"]}
					materials={defaultMaterials}
					productTypes={productTypes}
				/>,
			);

			expect(mockCreateProductFilterFormatter).toHaveBeenCalledWith(
				defaultColors,
				defaultMaterials,
				productTypes,
				mockSearchParams,
			);
		});

		it("uses empty array when productTypes is not provided", () => {
			render(
				<ProductFilterBadges
					colors={defaultColors as Parameters<typeof ProductFilterBadges>[0]["colors"]}
					materials={defaultMaterials}
				/>,
			);

			expect(mockCreateProductFilterFormatter).toHaveBeenCalledWith(
				defaultColors,
				defaultMaterials,
				[],
				mockSearchParams,
			);
		});
	});

	describe("categoryType filter formatting", () => {
		it("formats categoryType filter with label 'Type' and displayValue from activeProductType", () => {
			// We verify the synthetic filter injected has correct properties
			render(
				<ProductFilterBadges
					colors={defaultColors as Parameters<typeof ProductFilterBadges>[0]["colors"]}
					materials={defaultMaterials}
					activeProductType={{ slug: "colliers", label: "Colliers" }}
				/>,
			);

			expect(screen.getByText("Colliers")).toBeInTheDocument();
		});
	});
});
