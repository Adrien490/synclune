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
	sortBy: "created-descending",
};

const SORT_OPTIONS = [{ value: "created-descending", label: "Plus récents" }];

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
	mockLiveCount,
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
	mockLiveCount: {
		count: null as number | null,
		isUpdating: false,
		relaxed: null as { group: string; count: number } | null,
		countUnavailable: false,
	},
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

// useAppForm mock — `store.state.values` alimente le `useStore` mocké ci-dessous.
vi.mock("@/shared/components/forms", () => ({
	useAppForm: ({ defaultValues }: { defaultValues: FilterFormData }) => {
		const state = { values: defaultValues };
		return {
			store: { state },
			state,
			setFieldValue: mockSetFieldValue,
			reset: mockReset,
			handleSubmit: mockHandleSubmit,
		};
	},
}));

vi.mock("@tanstack/react-form", () => ({
	useStore: (
		store: { state: { values: FilterFormData } },
		selector: (state: { values: FilterFormData }) => FilterFormData,
	) => selector(store.state),
}));

// Le compteur vivant appelle une Server Action (prisma) — hors de portée de
// jsdom : mocké, sa mécanique a sa propre suite (use-live-filter-count).
vi.mock("@/modules/products/hooks/use-live-filter-count", () => ({
	useLiveFilterCount: () => ({ ...mockLiveCount }),
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
		applyButtonText,
		footerHint,
		applyDisabled,
		applyBusy,
	}: {
		children: React.ReactNode;
		onApply?: () => void;
		onClearAll?: () => void;
		activeFiltersCount?: number;
		hasActiveFilters?: boolean;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		applyButtonText?: string;
		footerHint?: React.ReactNode;
		applyDisabled?: boolean;
		applyBusy?: boolean;
	}) => (
		<div
			data-testid="filter-wrapper"
			data-active-count={activeFiltersCount}
			data-has-active={hasActiveFilters}
			data-open={open}
		>
			<button
				data-testid="apply-btn"
				onClick={onApply}
				disabled={applyDisabled}
				data-busy={applyBusy ? "true" : undefined}
			>
				{applyButtonText ?? "Apply"}
			</button>
			{footerHint && <div data-testid="footer-hint">{footerHint}</div>}
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
	CircleIcon: () => <span data-testid="circle-icon" />,
	MagnifyingGlassIcon: () => <span data-testid="search-icon" />,
	CaretDownIcon: () => <span data-testid="caret-down-icon" />,
	CaretUpIcon: () => <span data-testid="caret-up-icon" />,
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
	// Consommés par le compartiment « Trier par » (`ProductFilterCompartments`).
	PRODUCTS_DEFAULT_SORT: "created-descending",
	PRODUCTS_SORT_LABELS: {
		"created-descending": "Plus récents",
		"price-ascending": "Prix croissant",
	},
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

// 9 entrées : dépasse COMPARTMENT_VISIBLE_COUNT (6) ET SEARCH_THRESHOLD (8)
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
			sortOptions={SORT_OPTIONS}
			maxPriceInEuros={500}
			{...overrides}
		/>,
	);
}

/**
 * L'élément <section> d'un compartiment du PANNEAU, repéré par son en-tête.
 *
 * ⚠️ Le préfixe `sheet-` n'est pas cosmétique : le rail et le panneau sont
 * montés simultanément dans l'app (le rail est masqué en CSS, pas démonté), donc
 * chaque `id` porte son hôte. Un sélecteur non préfixé attraperait la copie du
 * rail — c'est le défaut que ce préfixe a corrigé.
 */
