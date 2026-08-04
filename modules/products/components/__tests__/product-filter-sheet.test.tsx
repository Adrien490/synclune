import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FilterFormData } from "@/modules/products/services/product-filter-params.service";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const EMPTY_FORM: FilterFormData = {
	colors: [],
	materials: [],
	productTypes: [],
	priceRange: [0, 500],
	inStockOnly: false,
	onSale: false,
};

const {
	mockDialog,
	mockRouter,
	mockSearchParams,
	mockPathname,
	mockParseFilterValues,
	mockBuildFilterURL,
	mockBuildClearFiltersURL,
	mockSetFieldValue,
	mockHandleSubmit,
	mockReset,
} = vi.hoisted(() => ({
	mockDialog: { isOpen: true, open: vi.fn(), close: vi.fn() },
	mockRouter: { push: vi.fn() },
	mockSearchParams: new URLSearchParams(),
	mockPathname: "/produits",
	mockParseFilterValues: vi.fn().mockReturnValue({
		colors: [],
		materials: [],
		productTypes: [],
		priceRange: [0, 500],
		inStockOnly: false,
		onSale: false,
	}),
	mockBuildFilterURL: vi.fn().mockReturnValue({
		targetPath: "/produits",
		queryString: "",
		fullUrl: "/produits",
	}),
	mockBuildClearFiltersURL: vi.fn().mockReturnValue("/produits"),
	mockSetFieldValue: vi.fn(),
	mockHandleSubmit: vi.fn(),
	mockReset: vi.fn(),
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

// useAppForm mock — `Subscribe` renders children with the form values snapshot.
vi.mock("@/shared/components/forms", () => ({
	useAppForm: ({ defaultValues }: { defaultValues: FilterFormData }) => ({
		Subscribe: ({
			selector,
			children,
		}: {
			selector: (state: { values: FilterFormData }) => FilterFormData;
			children: (values: FilterFormData) => React.ReactNode;
		}) => children(selector({ values: defaultValues })),
		setFieldValue: mockSetFieldValue,
		reset: mockReset,
		handleSubmit: mockHandleSubmit,
	}),
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
	AccordionItem: ({
		children,
		value,
		className,
	}: {
		children: React.ReactNode;
		value: string;
		className?: string;
	}) => (
		<div data-testid={`section-${value}`} data-class={className}>
			{children}
		</div>
	),
	AccordionTrigger: ({ children }: { children: React.ReactNode }) => (
		<div data-slot="accordion-trigger">{children}</div>
	),
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

vi.mock("@/shared/components/forms/radio-filter-item", () => ({
	RadioFilterItem: ({
		id,
		name,
		value,
		checked,
		onCheckedChange,
		children,
	}: {
		id: string;
		name: string;
		value: string;
		checked: boolean;
		onCheckedChange: (checked: boolean) => void;
		children: React.ReactNode;
	}) => (
		<label data-testid={`radio-${id}`} data-checked={checked}>
			<input
				type="radio"
				id={id}
				name={name}
				value={value}
				checked={checked}
				onChange={(e) => onCheckedChange(e.target.checked)}
			/>
			<span>{children}</span>
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
		</div>
	),
}));

vi.mock("@/modules/colors/utils/color-contrast.utils", () => ({
	isLightColor: () => false,
	getContrastTextColor: () => "#ffffff",
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => vi.fn(),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	CheckIcon: () => <span data-testid="check-icon" />,
	MagnifyingGlassIcon: () => <span data-testid="search-icon" />,
	XIcon: ({ className }: { className?: string }) => (
		<span data-testid="x-icon" className={className} />
	),
}));

vi.mock("@/modules/products/services/product-filter-params.service", async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return {
		...actual,
		parseFilterValuesFromURL: mockParseFilterValues,
		buildFilterURL: mockBuildFilterURL,
		buildClearFiltersURL: mockBuildClearFiltersURL,
	};
});

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

vi.mock("@/shared/components/ui/switch", () => ({
	Switch: ({
		id,
		checked,
		onCheckedChange,
		"aria-label": ariaLabel,
	}: {
		id?: string;
		checked?: boolean;
		onCheckedChange?: (checked: boolean) => void;
		"aria-label"?: string;
	}) => (
		<input
			type="checkbox"
			role="switch"
			data-testid={`switch-${id}`}
			id={id}
			aria-label={ariaLabel}
			checked={!!checked}
			onChange={(e) => onCheckedChange?.(e.target.checked)}
		/>
	),
}));

// ============================================================================
// TEST DATA
// ============================================================================

const baseDate = new Date("2026-01-01");

function makeColor(slug: string, name: string, hex: string, skus: number) {
	return {
		id: `c-${slug}`,
		slug,
		name,
		hex,
		isActive: true,
		description: null,
		createdAt: baseDate,
		updatedAt: baseDate,
		_count: { skus },
	};
}

const mockColors = [
	makeColor("or", "Or", "#FFD700", 10),
	makeColor("argent", "Argent", "#C0C0C0", 8),
	makeColor("rose", "Rose", "#FF69B4", 5),
];

const mockMaterials = [
	{ id: "m-acier", slug: "acier", name: "Acier", _count: { skus: 15 } },
	{ id: "m-titane", slug: "titane", name: "Titane", _count: { skus: 7 } },
];

const mockProductTypes = [
	{ slug: "bagues", label: "Bagues", _count: { products: 20 } },
	{ slug: "colliers", label: "Colliers", _count: { products: 15 } },
];

// 9 entries to exceed SEARCH_THRESHOLD (8)
const manyColors = [
	makeColor("c1", "Rouge", "#FF0000", 10),
	makeColor("c2", "Bleu", "#0000FF", 9),
	makeColor("c3", "Vert", "#00FF00", 8),
	makeColor("c4", "Jaune", "#FFFF00", 7),
	makeColor("c5", "Orange", "#FFA500", 6),
	makeColor("c6", "Violet", "#8B00FF", 5),
	makeColor("c7", "Rose", "#FF69B4", 4),
	makeColor("c8", "Blanc", "#FFFFFF", 3),
	makeColor("c9", "Noir", "#000000", 2),
];

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
	mockParseFilterValues.mockReturnValue({ ...EMPTY_FORM });
	mockBuildFilterURL.mockReturnValue({
		targetPath: "/produits",
		queryString: "",
		fullUrl: "/produits",
	});
	mockBuildClearFiltersURL.mockReturnValue("/produits");
	mockDialog.isOpen = true;
});

describe("ProductFilterSheet", () => {
	// --------------------------------------------------------------------------
	// WRAPPER
	// --------------------------------------------------------------------------

	describe("Wrapper rendering", () => {
		it("renders the filter wrapper", () => {
			renderDefault();
			expect(screen.getByTestId("filter-wrapper")).toBeInTheDocument();
		});

		it("passes the open state to the wrapper", () => {
			renderDefault();
			expect(screen.getByTestId("filter-wrapper")).toHaveAttribute("data-open", "true");
		});

		it("reflects isOpen=false from the dialog hook", () => {
			mockDialog.isOpen = false;
			renderDefault();
			expect(screen.getByTestId("filter-wrapper")).toHaveAttribute("data-open", "false");
		});

		it("renders the apply and clear buttons", () => {
			renderDefault();
			expect(screen.getByTestId("apply-btn")).toBeInTheDocument();
			expect(screen.getByTestId("clear-btn")).toBeInTheDocument();
		});

		it("renders the accordion", () => {
			renderDefault();
			expect(screen.getByTestId("accordion")).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// SECTION PRESENCE
	// --------------------------------------------------------------------------

	describe("Section presence", () => {
		it("renders all 5 sections by default", () => {
			renderDefault();
			expect(screen.getByTestId("section-types")).toBeInTheDocument();
			expect(screen.getByTestId("section-price")).toBeInTheDocument();
			expect(screen.getByTestId("section-colors")).toBeInTheDocument();
			expect(screen.getByTestId("section-materials")).toBeInTheDocument();
			expect(screen.getByTestId("section-availability")).toBeInTheDocument();
		});

		it("shows the section labels", () => {
			renderDefault();
			expect(screen.getByText("Types de bijoux")).toBeInTheDocument();
			expect(screen.getByText("Prix")).toBeInTheDocument();
			expect(screen.getByText("Couleurs")).toBeInTheDocument();
			expect(screen.getByText("Matériaux")).toBeInTheDocument();
			expect(screen.getByText("Disponibilité")).toBeInTheDocument();
		});
	});

	describe("Sections hidden when empty", () => {
		it("hides the Types section when productTypes is empty", () => {
			renderDefault({ productTypes: [] });
			expect(screen.queryByTestId("section-types")).not.toBeInTheDocument();
		});

		it("hides the Couleurs section when colors is empty", () => {
			renderDefault({ colors: [] });
			expect(screen.queryByTestId("section-colors")).not.toBeInTheDocument();
		});

		it("hides the Matériaux section when materials is empty", () => {
			renderDefault({ materials: [] });
			expect(screen.queryByTestId("section-materials")).not.toBeInTheDocument();
		});

		it("still renders Prix / Disponibilité when token sections are empty", () => {
			renderDefault({ colors: [], materials: [], productTypes: [] });
			expect(screen.getByTestId("section-price")).toBeInTheDocument();
			expect(screen.getByTestId("section-availability")).toBeInTheDocument();
		});

		it("marks the Disponibilité section as the last one (border-b-0)", () => {
			renderDefault();
			expect(screen.getByTestId("section-availability")).toHaveAttribute(
				"data-class",
				"border-b-0",
			);
		});
	});

	// --------------------------------------------------------------------------
	// DEFAULT OPEN SECTIONS
	// --------------------------------------------------------------------------

	describe("Default open accordion sections", () => {
		it("opens types + price by default", () => {
			renderDefault();
			const defaultValue = JSON.parse(
				screen.getByTestId("accordion").getAttribute("data-default-value") ?? "[]",
			) as string[];
			expect(defaultValue).toContain("types");
			expect(defaultValue).toContain("price");
		});

		it("also opens sections that have an active filter at mount", () => {
			mockParseFilterValues.mockReturnValue({ ...EMPTY_FORM, colors: ["or"] });
			renderDefault();
			const defaultValue = JSON.parse(
				screen.getByTestId("accordion").getAttribute("data-default-value") ?? "[]",
			) as string[];
			expect(defaultValue).toContain("colors");
			expect(defaultValue).not.toContain("materials");
		});
	});

	// --------------------------------------------------------------------------
	// SECTION CONTENT
	// --------------------------------------------------------------------------

	describe("Types section", () => {
		it("shows a checkbox for each product type", () => {
			renderDefault();
			expect(screen.getByTestId("checkbox-type-bagues")).toBeInTheDocument();
			expect(screen.getByTestId("checkbox-type-colliers")).toBeInTheDocument();
		});

		it("shows the product count for each type", () => {
			renderDefault();
			expect(screen.getByTestId("count-type-bagues")).toBeInTheDocument();
		});

		it("sorts product types by count descending", () => {
			renderDefault({
				productTypes: [
					{ slug: "low", label: "Low", _count: { products: 5 } },
					{ slug: "high", label: "High", _count: { products: 50 } },
					{ slug: "mid", label: "Mid", _count: { products: 20 } },
				],
			});
			const checkboxes = screen
				.getAllByRole("checkbox")
				.filter((el) => (el as HTMLInputElement).id.startsWith("type-"));
			expect((checkboxes[0] as HTMLInputElement).id).toBe("type-high");
			expect((checkboxes[2] as HTMLInputElement).id).toBe("type-low");
		});
	});

	describe("Prix section", () => {
		it("renders the PriceRangeInputs component", () => {
			renderDefault();
			expect(screen.getByTestId("price-inputs")).toBeInTheDocument();
		});

		it("passes maxPriceInEuros to PriceRangeInputs", () => {
			renderDefault({ maxPriceInEuros: 750 });
			expect(screen.getByTestId("price-inputs")).toHaveAttribute("data-max-price", "750");
		});
	});

	describe("Couleurs section", () => {
		it("shows a checkbox for each color", () => {
			renderDefault();
			expect(screen.getByTestId("checkbox-color-or")).toBeInTheDocument();
			expect(screen.getByTestId("checkbox-color-argent")).toBeInTheDocument();
		});

		it("renders color swatch indicators", () => {
			renderDefault();
			expect(screen.getByTestId("indicator-color-or")).toBeInTheDocument();
		});

		it("sorts colors by SKU count descending", () => {
			renderDefault();
			const checkboxes = screen
				.getAllByRole("checkbox")
				.filter((el) => (el as HTMLInputElement).id.startsWith("color-"));
			expect((checkboxes[0] as HTMLInputElement).id).toBe("color-or");
		});

		it("does not show the search input below the threshold", () => {
			renderDefault();
			const section = screen.getByTestId("section-colors");
			expect(section.querySelectorAll("input[type='search']").length).toBe(0);
		});

		it("shows the search input above the threshold (>8 colors)", () => {
			renderDefault({ colors: manyColors });
			const section = screen.getByTestId("section-colors");
			expect(section.querySelector("input[type='search']")).toBeInTheDocument();
		});
	});

	describe("Matériaux section", () => {
		it("shows a checkbox for each material", () => {
			renderDefault();
			expect(screen.getByTestId("checkbox-material-acier")).toBeInTheDocument();
			expect(screen.getByTestId("checkbox-material-titane")).toBeInTheDocument();
		});

		it("shows the search input above the threshold (>8 materials)", () => {
			renderDefault({ materials: manyMaterials });
			const section = screen.getByTestId("section-materials");
			expect(section.querySelector("input[type='search']")).toBeInTheDocument();
		});
	});

	describe("Disponibilité section", () => {
		it("shows the in-stock and on-sale switches", () => {
			renderDefault();
			expect(screen.getByTestId("switch-filter-in-stock")).toBeInTheDocument();
			expect(screen.getByTestId("switch-filter-on-sale")).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// SECTION BADGE + RESET
	// --------------------------------------------------------------------------

	describe("Section badge and reset button", () => {
		it("shows no badge nor reset button when a section has no active filter", () => {
			renderDefault();
			expect(screen.queryAllByTestId("badge")).toHaveLength(0);
			expect(screen.queryAllByRole("button", { name: /Effacer le filtre/ })).toHaveLength(0);
		});

		it("shows a reset button for an active section", () => {
			mockParseFilterValues.mockReturnValue({ ...EMPTY_FORM, colors: ["or", "argent"] });
			renderDefault();
			expect(
				screen.getByRole("button", { name: "Effacer le filtre Couleurs" }),
			).toBeInTheDocument();
		});

		it("shows a price range badge when the price filter is custom", () => {
			mockParseFilterValues.mockReturnValue({ ...EMPTY_FORM, priceRange: [50, 200] });
			renderDefault();
			expect(screen.getByText("50€ - 200€")).toBeInTheDocument();
		});

		it("resets the section field when the reset button is clicked", () => {
			mockParseFilterValues.mockReturnValue({ ...EMPTY_FORM, colors: ["or"] });
			renderDefault();
			fireEvent.click(screen.getByRole("button", { name: "Effacer le filtre Couleurs" }));
			expect(mockSetFieldValue).toHaveBeenCalledWith("colors", []);
		});

		it("resets the price field to the default range", () => {
			mockParseFilterValues.mockReturnValue({ ...EMPTY_FORM, priceRange: [50, 200] });
			renderDefault();
			fireEvent.click(screen.getByRole("button", { name: "Effacer le filtre Prix" }));
			expect(mockSetFieldValue).toHaveBeenCalledWith("priceRange", [0, 500]);
		});
	});

	// --------------------------------------------------------------------------
	// TOGGLING
	// --------------------------------------------------------------------------

	describe("Toggling filters", () => {
		it("adds a slug to the field when a checkbox is checked", () => {
			renderDefault();
			fireEvent.click(screen.getByTestId("checkbox-type-bagues").querySelector("input")!);
			expect(mockSetFieldValue).toHaveBeenCalledWith("productTypes", ["bagues"]);
		});

		it("removes a slug from the field when a checkbox is unchecked", () => {
			mockParseFilterValues.mockReturnValue({ ...EMPTY_FORM, colors: ["or", "argent"] });
			renderDefault();
			fireEvent.click(screen.getByTestId("checkbox-color-or").querySelector("input")!);
			expect(mockSetFieldValue).toHaveBeenCalledWith("colors", ["argent"]);
		});

		it("sets the in-stock field when the switch is toggled", () => {
			renderDefault();
			fireEvent.click(screen.getByTestId("switch-filter-in-stock"));
			expect(mockSetFieldValue).toHaveBeenCalledWith("inStockOnly", true);
		});
	});

	// --------------------------------------------------------------------------
	// PENDING COUNT → WRAPPER
	// --------------------------------------------------------------------------

	describe("Pending filter count passed to the wrapper", () => {
		it("passes 0 when no filter is selected", () => {
			renderDefault();
			const wrapper = screen.getByTestId("filter-wrapper");
			expect(wrapper).toHaveAttribute("data-active-count", "0");
			expect(wrapper).toHaveAttribute("data-has-active", "false");
		});

		it("reflects the form selection count", () => {
			mockParseFilterValues.mockReturnValue({
				...EMPTY_FORM,
				colors: ["or", "argent"],
			});
			renderDefault();
			const wrapper = screen.getByTestId("filter-wrapper");
			expect(wrapper).toHaveAttribute("data-active-count", "2");
			expect(wrapper).toHaveAttribute("data-has-active", "true");
		});
	});

	// --------------------------------------------------------------------------
	// CLEAR / APPLY
	// --------------------------------------------------------------------------

	describe("Clear all filters", () => {
		it("resets the form and navigates to the clear URL", () => {
			mockBuildClearFiltersURL.mockReturnValue("/produits?search=bague");
			renderDefault();
			fireEvent.click(screen.getByTestId("clear-btn"));
			expect(mockReset).toHaveBeenCalled();
			expect(mockBuildClearFiltersURL).toHaveBeenCalledWith(mockSearchParams);
			expect(mockRouter.push).toHaveBeenCalledWith("/produits?search=bague");
		});
	});

	describe("Apply filters", () => {
		it("submits the form when the apply button is clicked", () => {
			renderDefault();
			fireEvent.click(screen.getByTestId("apply-btn"));
			expect(mockHandleSubmit).toHaveBeenCalled();
		});
	});

	// --------------------------------------------------------------------------
	// DIALOG
	// --------------------------------------------------------------------------

	describe("Dialog open/close", () => {
		it("closes the dialog when the wrapper requests it", () => {
			renderDefault();
			fireEvent.click(screen.getByTestId("close-btn"));
			expect(mockDialog.close).toHaveBeenCalled();
		});
	});

	// --------------------------------------------------------------------------
	// EDGE CASES
	// --------------------------------------------------------------------------

	describe("Edge cases", () => {
		it("renders with minimal props (no colors / materials / types)", () => {
			expect(() =>
				render(<ProductFilterSheet colors={[]} materials={[]} maxPriceInEuros={200} />),
			).not.toThrow();
		});

		it("renders without throwing when activeProductTypeSlug is provided", () => {
			expect(() => renderDefault({ activeProductTypeSlug: "bagues" })).not.toThrow();
		});
	});
});
