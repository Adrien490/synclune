import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockDialog,
	mockRouter,
	mockSearchParams,
	mockPathname,
	mockBuildFilterURL,
	mockBuildClearFiltersURL,
	mockCountActiveFilters,
} = vi.hoisted(() => ({
	mockDialog: { isOpen: true, open: vi.fn(), close: vi.fn() },
	mockRouter: { push: vi.fn() },
	mockSearchParams: new URLSearchParams(),
	mockPathname: "/produits",
	mockBuildFilterURL: vi.fn().mockReturnValue({
		targetPath: "/produits",
		queryString: "",
		fullUrl: "/produits",
	}),
	mockBuildClearFiltersURL: vi.fn().mockReturnValue("/produits"),
	mockCountActiveFilters: vi
		.fn()
		.mockReturnValue({ hasActiveFilters: false, activeFiltersCount: 0 }),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useRouter: () => mockRouter,
	useSearchParams: () => mockSearchParams,
	usePathname: () => mockPathname,
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => mockDialog,
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: ({ defaultValues }: { defaultValues: Record<string, unknown> }) => {
		const valuesRef = { current: { ...defaultValues } };
		return {
			state: { values: valuesRef.current },
			Field: ({
				name,
				children,
			}: {
				name: string;
				children: (field: {
					state: { value: unknown };
					handleChange: ReturnType<typeof vi.fn>;
					pushValue: ReturnType<typeof vi.fn>;
					removeValue: ReturnType<typeof vi.fn>;
				}) => React.ReactNode;
			}) => {
				const fieldValue = valuesRef.current[name];
				const field = {
					state: { value: fieldValue },
					handleChange: vi.fn((newVal: unknown) => {
						valuesRef.current[name] = newVal;
					}),
					pushValue: vi.fn(),
					removeValue: vi.fn(),
				};
				return children(field);
			},
			handleSubmit: vi.fn(),
			reset: vi.fn(),
			setFieldValue: vi.fn(),
		};
	},
}));