function compartment(id: string): HTMLElement | null {
	return document.querySelector(`section[aria-labelledby="filter-compartment-sheet-${id}"]`);
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
	mockLiveCount.count = null;
	mockLiveCount.isUpdating = false;
	mockLiveCount.relaxed = null;
	mockLiveCount.countUnavailable = false;
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
	});

	// --------------------------------------------------------------------------
	// COMPARTMENTS (« Le trieur » — rien ne se replie)
	// --------------------------------------------------------------------------

	describe("Compartments", () => {
		it("renders the 5 compartments, all visible at once (no accordion)", () => {
			renderDefault();
			for (const id of ["types", "price", "colors", "materials", "availability"]) {
				expect(compartment(id), `compartiment ${id}`).not.toBeNull();
			}
			// Plus d'accordéon : aucun trigger de repli.
			expect(document.querySelector("[data-slot='accordion-trigger']")).toBeNull();
		});

		it("shows the section labels", () => {
			renderDefault();
			expect(screen.getByText("Types de bijoux")).toBeInTheDocument();
			expect(screen.getByText("Prix")).toBeInTheDocument();
			expect(screen.getByText("Couleurs")).toBeInTheDocument();
			expect(screen.getByText("Matériaux")).toBeInTheDocument();
			expect(screen.getByText("Disponibilité")).toBeInTheDocument();
		});

		it("les en-têtes de compartiment sont collants dans la zone de scroll", () => {
			renderDefault();
			const header = compartment("colors")?.firstElementChild as HTMLElement;
			expect(header.className).toContain("sticky");
			expect(header.className).toContain("top-0");
		});
	});

	describe("Sections hidden when empty", () => {
		it("hides the Types compartment when productTypes is empty", () => {
			renderDefault({ productTypes: [] });
			expect(compartment("types")).toBeNull();
		});

		it("hides the Couleurs compartment when colors is empty", () => {
			renderDefault({ colors: [] });
			expect(compartment("colors")).toBeNull();
		});

		it("hides the Matériaux compartment when materials is empty", () => {
			renderDefault({ materials: [] });
			expect(compartment("materials")).toBeNull();
		});

		it("still renders Prix / Disponibilité when token sections are empty", () => {
			renderDefault({ colors: [], materials: [], productTypes: [] });
			expect(compartment("price")).not.toBeNull();
			expect(compartment("availability")).not.toBeNull();
		});
	});

	// --------------------------------------------------------------------------
	// LISTES BORNÉES (« + N autres »)
	// --------------------------------------------------------------------------

	describe("Overflow lists (6 + « + N autres »)", () => {
		it("shows all items without a toggle when the list fits (≤ 6)", () => {
			renderDefault();
			expect(screen.queryByRole("button", { name: /autre/ })).toBeNull();
			expect(screen.getByTestId("checkbox-sheet-color-rose")).toBeInTheDocument();
		});

		it("caps the list at 6 entries and shows « + N autres »", () => {
			renderDefault({ colors: manyColors });
			// 6 premières visibles (déjà triées par compte), les 3 dernières masquées
			expect(screen.getByTestId("checkbox-sheet-color-c6")).toBeInTheDocument();
			expect(screen.queryByTestId("checkbox-sheet-color-c7")).toBeNull();
			expect(screen.getByRole("button", { name: "+ 3 autres couleurs" })).toBeInTheDocument();
		});

		it("déplie SUR PLACE et garde le bouton monté (focus non perdu)", () => {
			renderDefault({ colors: manyColors });
			const toggle = screen.getByRole("button", { name: "+ 3 autres couleurs" });
			fireEvent.click(toggle);
			expect(screen.getByTestId("checkbox-sheet-color-c9")).toBeInTheDocument();
			// Le bouton devient « Réduire la liste » sans quitter le DOM.
			expect(screen.getByRole("button", { name: "Réduire la liste" })).toBeInTheDocument();
		});

		it("does not show the search input while collapsed", () => {
			renderDefault({ colors: manyColors });
			const section = compartment("colors")!;
			expect(section.querySelectorAll("input[type='search']").length).toBe(0);
		});

		it("shows the search input once expanded (>8 entries), sans autoFocus", () => {
			renderDefault({ colors: manyColors });
			fireEvent.click(screen.getByRole("button", { name: "+ 3 autres couleurs" }));
			const search = compartment("colors")!.querySelector("input[type='search']");
			expect(search).toBeInTheDocument();
			expect(document.activeElement).not.toBe(search);
		});
	});

	// --------------------------------------------------------------------------
	// SECTION CONTENT
	// --------------------------------------------------------------------------

	describe("Types section", () => {
		it("shows a checkbox for each product type", () => {
			renderDefault();
			expect(screen.getByTestId("checkbox-sheet-type-bagues")).toBeInTheDocument();
			expect(screen.getByTestId("checkbox-sheet-type-colliers")).toBeInTheDocument();
		});

		it("shows the product count for each type", () => {
			renderDefault();
			expect(screen.getByTestId("count-sheet-type-bagues")).toBeInTheDocument();
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
				.filter((el) => (el as HTMLInputElement).id.startsWith("sheet-type-"));
			expect((checkboxes[0] as HTMLInputElement).id).toBe("sheet-type-high");
			expect((checkboxes[2] as HTMLInputElement).id).toBe("sheet-type-low");
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
			expect(screen.getByTestId("checkbox-sheet-color-or")).toBeInTheDocument();
			expect(screen.getByTestId("checkbox-sheet-color-argent")).toBeInTheDocument();
		});

		it("renders color swatch indicators", () => {
			renderDefault();
			expect(screen.getByTestId("indicator-sheet-color-or")).toBeInTheDocument();
		});

		it("sorts colors by SKU count descending", () => {
			renderDefault();
			const checkboxes = screen
				.getAllByRole("checkbox")
				.filter((el) => (el as HTMLInputElement).id.startsWith("sheet-color-"));
			expect((checkboxes[0] as HTMLInputElement).id).toBe("sheet-color-or");
		});
	});

	describe("Matériaux section", () => {
		it("shows a checkbox for each material", () => {
			renderDefault();
			expect(screen.getByTestId("checkbox-sheet-material-acier")).toBeInTheDocument();
			expect(screen.getByTestId("checkbox-sheet-material-titane")).toBeInTheDocument();
		});
	});

	describe("Disponibilité section", () => {
		it("shows the in-stock and on-sale switches", () => {
			renderDefault();
			expect(screen.getByTestId("switch-sheet-filter-in-stock")).toBeInTheDocument();
			expect(screen.getByTestId("switch-sheet-filter-on-sale")).toBeInTheDocument();
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
			fireEvent.click(screen.getByTestId("checkbox-sheet-type-bagues").querySelector("input")!);
			expect(mockSetFieldValue).toHaveBeenCalledWith("productTypes", ["bagues"]);
		});

		it("removes a slug from the field when a checkbox is unchecked", () => {
			mockParseFilterValues.mockReturnValue({ ...EMPTY_FORM, colors: ["or", "argent"] });
			renderDefault();
			fireEvent.click(screen.getByTestId("checkbox-sheet-color-or").querySelector("input")!);
			expect(mockSetFieldValue).toHaveBeenCalledWith("colors", ["argent"]);
		});

		it("sets the in-stock field when the switch is toggled", () => {
			renderDefault();
			fireEvent.click(screen.getByTestId("switch-sheet-filter-in-stock"));
			expect(mockSetFieldValue).toHaveBeenCalledWith("inStockOnly", true);
		});
	});

	// --------------------------------------------------------------------------
	// COMPTEUR VIVANT → FOOTER
	// --------------------------------------------------------------------------

	describe("Live count in the footer (« Voir les N pièces »)", () => {
		it("uses a neutral label before the first response", () => {
			renderDefault();
			expect(screen.getByTestId("apply-btn")).toHaveTextContent("Voir les pièces");
		});

		it("shows the live count in the apply button", () => {
			mockLiveCount.count = 9;
			renderDefault();
			expect(screen.getByTestId("apply-btn")).toHaveTextContent("Voir les 9 pièces");
		});

		it("uses the singular at 1", () => {
			mockLiveCount.count = 1;
			renderDefault();
			expect(screen.getByTestId("apply-btn")).toHaveTextContent("Voir la pièce");
		});

		it("pendant un recomptage, aucune SECONDE réponse au « combien ? »", () => {
			// Le recalcul est signalé par le spinner du bouton (`applyBusy`), au même
			// endroit que le nombre. Un indice de footer « — pièces · mise à jour… »
			// cohabitait avec un bouton affichant encore l'ancien chiffre : deux
			// réponses simultanées et divergentes.
			mockLiveCount.count = 9;
			mockLiveCount.isUpdating = true;
			renderDefault();
			expect(screen.queryByTestId("footer-hint")).toBeNull();
			expect(screen.getByTestId("apply-btn")).toHaveAttribute("data-busy", "true");
			// Et il reste cliquable : on ne bloque pas sur un chiffre provisoire.
			expect(screen.getByTestId("apply-btn")).not.toBeDisabled();
		});

		it("un compte indisponible (rate limit) retombe sur le libellé neutre", () => {
			mockLiveCount.count = 9;
			mockLiveCount.countUnavailable = true;
			renderDefault();
			expect(screen.getByTestId("apply-btn")).toHaveTextContent("Voir les pièces");
			expect(screen.getByTestId("apply-btn")).not.toBeDisabled();
		});

		it("disables apply and proposes a numbered exit at 0 results", () => {
			mockLiveCount.count = 0;
			mockLiveCount.relaxed = { group: "colors", count: 24 };
			renderDefault();
			expect(screen.getByTestId("apply-btn")).toBeDisabled();
			expect(screen.getByTestId("apply-btn")).toHaveTextContent("Aucune pièce");
			expect(screen.getByTestId("footer-hint")).toHaveTextContent(
				"Aucune pièce ne réunit ces critères. Retire la couleur pour en voir 24.",
			);
		});

		it("degrades the empty-state copy without a number when no relaxed count exists", () => {
			mockLiveCount.count = 0;
			renderDefault();
			expect(screen.getByTestId("footer-hint")).toHaveTextContent(
				"Retire un critère pour élargir.",
			);
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
				render(
					<ProductFilterSheet
						colors={[]}
						materials={[]}
						sortOptions={SORT_OPTIONS}
						maxPriceInEuros={200}
					/>,
				),
			).not.toThrow();
		});

		it("renders without throwing when activeProductTypeSlug is provided", () => {
			expect(() => renderDefault({ activeProductTypeSlug: "bagues" })).not.toThrow();
		});
	});
});
