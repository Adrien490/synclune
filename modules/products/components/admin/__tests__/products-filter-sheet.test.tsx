import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type * as ReactType from "react";

// ResizeObserver polyfill (required by @radix-ui/react-use-size in jsdom)
global.ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
};

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPush, mockSearchParams } = vi.hoisted(() => ({
	mockPush: vi.fn(),
	mockSearchParams: { value: new URLSearchParams() },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
	useSearchParams: () => mockSearchParams.value,
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof ReactType>();
	return {
		...actual,
		useTransition: () => [false, (fn: () => void) => fn()],
		useLayoutEffect: actual.useEffect,
	};
});

vi.mock("@/shared/components/filter-sheet-wrapper", () => ({
	FilterSheetWrapper: ({
		children,
		activeFiltersCount,
		hasActiveFilters,
		onApply,
		onClearAll,
		open,
		onOpenChange,
		hideTrigger,
	}: {
		children: React.ReactNode;
		activeFiltersCount?: number;
		hasActiveFilters?: boolean;
		onApply?: () => void;
		onClearAll?: () => void;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		hideTrigger?: boolean;
	}) => (
		<div
			data-testid="filter-sheet-wrapper"
			data-active-count={activeFiltersCount}
			data-has-active={String(hasActiveFilters)}
			data-open={String(open)}
			data-hide-trigger={String(hideTrigger)}
		>
			{onApply && (
				<button data-testid="apply-btn" onClick={onApply}>
					Appliquer
				</button>
			)}
			{onClearAll && (
				<button data-testid="clear-btn" onClick={onClearAll}>
					Effacer tout
				</button>
			)}
			{onOpenChange && (
				<button data-testid="close-btn" onClick={() => onOpenChange(false)}>
					Fermer
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
	AccordionTrigger: ({
		children,
	}: {
		children: React.ReactNode;
		headingLevel?: number;
		className?: string;
	}) => <div data-testid="accordion-trigger">{children}</div>,
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
		<label data-testid={`checkbox-${id}`} data-checked={String(checked)}>
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

vi.mock("@/modules/products/components/price-range-inputs", () => ({
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

vi.mock("@/modules/colors/utils/color-contrast.utils", () => ({
	isLightColor: () => false,
	getContrastTextColor: () => "#ffffff",
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	Check: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
		<span data-testid="check-icon" className={className} style={style} />
	),
	Search: () => <span data-testid="search-icon" />,
	X: ({ className }: { className?: string }) => <span data-testid="x-icon" className={className} />,
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({
		children,
		className,
		variant,
	}: {
		children: React.ReactNode;
		className?: string;
		variant?: string;
	}) => (
		<span data-testid="badge" data-variant={variant} className={className}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/input", () => ({
	Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({
		children,
		htmlFor,
		className,
	}: {
		children: React.ReactNode;
		htmlFor?: string;
		className?: string;
	}) => (
		<label htmlFor={htmlFor} className={className}>
			{children}
		</label>
	),
}));

// TanStack Form mock - avoids ResizeObserver dependency from real implementation
vi.mock("@tanstack/react-form", () => {
	const useForm = ({
		defaultValues,
		onSubmit,
	}: {
		defaultValues: Record<string, unknown>;
		onSubmit: (args: { value: Record<string, unknown> }) => Promise<void>;
	}) => {
		// Keep a mutable copy so form.reset() and form.setFieldValue() work
		const values: Record<string, unknown> = { ...defaultValues };
		const form = {
			state: { values },
			handleSubmit: vi.fn(() => onSubmit({ value: values })),
			reset: vi.fn((newValues?: Record<string, unknown>) => {
				if (newValues) {
					Object.assign(values, newValues);
				} else {
					Object.assign(values, defaultValues);
				}
			}),
			setFieldValue: vi.fn((name: string, value: unknown) => {
				values[name] = value;
			}),
			Field: ({
				name,
				mode,
				children,
			}: {
				name: string;
				mode?: string;
				children: (field: {
					state: { value: unknown };
					handleChange: ReturnType<typeof vi.fn>;
					pushValue: ReturnType<typeof vi.fn>;
					removeValue: ReturnType<typeof vi.fn>;
				}) => React.ReactNode;
			}) => {
				const field = {
					state: { value: values[name] ?? (mode === "array" ? [] : null) },
					handleChange: vi.fn((newVal: unknown) => {
						values[name] = newVal;
					}),
					pushValue: vi.fn((val: unknown) => {
						const arr = values[name] as unknown[];
						values[name] = [...arr, val];
					}),
					removeValue: vi.fn((index: number) => {
						const arr = values[name] as unknown[];
						values[name] = arr.filter((_, i) => i !== index);
					}),
				};
				return children(field) as React.ReactElement;
			},
		};
		return form;
	};
	return {
		createFormHookContexts: () => ({
			fieldContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
			useFieldContext: () => ({}),
			formContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
			useFormContext: () => ({}),
		}),
		createFormHook: () => ({ useAppForm: useForm }),
		useForm,
	};
});

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { ProductsFilterSheet } from "../products-filter-sheet";

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
	{ id: "pt-bagues", slug: "bagues", label: "Bagues" },
	{ id: "pt-colliers", slug: "colliers", label: "Colliers" },
];

const mockCollections = [
	{ id: "col-ete", name: "Été" },
	{ id: "col-hiver", name: "Hiver" },
];

// 9 colors to exceed SEARCH_THRESHOLD (8)
const manyColors = Array.from({ length: 9 }, (_, i) => ({
	id: `c${i + 1}`,
	slug: `color-${i + 1}`,
	name: `Couleur ${i + 1}`,
	hex: "#FF0000",
	isActive: true,
	createdAt: baseDate,
	updatedAt: baseDate,
	_count: { skus: 10 - i },
}));

// 9 materials to exceed SEARCH_THRESHOLD (8)
const manyMaterials = Array.from({ length: 9 }, (_, i) => ({
	id: `m${i + 1}`,
	slug: `material-${i + 1}`,
	name: `Matériau ${i + 1}`,
	_count: { skus: 10 - i },
}));

// ============================================================================
// HELPERS
// ============================================================================

function renderDefault(overrides: Partial<React.ComponentProps<typeof ProductsFilterSheet>> = {}) {
	return render(
		<ProductsFilterSheet
			colors={mockColors}
			materials={mockMaterials}
			productTypes={mockProductTypes}
			collections={mockCollections}
			maxPriceInCents={50000}
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
	mockSearchParams.value = new URLSearchParams();
});

describe("ProductsFilterSheet", () => {
	// ─── Rendering - wrapper ──────────────────────────────────────────────────

	describe("wrapper rendering", () => {
		it("renders the filter sheet wrapper", () => {
			renderDefault();
			expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
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

		it("passes hideTrigger prop to wrapper", () => {
			renderDefault({ hideTrigger: true });
			expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute(
				"data-hide-trigger",
				"true",
			);
		});
	});

	// ─── Rendering - section presence ─────────────────────────────────────────

	describe("section presence", () => {
		it("renders the Statut section always", () => {
			renderDefault();
			expect(screen.getByTestId("section-status")).toBeInTheDocument();
		});

		it("renders the Prix section always", () => {
			renderDefault();
			expect(screen.getByTestId("section-price")).toBeInTheDocument();
		});

		it("renders the Disponibilité section always", () => {
			renderDefault();
			expect(screen.getByTestId("section-availability")).toBeInTheDocument();
		});

		it("renders the Dates section always", () => {
			renderDefault();
			expect(screen.getByTestId("section-dates")).toBeInTheDocument();
		});

		it("renders the Types de produit section when productTypes are provided", () => {
			renderDefault();
			expect(screen.getByTestId("section-types")).toBeInTheDocument();
		});

		it("renders the Couleurs section when colors are provided", () => {
			renderDefault();
			expect(screen.getByTestId("section-colors")).toBeInTheDocument();
		});

		it("renders the Matériaux section when materials are provided", () => {
			renderDefault();
			expect(screen.getByTestId("section-materials")).toBeInTheDocument();
		});

		it("renders the Collections section when collections are provided", () => {
			renderDefault();
			expect(screen.getByTestId("section-collections")).toBeInTheDocument();
		});
	});

	// ─── Rendering - sections hidden when empty ───────────────────────────────

	describe("sections hidden when empty data", () => {
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

		it("does not render Collections section when collections is empty", () => {
			renderDefault({ collections: [] });
			expect(screen.queryByTestId("section-collections")).not.toBeInTheDocument();
		});

		it("still renders Statut, Prix, Disponibilité and Dates when all optional data is empty", () => {
			renderDefault({ colors: [], materials: [], productTypes: [], collections: [] });
			expect(screen.getByTestId("section-status")).toBeInTheDocument();
			expect(screen.getByTestId("section-price")).toBeInTheDocument();
			expect(screen.getByTestId("section-availability")).toBeInTheDocument();
			expect(screen.getByTestId("section-dates")).toBeInTheDocument();
		});
	});

	// ─── Section labels ───────────────────────────────────────────────────────

	describe("section labels", () => {
		it("renders 'Statut' label", () => {
			renderDefault();
			expect(screen.getByText("Statut")).toBeInTheDocument();
		});

		it("renders 'Types de produit' label", () => {
			renderDefault();
			expect(screen.getByText("Types de produit")).toBeInTheDocument();
		});

		it("renders 'Prix' label", () => {
			renderDefault();
			expect(screen.getByText("Prix")).toBeInTheDocument();
		});

		it("renders 'Couleurs' label", () => {
			renderDefault();
			expect(screen.getByText("Couleurs")).toBeInTheDocument();
		});

		it("renders 'Matériaux' label", () => {
			renderDefault();
			expect(screen.getByText("Matériaux")).toBeInTheDocument();
		});

		it("renders 'Collections' label", () => {
			renderDefault();
			expect(screen.getByText("Collections")).toBeInTheDocument();
		});

		it("renders 'Disponibilité' label", () => {
			renderDefault();
			expect(screen.getByText("Disponibilité")).toBeInTheDocument();
		});

		it("renders 'Dates' label", () => {
			renderDefault();
			expect(screen.getByText("Dates")).toBeInTheDocument();
		});
	});

	// ─── Status section ───────────────────────────────────────────────────────

	describe("status section", () => {
		it("renders Public checkbox", () => {
			renderDefault();
			expect(screen.getByLabelText("Public")).toBeInTheDocument();
		});

		it("renders Brouillon checkbox", () => {
			renderDefault();
			expect(screen.getByLabelText("Brouillon")).toBeInTheDocument();
		});

		it("renders Archivé checkbox", () => {
			renderDefault();
			expect(screen.getByLabelText("Archivé")).toBeInTheDocument();
		});

		it("renders the three status checkboxes unchecked by default", () => {
			renderDefault();
			const publicCheckbox = screen.getByTestId("checkbox-admin-status-PUBLIC");
			const draftCheckbox = screen.getByTestId("checkbox-admin-status-DRAFT");
			const archivedCheckbox = screen.getByTestId("checkbox-admin-status-ARCHIVED");
			expect(publicCheckbox).toHaveAttribute("data-checked", "false");
			expect(draftCheckbox).toHaveAttribute("data-checked", "false");
			expect(archivedCheckbox).toHaveAttribute("data-checked", "false");
		});
	});

	// ─── Types section ────────────────────────────────────────────────────────

	describe("types section", () => {
		it("renders a checkbox for each product type", () => {
			renderDefault();
			expect(screen.getByText("Bagues")).toBeInTheDocument();
			expect(screen.getByText("Colliers")).toBeInTheDocument();
		});

		it("renders checkbox with correct id per type", () => {
			renderDefault();
			expect(screen.getByTestId("checkbox-admin-type-bagues")).toBeInTheDocument();
			expect(screen.getByTestId("checkbox-admin-type-colliers")).toBeInTheDocument();
		});
	});

	// ─── Price section ────────────────────────────────────────────────────────

	describe("price section", () => {
		it("renders PriceRangeInputs component", () => {
			renderDefault();
			expect(screen.getByTestId("price-inputs")).toBeInTheDocument();
		});

		it("converts maxPriceInCents to euros for PriceRangeInputs", () => {
			renderDefault({ maxPriceInCents: 50000 });
			expect(screen.getByTestId("price-inputs")).toHaveAttribute("data-max-price", "500");
		});

		it("defaults price range to [0, maxPriceInEuros]", () => {
			renderDefault({ maxPriceInCents: 20000 });
			const priceInputs = screen.getByTestId("price-inputs");
			expect(priceInputs).toHaveAttribute("data-min", "0");
			expect(priceInputs).toHaveAttribute("data-max", "200");
		});
	});

	// ─── Colors section ───────────────────────────────────────────────────────

	describe("colors section", () => {
		it("renders a checkbox for each color", () => {
			renderDefault();
			expect(screen.getByText("Or")).toBeInTheDocument();
			expect(screen.getByText("Argent")).toBeInTheDocument();
			expect(screen.getByText("Rose")).toBeInTheDocument();
		});

		it("renders checkbox with correct id per color", () => {
			renderDefault();
			expect(screen.getByTestId("checkbox-admin-color-or")).toBeInTheDocument();
			expect(screen.getByTestId("checkbox-admin-color-argent")).toBeInTheDocument();
		});

		it("renders color indicator for each color", () => {
			renderDefault();
			expect(screen.getByTestId("indicator-admin-color-or")).toBeInTheDocument();
			expect(screen.getByTestId("indicator-admin-color-argent")).toBeInTheDocument();
		});

		it("renders SKU count for each color", () => {
			renderDefault();
			expect(screen.getByTestId("count-admin-color-or")).toHaveTextContent("(10)");
			expect(screen.getByTestId("count-admin-color-argent")).toHaveTextContent("(8)");
		});

		it("does not render color search input when colors count <= 8", () => {
			renderDefault();
			expect(screen.queryByPlaceholderText("Rechercher une couleur...")).not.toBeInTheDocument();
		});

		it("renders color search input when colors count > 8", () => {
			renderDefault({ colors: manyColors });
			expect(screen.getByPlaceholderText("Rechercher une couleur...")).toBeInTheDocument();
		});

		it("filters colors when searching", async () => {
			renderDefault({ colors: manyColors });
			const searchInput = screen.getByPlaceholderText("Rechercher une couleur...");
			await act(async () => {
				fireEvent.change(searchInput, { target: { value: "Couleur 1" } });
			});
			expect(screen.getByText("Couleur 1")).toBeInTheDocument();
			expect(screen.queryByText("Couleur 2")).not.toBeInTheDocument();
		});

		it("shows 'Aucun résultat' when color search yields no match", async () => {
			renderDefault({ colors: manyColors });
			const searchInput = screen.getByPlaceholderText("Rechercher une couleur...");
			await act(async () => {
				fireEvent.change(searchInput, { target: { value: "zzzzzz" } });
			});
			expect(screen.getByText("Aucun résultat")).toBeInTheDocument();
		});
	});

	// ─── Materials section ────────────────────────────────────────────────────

	describe("materials section", () => {
		it("renders a checkbox for each material", () => {
			renderDefault();
			expect(screen.getByText("Acier")).toBeInTheDocument();
			expect(screen.getByText("Titane")).toBeInTheDocument();
		});

		it("renders checkbox with correct id per material", () => {
			renderDefault();
			expect(screen.getByTestId("checkbox-admin-material-acier")).toBeInTheDocument();
			expect(screen.getByTestId("checkbox-admin-material-titane")).toBeInTheDocument();
		});

		it("renders SKU count for each material", () => {
			renderDefault();
			expect(screen.getByTestId("count-admin-material-acier")).toHaveTextContent("(15)");
			expect(screen.getByTestId("count-admin-material-titane")).toHaveTextContent("(7)");
		});

		it("does not render material search input when materials count <= 8", () => {
			renderDefault();
			expect(screen.queryByPlaceholderText("Rechercher un matériau...")).not.toBeInTheDocument();
		});

		it("renders material search input when materials count > 8", () => {
			renderDefault({ materials: manyMaterials });
			expect(screen.getByPlaceholderText("Rechercher un matériau...")).toBeInTheDocument();
		});

		it("filters materials when searching", async () => {
			renderDefault({ materials: manyMaterials });
			const searchInput = screen.getByPlaceholderText("Rechercher un matériau...");
			await act(async () => {
				fireEvent.change(searchInput, { target: { value: "Matériau 1" } });
			});
			expect(screen.getByText("Matériau 1")).toBeInTheDocument();
			expect(screen.queryByText("Matériau 2")).not.toBeInTheDocument();
		});

		it("shows 'Aucun résultat' when material search yields no match", async () => {
			renderDefault({ materials: manyMaterials });
			const searchInput = screen.getByPlaceholderText("Rechercher un matériau...");
			await act(async () => {
				fireEvent.change(searchInput, { target: { value: "zzzzzz" } });
			});
			expect(screen.getByText("Aucun résultat")).toBeInTheDocument();
		});
	});

	// ─── Collections section ──────────────────────────────────────────────────

	describe("collections section", () => {
		it("renders a checkbox for each collection", () => {
			renderDefault();
			expect(screen.getByText("Été")).toBeInTheDocument();
			expect(screen.getByText("Hiver")).toBeInTheDocument();
		});

		it("renders checkbox with correct id per collection", () => {
			renderDefault();
			expect(screen.getByTestId("checkbox-admin-collection-col-ete")).toBeInTheDocument();
			expect(screen.getByTestId("checkbox-admin-collection-col-hiver")).toBeInTheDocument();
		});
	});

	// ─── Availability section ─────────────────────────────────────────────────

	describe("availability section", () => {
		it("renders 'En stock' checkbox", () => {
			renderDefault();
			expect(screen.getByTestId("checkbox-admin-filter-in-stock")).toBeInTheDocument();
		});

		it("renders 'Rupture de stock' checkbox", () => {
			renderDefault();
			expect(screen.getByTestId("checkbox-admin-filter-out-of-stock")).toBeInTheDocument();
		});

		it("renders 'En promotion' checkbox", () => {
			renderDefault();
			expect(screen.getByTestId("checkbox-admin-filter-on-sale")).toBeInTheDocument();
		});

		it("renders stock status labels", () => {
			renderDefault();
			expect(screen.getByText("En stock")).toBeInTheDocument();
			expect(screen.getByText("Rupture de stock")).toBeInTheDocument();
			expect(screen.getByText("En promotion")).toBeInTheDocument();
		});
	});

	// ─── Dates section ────────────────────────────────────────────────────────

	describe("dates section", () => {
		it("renders 'Date de création' fieldset", () => {
			renderDefault();
			expect(screen.getByText("Date de création")).toBeInTheDocument();
		});

		it("renders 'Date de modification' fieldset", () => {
			renderDefault();
			expect(screen.getByText("Date de modification")).toBeInTheDocument();
		});

		it("renders created-after date input", () => {
			renderDefault();
			expect(
				screen.getByLabelText("Après", { selector: "#admin-created-after" }),
			).toBeInTheDocument();
		});

		it("renders created-before date input", () => {
			renderDefault();
			expect(
				screen.getByLabelText("Avant", { selector: "#admin-created-before" }),
			).toBeInTheDocument();
		});

		it("renders updated-after date input", () => {
			renderDefault();
			expect(
				screen.getByLabelText("Après", { selector: "#admin-updated-after" }),
			).toBeInTheDocument();
		});

		it("renders updated-before date input", () => {
			renderDefault();
			expect(
				screen.getByLabelText("Avant", { selector: "#admin-updated-before" }),
			).toBeInTheDocument();
		});

		it("all date inputs are of type date", () => {
			renderDefault();
			const dateInputs = Array.from(
				document.querySelectorAll<HTMLInputElement>('input[type="date"]'),
			);
			expect(dateInputs.length).toBe(4);
		});
	});

	// ─── URL reading - initial form values ───────────────────────────────────

	describe("URL reading", () => {
		it("initializes with no active filters when URL has no filter params", () => {
			mockSearchParams.value = new URLSearchParams();
			renderDefault();
			const wrapper = screen.getByTestId("filter-sheet-wrapper");
			expect(wrapper).toHaveAttribute("data-active-count", "0");
		});

		it("computes active filter count from URL params", () => {
			mockSearchParams.value = new URLSearchParams(
				"filter_status=PUBLIC&filter_status=DRAFT&filter_stockStatus=in_stock",
			);
			renderDefault();
			const wrapper = screen.getByTestId("filter-sheet-wrapper");
			expect(Number(wrapper.getAttribute("data-active-count"))).toBeGreaterThan(0);
		});

		it("counts priceMin+priceMax as a single filter", () => {
			mockSearchParams.value = new URLSearchParams("filter_priceMin=1000&filter_priceMax=20000");
			renderDefault();
			const wrapper = screen.getByTestId("filter-sheet-wrapper");
			expect(wrapper).toHaveAttribute("data-active-count", "1");
		});

		it("initializes status checkboxes from URL", () => {
			mockSearchParams.value = new URLSearchParams("filter_status=PUBLIC");
			renderDefault();
			const publicCheckbox = screen.getByTestId("checkbox-admin-status-PUBLIC");
			expect(publicCheckbox).toHaveAttribute("data-checked", "true");
		});

		it("initializes color checkboxes from URL", () => {
			mockSearchParams.value = new URLSearchParams("filter_color=or");
			renderDefault();
			const orCheckbox = screen.getByTestId("checkbox-admin-color-or");
			expect(orCheckbox).toHaveAttribute("data-checked", "true");
		});

		it("initializes material checkboxes from URL", () => {
			mockSearchParams.value = new URLSearchParams("filter_material=acier");
			renderDefault();
			const acierCheckbox = screen.getByTestId("checkbox-admin-material-acier");
			expect(acierCheckbox).toHaveAttribute("data-checked", "true");
		});

		it("initializes type checkboxes from URL", () => {
			mockSearchParams.value = new URLSearchParams("filter_typeId=bagues");
			renderDefault();
			const baguesCheckbox = screen.getByTestId("checkbox-admin-type-bagues");
			expect(baguesCheckbox).toHaveAttribute("data-checked", "true");
		});

		it("initializes collection checkboxes from URL", () => {
			mockSearchParams.value = new URLSearchParams("filter_collectionId=col-ete");
			renderDefault();
			const eteCheckbox = screen.getByTestId("checkbox-admin-collection-col-ete");
			expect(eteCheckbox).toHaveAttribute("data-checked", "true");
		});

		it("initializes in_stock checkbox from URL", () => {
			mockSearchParams.value = new URLSearchParams("filter_stockStatus=in_stock");
			renderDefault();
			expect(screen.getByTestId("checkbox-admin-filter-in-stock")).toHaveAttribute(
				"data-checked",
				"true",
			);
		});

		it("initializes out_of_stock checkbox from URL", () => {
			mockSearchParams.value = new URLSearchParams("filter_stockStatus=out_of_stock");
			renderDefault();
			expect(screen.getByTestId("checkbox-admin-filter-out-of-stock")).toHaveAttribute(
				"data-checked",
				"true",
			);
		});

		it("initializes on sale checkbox from URL", () => {
			mockSearchParams.value = new URLSearchParams("filter_onSale=true");
			renderDefault();
			expect(screen.getByTestId("checkbox-admin-filter-on-sale")).toHaveAttribute(
				"data-checked",
				"true",
			);
		});

		it("initializes price range from URL (converted from cents to euros)", () => {
			mockSearchParams.value = new URLSearchParams("filter_priceMin=5000&filter_priceMax=25000");
			renderDefault();
			const priceInputs = screen.getByTestId("price-inputs");
			expect(priceInputs).toHaveAttribute("data-min", "50");
			expect(priceInputs).toHaveAttribute("data-max", "250");
		});
	});

	// ─── Active filters count badge ───────────────────────────────────────────

	describe("active filters count", () => {
		it("shows 0 active filters when no filter params in URL", () => {
			renderDefault();
			const wrapper = screen.getByTestId("filter-sheet-wrapper");
			expect(wrapper).toHaveAttribute("data-active-count", "0");
			expect(wrapper).toHaveAttribute("data-has-active", "false");
		});

		it("shows correct count for multiple filter params", () => {
			mockSearchParams.value = new URLSearchParams(
				"filter_status=PUBLIC&filter_color=or&filter_stockStatus=in_stock",
			);
			renderDefault();
			const wrapper = screen.getByTestId("filter-sheet-wrapper");
			expect(wrapper).toHaveAttribute("data-active-count", "3");
			expect(wrapper).toHaveAttribute("data-has-active", "true");
		});

		it("ignores non-filter params in count", () => {
			mockSearchParams.value = new URLSearchParams(
				"search=bague&sortBy=title-ascending&filter_status=PUBLIC",
			);
			renderDefault();
			const wrapper = screen.getByTestId("filter-sheet-wrapper");
			expect(wrapper).toHaveAttribute("data-active-count", "1");
		});
	});

	// ─── Clear all filters ────────────────────────────────────────────────────

	describe("clear all filters", () => {
		it("calls router.push when clear all is clicked", () => {
			mockSearchParams.value = new URLSearchParams("filter_status=PUBLIC");
			renderDefault();
			fireEvent.click(screen.getByTestId("clear-btn"));
			expect(mockPush).toHaveBeenCalledOnce();
		});

		it("clears all filter params from URL when clear all is clicked", () => {
			mockSearchParams.value = new URLSearchParams(
				"filter_status=PUBLIC&filter_color=or&filter_priceMin=1000&filter_priceMax=20000",
			);
			renderDefault();
			fireEvent.click(screen.getByTestId("clear-btn"));
			const calledUrl = mockPush.mock.calls[0]?.[0] as string;
			expect(calledUrl).not.toContain("filter_status");
			expect(calledUrl).not.toContain("filter_color");
			expect(calledUrl).not.toContain("filter_priceMin");
			expect(calledUrl).not.toContain("filter_priceMax");
		});

		it("preserves non-filter params when clearing all filters", () => {
			mockSearchParams.value = new URLSearchParams(
				"search=bague&sortBy=title-ascending&filter_status=PUBLIC",
			);
			renderDefault();
			fireEvent.click(screen.getByTestId("clear-btn"));
			const calledUrl = mockPush.mock.calls[0]?.[0] as string;
			expect(calledUrl).toContain("search=bague");
			expect(calledUrl).toContain("sortBy=title-ascending");
		});

		it("resets page to 1 when clearing all filters", () => {
			mockSearchParams.value = new URLSearchParams("filter_status=PUBLIC&page=3");
			renderDefault();
			fireEvent.click(screen.getByTestId("clear-btn"));
			const calledUrl = mockPush.mock.calls[0]?.[0] as string;
			expect(calledUrl).toContain("page=1");
		});

		it("passes scroll:false to router.push when clearing", () => {
			renderDefault();
			fireEvent.click(screen.getByTestId("clear-btn"));
			expect(mockPush).toHaveBeenCalledWith(expect.any(String), { scroll: false });
		});
	});

	// ─── Form submission ──────────────────────────────────────────────────────

	describe("form submission", () => {
		it("calls router.push when apply button is clicked", () => {
			renderDefault();
			fireEvent.click(screen.getByTestId("apply-btn"));
			expect(mockPush).toHaveBeenCalledOnce();
		});

		it("includes page=1 in URL when applying filters", () => {
			renderDefault();
			fireEvent.click(screen.getByTestId("apply-btn"));
			const calledUrl = mockPush.mock.calls[0]?.[0] as string;
			expect(calledUrl).toContain("page=1");
		});

		it("passes scroll:false to router.push when applying", () => {
			renderDefault();
			fireEvent.click(screen.getByTestId("apply-btn"));
			expect(mockPush).toHaveBeenCalledWith(expect.any(String), { scroll: false });
		});

		it("preserves non-filter search params when applying", () => {
			mockSearchParams.value = new URLSearchParams("search=bague&sortBy=title-ascending");
			renderDefault();
			fireEvent.click(screen.getByTestId("apply-btn"));
			const calledUrl = mockPush.mock.calls[0]?.[0] as string;
			expect(calledUrl).toContain("search=bague");
			expect(calledUrl).toContain("sortBy=title-ascending");
		});

		it("re-applies active form state filters when submitting", () => {
			mockSearchParams.value = new URLSearchParams("filter_color=or&filter_status=PUBLIC");
			renderDefault();
			fireEvent.click(screen.getByTestId("apply-btn"));
			const calledUrl = mockPush.mock.calls[0]?.[0] as string;
			// Form was initialized from URL, so applying it should push the same filters back
			expect(calledUrl).toContain("filter_color=or");
			expect(calledUrl).toContain("filter_status=PUBLIC");
		});
	});

	// ─── Controlled open state ────────────────────────────────────────────────

	describe("controlled open state", () => {
		it("reflects controlled open=true in wrapper", () => {
			renderDefault({ open: true });
			expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-open", "true");
		});

		it("reflects controlled open=false in wrapper", () => {
			renderDefault({ open: false });
			expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-open", "false");
		});

		it("calls onOpenChange when close button is triggered", () => {
			const onOpenChange = vi.fn();
			renderDefault({ open: true, onOpenChange });
			fireEvent.click(screen.getByTestId("close-btn"));
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});

	// ─── Default open accordion sections ─────────────────────────────────────

	describe("default open accordion sections", () => {
		it("includes 'status', 'types', and 'price' in defaultValue by default", () => {
			renderDefault();
			const accordion = screen.getByTestId("accordion");
			const defaultValue = JSON.parse(
				accordion.getAttribute("data-default-value") ?? "[]",
			) as string[];
			expect(defaultValue).toContain("status");
			expect(defaultValue).toContain("types");
			expect(defaultValue).toContain("price");
		});

		it("includes 'colors' in defaultValue when color filter is active in URL", () => {
			mockSearchParams.value = new URLSearchParams("filter_color=or");
			renderDefault();
			const accordion = screen.getByTestId("accordion");
			const defaultValue = JSON.parse(
				accordion.getAttribute("data-default-value") ?? "[]",
			) as string[];
			expect(defaultValue).toContain("colors");
		});

		it("includes 'materials' in defaultValue when material filter is active in URL", () => {
			mockSearchParams.value = new URLSearchParams("filter_material=acier");
			renderDefault();
			const accordion = screen.getByTestId("accordion");
			const defaultValue = JSON.parse(
				accordion.getAttribute("data-default-value") ?? "[]",
			) as string[];
			expect(defaultValue).toContain("materials");
		});

		it("includes 'availability' in defaultValue when stockStatus filter is active", () => {
			mockSearchParams.value = new URLSearchParams("filter_stockStatus=in_stock");
			renderDefault();
			const accordion = screen.getByTestId("accordion");
			const defaultValue = JSON.parse(
				accordion.getAttribute("data-default-value") ?? "[]",
			) as string[];
			expect(defaultValue).toContain("availability");
		});

		it("includes 'dates' in defaultValue when date filter is active", () => {
			mockSearchParams.value = new URLSearchParams("filter_createdAfter=2026-01-01");
			renderDefault();
			const accordion = screen.getByTestId("accordion");
			const defaultValue = JSON.parse(
				accordion.getAttribute("data-default-value") ?? "[]",
			) as string[];
			expect(defaultValue).toContain("dates");
		});
	});

	// ─── Price section with custom badge ─────────────────────────────────────

	describe("price section custom badge", () => {
		it("shows custom price badge content when price range is custom", () => {
			mockSearchParams.value = new URLSearchParams("filter_priceMin=5000&filter_priceMax=25000");
			renderDefault();
			// Badge content should show the euro range
			expect(screen.getByText("50€ - 250€")).toBeInTheDocument();
		});

		it("does not show price badge when price range is at default", () => {
			// Default: 0 to maxPriceInEuros (500)
			renderDefault({ maxPriceInCents: 50000 });
			// Badge should not appear for price when no custom range set
			const badges = screen.queryAllByTestId("badge");
			const priceBadge = badges.find((b) => b.textContent!.includes("€ -"));
			expect(priceBadge).toBeUndefined();
		});
	});

	// ─── Color search clear on section reset ─────────────────────────────────

	describe("search state management", () => {
		it("color search input starts empty", () => {
			renderDefault({ colors: manyColors });
			const searchInput = screen.getByPlaceholderText("Rechercher une couleur...");
			expect((searchInput as HTMLInputElement).value).toBe("");
		});

		it("material search input starts empty", () => {
			renderDefault({ materials: manyMaterials });
			const searchInput = screen.getByPlaceholderText("Rechercher un matériau...");
			expect((searchInput as HTMLInputElement).value).toBe("");
		});
	});
});