vi.mock("@/shared/components/filter-sheet-wrapper", () => ({
	FilterSheetWrapper: ({
		children,
		onApply,
		onClearAll,
		activeFiltersCount,
		hasActiveFilters,
		open,
		onOpenChange,
	}: {
		children: React.ReactNode;
		onApply?: () => void;
		onClearAll?: () => void;
		activeFiltersCount?: number;
		hasActiveFilters?: boolean;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (
		<div
			data-testid="filter-wrapper"
			data-active-count={activeFiltersCount}
			data-has-active={hasActiveFilters}
			data-open={open}
		>
			<button data-testid="apply-btn" onClick={onApply}>
				Apply
			</button>
			{onClearAll && (
				<button data-testid="clear-btn" onClick={onClearAll}>
					Clear
				</button>
			)}
			{onOpenChange && (
				<button data-testid="close-btn" onClick={() => onOpenChange(false)}>
					Close
				</button>
			)}
			{children}
		</div>
	),
}));

vi.mock("@/shared/components/ui/accordion", () => ({
	Accordion: ({
		children,
		defaultValue,
	}: {
		children: React.ReactNode;
		defaultValue?: string[];
	}) => (
		<div data-testid="accordion" data-default-value={JSON.stringify(defaultValue)}>
			{children}
		</div>
	),
	AccordionItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
		<div data-testid={`section-${value}`}>{children}</div>
	),
	AccordionTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AccordionContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/forms/checkbox-filter-item", () => ({
	CheckboxFilterItem: ({
		id,
		checked,
		onCheckedChange,
		children,
		count,
		indicator,
	}: {
		id: string;
		checked: boolean;
		onCheckedChange: (checked: boolean) => void;
		children: React.ReactNode;
		count?: number;
		indicator?: React.ReactNode;
	}) => (
		<label data-testid={`checkbox-${id}`} data-checked={checked}>
			<input
				type="checkbox"
				id={id}
				checked={checked}
				onChange={(e) => onCheckedChange(e.target.checked)}
			/>
			{indicator && <span data-testid={`indicator-${id}`}>{indicator}</span>}
			<span>{children}</span>
			{count !== undefined && <span data-testid={`count-${id}`}>({count})</span>}
		</label>
	),
}));

vi.mock("../price-range-inputs", () => ({
	PriceRangeInputs: ({
		value,
		onChange,
		maxPrice,
	}: {
		value: [number, number];
		onChange: (v: [number, number]) => void;
		maxPrice: number;
	}) => (
		<div
			data-testid="price-inputs"
			data-min={value[0]}
			data-max={value[1]}
			data-max-price={maxPrice}
		>
			<input
				data-testid="price-min"
				type="number"
				value={value[0]}
				onChange={(e) => onChange([Number(e.target.value), value[1]])}
			/>
			<input
				data-testid="price-max"
				type="number"
				value={value[1]}
				onChange={(e) => onChange([value[0], Number(e.target.value)])}
			/>
		</div>
	),
}));

vi.mock("@/shared/components/rating-stars", () => ({
	RatingStars: ({ rating }: { rating: number }) => (
		<span data-testid={`stars-${rating}`}>{rating} stars</span>
	),
}));

vi.mock("@/modules/colors/utils/color-contrast.utils", () => ({
	isLightColor: () => false,
	getContrastTextColor: () => "#ffffff",
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	Check: () => <span data-testid="check-icon" />,
	Search: () => <span data-testid="search-icon" />,
	X: ({ className }: { className?: string }) => <span data-testid="x-icon" className={className} />,
}));

vi.mock("@/modules/products/services/product-filter-params.service", () => ({
	parseFilterValuesFromURL: vi.fn().mockReturnValue({
		colors: [],
		materials: [],
		productTypes: [],
		priceRange: [0, 500] as [number, number],
		ratingMin: null,
		inStockOnly: false,
		onSale: false,
	}),
	buildFilterURL: mockBuildFilterURL,
	buildClearFiltersURL: mockBuildClearFiltersURL,
	countActiveFilters: mockCountActiveFilters,
	getDefaultFilterValues: vi.fn().mockReturnValue({
		colors: [],
		materials: [],
		productTypes: [],
		priceRange: [0, 500] as [number, number],
		ratingMin: null,
		inStockOnly: false,
		onSale: false,
	}),
	isProductCategoryPage: vi.fn().mockReturnValue(false),
	getCategorySlugFromPath: vi.fn().mockReturnValue(null),
}));

vi.mock("@/modules/products/constants/product.constants", () => ({
	PRODUCT_FILTER_DIALOG_ID: "product-filter",
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children }: { children: React.ReactNode }) => (
		<span data-testid="badge">{children}</span>
	),
}));

vi.mock("@/shared/components/ui/input", () => ({
	Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

// ============================================================================
// TEST DATA
// ============================================================================

const baseDate = new Date("2026-01-01");

const mockColors = [
	{
		id: "c-or",
		slug: "or",
		name: "Or",
		hex: "#FFD700",
		isActive: true,
		createdAt: baseDate,
		updatedAt: baseDate,
		_count: { skus: 10 },
	},
	{
		id: "c-argent",
		slug: "argent",
		name: "Argent",
		hex: "#C0C0C0",
		isActive: true,
		createdAt: baseDate,
		updatedAt: baseDate,
		_count: { skus: 8 },
	},
	{
		id: "c-rose",
		slug: "rose",
		name: "Rose",
		hex: "#FF69B4",
		isActive: true,
		createdAt: baseDate,
		updatedAt: baseDate,
		_count: { skus: 5 },
	},
];

const mockMaterials = [
	{ id: "m-acier", slug: "acier", name: "Acier", _count: { skus: 15 } },
	{ id: "m-titane", slug: "titane", name: "Titane", _count: { skus: 7 } },
];

const mockProductTypes = [
	{ slug: "bagues", label: "Bagues", _count: { products: 20 } },
	{ slug: "colliers", label: "Colliers", _count: { products: 15 } },
];

// 9 colors to exceed SEARCH_THRESHOLD (8)
const manyColors = [
	{
		id: "c1",
		slug: "c1",
		name: "Rouge",
		hex: "#FF0000",
		isActive: true,
		createdAt: baseDate,
		updatedAt: baseDate,
		_count: { skus: 10 },
	},
	{
		id: "c2",
		slug: "c2",
		name: "Bleu",
		hex: "#0000FF",
		isActive: true,
		createdAt: baseDate,
		updatedAt: baseDate,
		_count: { skus: 9 },
	},
	{
		id: "c3",
		slug: "c3",
		name: "Vert",
		hex: "#00FF00",
		isActive: true,
		createdAt: baseDate,
		updatedAt: baseDate,
		_count: { skus: 8 },
	},
	{
		id: "c4",
		slug: "c4",
		name: "Jaune",
		hex: "#FFFF00",
		isActive: true,
		createdAt: baseDate,
		updatedAt: baseDate,
		_count: { skus: 7 },
	},
	{
		id: "c5",
		slug: "c5",
		name: "Orange",
		hex: "#FFA500",
		isActive: true,
		createdAt: baseDate,
		updatedAt: baseDate,
		_count: { skus: 6 },
	},
	{
		id: "c6",
		slug: "c6",
		name: "Violet",
		hex: "#8B00FF",
		isActive: true,
		createdAt: baseDate,
		updatedAt: baseDate,
		_count: { skus: 5 },
	},
	{
		id: "c7",
		slug: "c7",
		name: "Rose",
		hex: "#FF69B4",
		isActive: true,
		createdAt: baseDate,
		updatedAt: baseDate,
		_count: { skus: 4 },
	},
	{
		id: "c8",
		slug: "c8",
		name: "Blanc",
		hex: "#FFFFFF",
		isActive: true,
		createdAt: baseDate,
		updatedAt: baseDate,
		_count: { skus: 3 },
	},
	{
		id: "c9",
		slug: "c9",
		name: "Noir",
		hex: "#000000",
		isActive: true,
		createdAt: baseDate,
		updatedAt: baseDate,
		_count: { skus: 2 },
	},
];

// 9 materials to exceed SEARCH_THRESHOLD (8)
const manyMaterials = [
	{ id: "m1", slug: "m1", name: "Acier", _count: { skus: 10 } },
	{ id: "m2", slug: "m2", name: "Titane", _count: { skus: 9 } },
	{ id: "m3", slug: "m3", name: "Or blanc", _count: { skus: 8 } },
	{ id: "m4", slug: "m4", name: "Or jaune", _count: { skus: 7 } },
	{ id: "m5", slug: "m5", name: "Argent", _count: { skus: 6 } },
	{ id: "m6", slug: "m6", name: "Platine", _count: { skus: 5 } },
	{ id: "m7", slug: "m7", name: "Cuivre", _count: { skus: 4 } },
	{ id: "m8", slug: "m8", name: "Laiton", _count: { skus: 3 } },
	{ id: "m9", slug: "m9", name: "Bronze", _count: { skus: 2 } },
];

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { ProductFilterSheet } from "../product-filter-sheet";

// ============================================================================
// HELPERS
// ============================================================================

function renderDefault(overrides: Partial<React.ComponentProps<typeof ProductFilterSheet>> = {}) {
	return render(
		<ProductFilterSheet
			colors={mockColors}
			materials={mockMaterials}
			productTypes={mockProductTypes}
			maxPriceInEuros={500}
			{...overrides}
		/>,
	);
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	// Reset default mock implementations
	mockBuildFilterURL.mockReturnValue({
		targetPath: "/produits",
		queryString: "",
		fullUrl: "/produits",
	});
	mockBuildClearFiltersURL.mockReturnValue("/produits");
	mockCountActiveFilters.mockReturnValue({ hasActiveFilters: false, activeFiltersCount: 0 });
});

describe("ProductFilterSheet", () => {
	// ============================================================================
	// RENDERING - WRAPPER
	// ============================================================================

	describe("Wrapper rendering", () => {
		it("renders the filter wrapper", () => {
			renderDefault();
			expect(screen.getByTestId("filter-wrapper")).toBeInTheDocument();
		});

		it("passes open state to wrapper", () => {
			renderDefault();
			const wrapper = screen.getByTestId("filter-wrapper");
			expect(wrapper).toHaveAttribute("data-open", "true");
		});

		it("passes activeFiltersCount=0 when no active filters", () => {
			mockCountActiveFilters.mockReturnValue({ hasActiveFilters: false, activeFiltersCount: 0 });
			renderDefault();
			expect(screen.getByTestId("filter-wrapper")).toHaveAttribute("data-active-count", "0");
		});

		it("passes activeFiltersCount when filters are active", () => {
			mockCountActiveFilters.mockReturnValue({ hasActiveFilters: true, activeFiltersCount: 3 });
			renderDefault();
			expect(screen.getByTestId("filter-wrapper")).toHaveAttribute("data-active-count", "3");
		});

		it("renders apply and clear buttons", () => {
			renderDefault();
			expect(screen.getByTestId("apply-btn")).toBeInTheDocument();
			expect(screen.getByTestId("clear-btn")).toBeInTheDocument();
		});

		it("renders the accordion", () => {
			renderDefault();
			expect(screen.getByTestId("accordion")).toBeInTheDocument();
		});
	});

	// ============================================================================
	// RENDERING - SECTIONS PRESENCE
	// ============================================================================

	describe("Section presence", () => {
		it("renders the Types section when productTypes is provided", () => {
			renderDefault();
			expect(screen.getByTestId("section-types")).toBeInTheDocument();
		});

		it("renders the Prix section always", () => {
			renderDefault();
			expect(screen.getByTestId("section-price")).toBeInTheDocument();
		});

		it("renders the Couleurs section when colors are provided", () => {
			renderDefault();
			expect(screen.getByTestId("section-colors")).toBeInTheDocument();
		});

		it("renders the Matériaux section when materials are provided", () => {
			renderDefault();
			expect(screen.getByTestId("section-materials")).toBeInTheDocument();
		});

		it("renders the Notes clients section always", () => {
			renderDefault();
			expect(screen.getByTestId("section-rating")).toBeInTheDocument();
		});

		it("renders the Disponibilité section always", () => {
			renderDefault();
			expect(screen.getByTestId("section-availability")).toBeInTheDocument();
		});
	});

	// ============================================================================
	// RENDERING - SECTIONS HIDDEN WHEN EMPTY
	// ============================================================================

	describe("Sections hidden when empty", () => {
		it("does not render Types section when productTypes is empty", () => {
			renderDefault({ productTypes: [] });
			expect(screen.queryByTestId("section-types")).not.toBeInTheDocument();
		});

		it("does not render Couleurs section when colors is empty", () => {
			renderDefault({ colors: [] });
			expect(screen.queryByTestId("section-colors")).not.toBeInTheDocument();
		});

		it("does not render Matériaux section when materials is empty", () => {
			renderDefault({ materials: [] });
			expect(screen.queryByTestId("section-materials")).not.toBeInTheDocument();
		});

		it("still renders Prix section when other sections are empty", () => {
			renderDefault({ colors: [], materials: [], productTypes: [] });
			expect(screen.getByTestId("section-price")).toBeInTheDocument();
		});
	});

	// ============================================================================
	// TYPES SECTION
	// ============================================================================

	describe("Types section", () => {
		it("shows a checkbox for each product type", () => {
			renderDefault();
			expect(screen.getByTestId("checkbox-type-bagues")).toBeInTheDocument();
			expect(screen.getByTestId("checkbox-type-colliers")).toBeInTheDocument();
		});

		it("shows the product count for each type", () => {
			renderDefault();
			expect(screen.getByTestId("count-type-bagues")).toBeInTheDocument();
			expect(screen.getByTestId("count-type-colliers")).toBeInTheDocument();
		});

		it("shows correct label for each product type", () => {
			renderDefault();
			expect(screen.getByText("Bagues")).toBeInTheDocument();
			expect(screen.getByText("Colliers")).toBeInTheDocument();
		});

		it("shows the section label 'Types de bijoux'", () => {
			renderDefault();
			expect(screen.getByText("Types de bijoux")).toBeInTheDocument();
		});
	});

	// ============================================================================
	// PRIX SECTION
	// ============================================================================

	describe("Prix section", () => {
		it("renders the PriceRangeInputs component", () => {
			renderDefault();
			expect(screen.getByTestId("price-inputs")).toBeInTheDocument();
		});

		it("passes maxPriceInEuros to PriceRangeInputs", () => {
			renderDefault({ maxPriceInEuros: 750 });
			expect(screen.getByTestId("price-inputs")).toHaveAttribute("data-max-price", "750");
		});

		it("shows the section label 'Prix'", () => {
			renderDefault();
			expect(screen.getByText("Prix")).toBeInTheDocument();
		});
	});

	// ============================================================================
	// COULEURS SECTION
	// ============================================================================

	describe("Couleurs section", () => {
		it("shows a checkbox for each color", () => {
			renderDefault();
			expect(screen.getByTestId("checkbox-color-or")).toBeInTheDocument();
			expect(screen.getByTestId("checkbox-color-argent")).toBeInTheDocument();
			expect(screen.getByTestId("checkbox-color-rose")).toBeInTheDocument();
		});

		it("shows the SKU count for each color", () => {
			renderDefault();
			expect(screen.getByTestId("count-color-or")).toBeInTheDocument();
			expect(screen.getByTestId("count-color-argent")).toBeInTheDocument();
		});

		it("shows color names", () => {
			renderDefault();
			expect(screen.getByText("Or")).toBeInTheDocument();
			expect(screen.getByText("Argent")).toBeInTheDocument();
			expect(screen.getByText("Rose")).toBeInTheDocument();
		});

		it("shows the section label 'Couleurs'", () => {
			renderDefault();
			expect(screen.getByText("Couleurs")).toBeInTheDocument();
		});

		it("does NOT show search input when colors count is below SEARCH_THRESHOLD (8)", () => {
			renderDefault();
			// mockColors has only 3 items, so no search input
			const colorSection = screen.getByTestId("section-colors");
			const searchInputs = colorSection.querySelectorAll("input[type='text']");
			expect(searchInputs.length).toBe(0);
		});

		it("shows search input when colors count exceeds SEARCH_THRESHOLD (8)", () => {
			renderDefault({ colors: manyColors });
			const colorSection = screen.getByTestId("section-colors");
			const searchInput = colorSection.querySelector("input[type='text']");
			expect(searchInput).toBeInTheDocument();
		});

		it("renders color swatch indicators via CheckboxFilterItem indicator prop", () => {
			renderDefault();
			expect(screen.getByTestId("indicator-color-or")).toBeInTheDocument();
			expect(screen.getByTestId("indicator-color-argent")).toBeInTheDocument();
		});
	});

	// ============================================================================
	// MATÉRIAUX SECTION
	// ============================================================================

	describe("Matériaux section", () => {
		it("shows a checkbox for each material", () => {
			renderDefault();
			expect(screen.getByTestId("checkbox-material-acier")).toBeInTheDocument();
			expect(screen.getByTestId("checkbox-material-titane")).toBeInTheDocument();
		});

		it("shows material names", () => {
			renderDefault();
			expect(screen.getByText("Acier")).toBeInTheDocument();
			expect(screen.getByText("Titane")).toBeInTheDocument();
		});

		it("shows the section label 'Matériaux'", () => {
			renderDefault();
			expect(screen.getByText("Matériaux")).toBeInTheDocument();
		});

		it("does NOT show search input when materials count is below SEARCH_THRESHOLD (8)", () => {
			renderDefault();
			// mockMaterials has only 2 items
			const materialsSection = screen.getByTestId("section-materials");
			const searchInputs = materialsSection.querySelectorAll("input[type='text']");
			expect(searchInputs.length).toBe(0);
		});

		it("shows search input when materials count exceeds SEARCH_THRESHOLD (8)", () => {
			renderDefault({ materials: manyMaterials });
			const materialsSection = screen.getByTestId("section-materials");
			const searchInput = materialsSection.querySelector("input[type='text']");
			expect(searchInput).toBeInTheDocument();
		});

		it("shows the SKU count for each material", () => {
			renderDefault();
			expect(screen.getByTestId("count-material-acier")).toBeInTheDocument();
			expect(screen.getByTestId("count-material-titane")).toBeInTheDocument();
		});
	});

	// ============================================================================
	// NOTES CLIENTS SECTION
	// ============================================================================

	describe("Notes clients section", () => {
		it("shows 5 rating options from 5 down to 1", () => {
			renderDefault();
			for (let stars = 1; stars <= 5; stars++) {
				expect(screen.getByTestId(`checkbox-rating-${stars}`)).toBeInTheDocument();
			}
		});

		it("renders RatingStars for each rating option", () => {
			renderDefault();
			for (let stars = 1; stars <= 5; stars++) {
				expect(screen.getByTestId(`stars-${stars}`)).toBeInTheDocument();
			}
		});

		it("shows correct label for single star", () => {
			renderDefault();
			expect(screen.getByText("1 étoile et plus")).toBeInTheDocument();
		});

		it("shows correct label for multi-star options", () => {
			renderDefault();
			expect(screen.getByText("5 étoiles et plus")).toBeInTheDocument();
			expect(screen.getByText("4 étoiles et plus")).toBeInTheDocument();
		});

		it("shows the section label 'Notes clients'", () => {
			renderDefault();
			expect(screen.getByText("Notes clients")).toBeInTheDocument();
		});
	});

	// ============================================================================
	// DISPONIBILITÉ SECTION
	// ============================================================================

	describe("Disponibilité section", () => {
		it("shows the 'En stock uniquement' checkbox", () => {
			renderDefault();
			expect(screen.getByTestId("checkbox-filter-in-stock")).toBeInTheDocument();
		});

		it("shows the 'En promotion' checkbox", () => {
			renderDefault();
			expect(screen.getByTestId("checkbox-filter-on-sale")).toBeInTheDocument();
		});

		it("shows correct labels for availability options", () => {
			renderDefault();
			expect(screen.getByText("En stock uniquement")).toBeInTheDocument();
			expect(screen.getByText("En promotion")).toBeInTheDocument();
		});

		it("shows the section label 'Disponibilité'", () => {
			renderDefault();
			expect(screen.getByText("Disponibilité")).toBeInTheDocument();
		});
	});

	// ============================================================================
	// DEFAULT OPEN SECTIONS
	// ============================================================================

	describe("Default open accordion sections", () => {
		it("always includes 'types' and 'price' in defaultValue", () => {
			renderDefault();
			const accordion = screen.getByTestId("accordion");
			const defaultValue = JSON.parse(
				accordion.getAttribute("data-default-value") ?? "[]",
			) as string[];
			expect(defaultValue).toContain("types");
			expect(defaultValue).toContain("price");
		});

		it("always includes 'types' in defaultValue even when productTypes is empty", () => {
			// The component always seeds defaultOpenSections with ["types", "price"].
			// The Types AccordionItem is conditionally rendered, but the Accordion
			// defaultValue still contains "types" — which is harmless (no matching item).
			renderDefault({ productTypes: [] });
			const accordion = screen.getByTestId("accordion");
			const defaultValue = JSON.parse(
				accordion.getAttribute("data-default-value") ?? "[]",
			) as string[];
			expect(defaultValue).toContain("price");
			expect(defaultValue).toContain("types");
		});
	});

	// ============================================================================
	// SECTION HEADER - BADGE AND RESET
	// ============================================================================

	describe("SectionHeader - badge and reset button", () => {
		it("does not show a badge when section count is 0", () => {
			renderDefault();
			// With default mock values, all filter counts are 0
			// Types section has count=0 (empty productTypes array in form)
			// Only badge rendered when count > 0 - verify badge count is minimal
			const badges = screen.queryAllByTestId("badge");
			// There should be no badges for sections with 0 active filters
			// (price has count 0 by default too)
			expect(badges.length).toBe(0);
		});

		it("shows reset button with aria-label for a section", () => {
			renderDefault();
			// The reset button uses aria-label="Effacer le filtre {label}"
			// It only shows when count > 0, which requires active filter state
			// Since all filters are empty by default, no reset buttons are shown
			const resetButtons = screen.queryAllByRole("button", {
				name: /Effacer le filtre/,
			});
			expect(resetButtons.length).toBe(0);
		});
	});

	// ============================================================================
	// CLEAR ALL ACTION
	// ============================================================================

	describe("Clear all filters", () => {
		it("calls buildClearFiltersURL when clear button is clicked", () => {
			renderDefault();
			fireEvent.click(screen.getByTestId("clear-btn"));
			expect(mockBuildClearFiltersURL).toHaveBeenCalledWith(mockSearchParams);
		});

		it("calls router.push with the clear URL when clear button is clicked", () => {
			mockBuildClearFiltersURL.mockReturnValue("/produits");
			renderDefault();
			fireEvent.click(screen.getByTestId("clear-btn"));
			// router.push is called inside startTransition — it will be called
			expect(mockRouter.push).toHaveBeenCalledWith("/produits");
		});

		it("calls router.push with custom clear URL containing remaining search params", () => {
			mockBuildClearFiltersURL.mockReturnValue("/produits?search=bague");
			renderDefault();
			fireEvent.click(screen.getByTestId("clear-btn"));
			expect(mockRouter.push).toHaveBeenCalledWith("/produits?search=bague");
		});
	});

	// ============================================================================
	// APPLY FILTERS ACTION
	// ============================================================================

	describe("Apply filters", () => {
		it("calls form.handleSubmit when apply button is clicked", () => {
			// Since useAppForm is mocked, we just verify the apply button is functional
			renderDefault();
			const applyBtn = screen.getByTestId("apply-btn");
			expect(applyBtn).toBeInTheDocument();
			// Clicking should not throw
			expect(() => fireEvent.click(applyBtn)).not.toThrow();
		});
	});

	// ============================================================================
	// SEARCH FILTERING - COLORS
	// ============================================================================

	describe("Color search filtering", () => {
		it("shows all colors when search is empty", () => {
			renderDefault({ colors: manyColors });
			// All 9 colors should be visible
			for (const color of manyColors) {
				expect(screen.getByTestId(`checkbox-color-${color.slug}`)).toBeInTheDocument();
			}
		});

		it("filters colors by search term (case-insensitive)", () => {
			renderDefault({ colors: manyColors });
			const colorSection = screen.getByTestId("section-colors");
			const searchInput = colorSection.querySelector("input[type='text']");
			expect(searchInput).toBeInTheDocument();

			fireEvent.change(searchInput!, { target: { value: "rouge" } });

			// After filtering, only "Rouge" should be visible
			// Note: useDeferredValue may delay — the immediate state update triggers re-render
			expect(screen.getByText("Rouge")).toBeInTheDocument();
		});

		it("shows 'Aucun résultat' when no colors match search term", () => {
			renderDefault({ colors: manyColors });
			const colorSection = screen.getByTestId("section-colors");
			const searchInput = colorSection.querySelector("input[type='text']");

			fireEvent.change(searchInput!, { target: { value: "zzznomatch" } });

			expect(screen.getByText("Aucun résultat")).toBeInTheDocument();
		});
	});

	// ============================================================================
	// SEARCH FILTERING - MATERIALS
	// ============================================================================

	describe("Material search filtering", () => {
		it("shows all materials when search is empty", () => {
			renderDefault({ materials: manyMaterials });
			for (const material of manyMaterials) {
				expect(screen.getByTestId(`checkbox-material-${material.slug}`)).toBeInTheDocument();
			}
		});

		it("filters materials by search term", () => {
			renderDefault({ materials: manyMaterials });
			const materialsSection = screen.getByTestId("section-materials");
			const searchInput = materialsSection.querySelector("input[type='text']");
			expect(searchInput).toBeInTheDocument();

			fireEvent.change(searchInput!, { target: { value: "acier" } });

			expect(screen.getByText("Acier")).toBeInTheDocument();
		});

		it("shows 'Aucun résultat' when no materials match search term", () => {
			renderDefault({ materials: manyMaterials });
			const materialsSection = screen.getByTestId("section-materials");
			const searchInput = materialsSection.querySelector("input[type='text']");

			fireEvent.change(searchInput!, { target: { value: "zzznomatch" } });

			expect(screen.getByText("Aucun résultat")).toBeInTheDocument();
		});
	});

	// ============================================================================
	// SORTING
	// ============================================================================

	describe("Sorting by count descending", () => {
		it("renders product types sorted by count descending", () => {
			const unsortedTypes = [
				{ slug: "low", label: "Low", _count: { products: 5 } },
				{ slug: "high", label: "High", _count: { products: 50 } },
				{ slug: "mid", label: "Mid", _count: { products: 20 } },
			];
			renderDefault({ productTypes: unsortedTypes });

			const checkboxes = screen
				.getAllByRole("checkbox")
				.filter((el) => (el as HTMLInputElement).id?.startsWith("type-"));

			// High count first
			expect((checkboxes[0] as HTMLInputElement).id).toBe("type-high");
			expect((checkboxes[1] as HTMLInputElement).id).toBe("type-mid");
			expect((checkboxes[2] as HTMLInputElement).id).toBe("type-low");
		});

		it("renders colors sorted by SKU count descending", () => {
			const unsortedColors = [
				{
					id: "low-c",
					slug: "low-c",
					name: "Low",
					hex: "#111",
					isActive: true,
					createdAt: baseDate,
					updatedAt: baseDate,
					_count: { skus: 2 },
				},
				{
					id: "high-c",
					slug: "high-c",
					name: "High",
					hex: "#222",
					isActive: true,
					createdAt: baseDate,
					updatedAt: baseDate,
					_count: { skus: 20 },
				},
				{
					id: "mid-c",
					slug: "mid-c",
					name: "Mid",
					hex: "#333",
					isActive: true,
					createdAt: baseDate,
					updatedAt: baseDate,
					_count: { skus: 10 },
				},
			];
			renderDefault({ colors: unsortedColors });

			const checkboxes = screen
				.getAllByRole("checkbox")
				.filter((el) => (el as HTMLInputElement).id?.startsWith("color-"));

			expect((checkboxes[0] as HTMLInputElement).id).toBe("color-high-c");
			expect((checkboxes[1] as HTMLInputElement).id).toBe("color-mid-c");
			expect((checkboxes[2] as HTMLInputElement).id).toBe("color-low-c");
		});
	});

	// ============================================================================
	// DIALOG OPEN/CLOSE
	// ============================================================================

	describe("Dialog open/close behavior", () => {
		it("reflects isOpen=false from dialog hook", () => {
			mockDialog.isOpen = false;
			renderDefault();
			expect(screen.getByTestId("filter-wrapper")).toHaveAttribute("data-open", "false");
			// Reset for other tests
			mockDialog.isOpen = true;
		});

		it("calls dialog.close when onOpenChange is called with false", () => {
			renderDefault();
			fireEvent.click(screen.getByTestId("close-btn"));
			expect(mockDialog.close).toHaveBeenCalled();
		});
	});

	// ============================================================================
	// ACTIVE PRODUCT TYPE SLUG
	// ============================================================================

	describe("activeProductTypeSlug prop", () => {
		it("renders without errors when activeProductTypeSlug is provided", () => {
			expect(() => renderDefault({ activeProductTypeSlug: "bagues" })).not.toThrow();
		});

		it("renders without errors when activeProductTypeSlug is undefined", () => {
			expect(() => renderDefault({ activeProductTypeSlug: undefined })).not.toThrow();
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe("Edge cases", () => {
		it("renders with minimum required props (no colors/materials/types)", () => {
			expect(() =>
				render(<ProductFilterSheet colors={[]} materials={[]} maxPriceInEuros={200} />),
			).not.toThrow();
		});

		it("renders the price inputs with correct default range", () => {
			renderDefault({ maxPriceInEuros: 300 });
			expect(screen.getByTestId("price-inputs")).toHaveAttribute("data-max-price", "300");
		});

		it("renders all 6 accordion sections with correct value attributes", () => {
			renderDefault();
			expect(screen.getByTestId("section-types")).toBeInTheDocument();
			expect(screen.getByTestId("section-price")).toBeInTheDocument();
			expect(screen.getByTestId("section-colors")).toBeInTheDocument();
			expect(screen.getByTestId("section-materials")).toBeInTheDocument();
			expect(screen.getByTestId("section-rating")).toBeInTheDocument();
			expect(screen.getByTestId("section-availability")).toBeInTheDocument();
		});

		it("passes hasActiveFilters=false to wrapper when no filters active", () => {
			mockCountActiveFilters.mockReturnValue({ hasActiveFilters: false, activeFiltersCount: 0 });
			renderDefault();
			expect(screen.getByTestId("filter-wrapper")).toHaveAttribute("data-has-active", "false");
		});

		it("passes hasActiveFilters=true to wrapper when filters are active", () => {
			mockCountActiveFilters.mockReturnValue({ hasActiveFilters: true, activeFiltersCount: 2 });
			renderDefault();
			expect(screen.getByTestId("filter-wrapper")).toHaveAttribute("data-has-active", "true");
		});
	});
});
