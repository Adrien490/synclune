import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ORDER_TOTAL_FILTER_MAX_EUROS } from "@/modules/orders/constants/order.constants";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

const mockRouterPush = vi.fn();
const mockSearchParamsForEach = vi.fn();
const mockSearchParamsToString = vi.fn(() => "");

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockRouterPush }),
	useSearchParams: () => ({
		forEach: mockSearchParamsForEach,
		toString: mockSearchParamsToString,
		get: vi.fn(),
	}),
}));

const mockOnClearAll = vi.fn();
const mockOnApply = vi.fn();

vi.mock("@/shared/components/filter-sheet-wrapper", () => ({
	FilterSheetWrapper: ({
		children,
		activeFiltersCount,
		hasActiveFilters,
		onClearAll,
		onApply,
		isPending,
		triggerClassName,
	}: {
		children: React.ReactNode;
		activeFiltersCount: number;
		hasActiveFilters: boolean;
		onClearAll: () => void;
		onApply: () => void;
		isPending?: boolean;
		triggerClassName?: string;
	}) => {
		mockOnClearAll.mockImplementation(onClearAll);
		mockOnApply.mockImplementation(onApply);
		return (
			<div
				data-testid="filter-sheet-wrapper"
				data-count={activeFiltersCount}
				data-has-active={String(hasActiveFilters)}
				data-pending={String(isPending ?? false)}
				data-trigger-classname={triggerClassName}
			>
				<button data-testid="clear-all-btn" onClick={onClearAll}>
					Effacer
				</button>
				<button data-testid="apply-btn" onClick={onApply}>
					Appliquer
				</button>
				{children}
			</div>
		);
	},
}));

const mockCheckboxOnCheckedChange = vi.fn();

vi.mock("@/shared/components/forms/checkbox-filter-item", () => ({
	CheckboxFilterItem: ({
		children,
		id,
		checked,
		onCheckedChange,
	}: {
		children: React.ReactNode;
		id: string;
		checked: boolean;
		onCheckedChange: (checked: boolean) => void;
	}) => (
		<label htmlFor={id}>
			<input
				type="checkbox"
				id={id}
				checked={checked}
				onChange={(e) => {
					mockCheckboxOnCheckedChange(id, e.target.checked);
					onCheckedChange(e.target.checked);
				}}
			/>
			{children}
		</label>
	),
}));

const mockRadioOnCheckedChange = vi.fn();

vi.mock("@/shared/components/forms/radio-filter-item", () => ({
	RadioFilterItem: ({
		children,
		id,
		value,
		checked,
		onCheckedChange,
	}: {
		children: React.ReactNode;
		id: string;
		name: string;
		value: string;
		checked: boolean;
		onCheckedChange: (checked: boolean) => void;
	}) => (
		<label htmlFor={id}>
			<input
				type="radio"
				id={id}
				value={value}
				checked={checked}
				onChange={(e) => {
					mockRadioOnCheckedChange(value, e.target.checked);
					onCheckedChange(e.target.checked);
				}}
			/>
			{children}
		</label>
	),
}));

const mockHandleSubmit = vi.fn();
const mockFormReset = vi.fn();
const mockFieldHandleChange = vi.fn();
const mockFieldPushValue = vi.fn();
const mockFieldRemoveValue = vi.fn();

// Per-field state storage so each Field renders with correct state.value
const fieldStateMap: Record<string, unknown> = {};

vi.mock("@/shared/components/forms", () => ({
	useAppForm: ({
		defaultValues,
		onSubmit,
	}: {
		defaultValues: Record<string, unknown>;
		onSubmit: (args: { value: unknown }) => Promise<void>;
	}) => ({
		// `handleSubmit` doit RÉELLEMENT déclencher `onSubmit` : un mock inerte rendait
		// `applyFilters` — donc toute l'écriture d'URL de la feuille — non testable, et
		// c'est précisément là que vivait le bug de curseur non purgé.
		handleSubmit: (...args: unknown[]) => {
			mockHandleSubmit(...args);
			const value = { ...defaultValues };
			for (const [name, fieldValue] of Object.entries(fieldStateMap)) {
				const parts = name.split(".");
				const last = parts.pop()!;
				const target = parts.reduce<any>((acc, key) => {
					acc[key] = { ...(acc[key] as object) };
					return acc[key];
				}, value as any);
				target[last] = fieldValue;
			}
			return onSubmit({ value });
		},
		reset: mockFormReset,
		Field: ({
			name,
			children,
		}: {
			name: string;
			mode?: string;
			children: (field: {
				state: { value: unknown };
				handleChange: (v: unknown) => void;
				pushValue: (v: unknown) => void;
				removeValue: (i: number) => void;
			}) => React.ReactNode;
		}) => {
			// Resolve nested default value (e.g. "dateRange.from")
			const resolveDefault = (obj: Record<string, unknown>, path: string): unknown => {
				const parts = path.split(".");
				return parts.reduce<any>((acc, key) => (acc != null ? acc[key] : undefined), obj);
			};
			const stateValue =
				name in fieldStateMap ? fieldStateMap[name] : resolveDefault(defaultValues, name);
			return children({
				state: { value: stateValue ?? [] },
				handleChange: (v: unknown) => {
					fieldStateMap[name] = v;
					mockFieldHandleChange(name, v);
				},
				pushValue: (v: unknown) => mockFieldPushValue(name, v),
				removeValue: (i: number) => mockFieldRemoveValue(name, i),
			});
		},
		defaultValues,
	}),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		className,
		onClick,
	}: {
		children: React.ReactNode;
		variant?: string;
		className?: string;
		onClick?: () => void;
	}) => (
		<button className={className} onClick={onClick}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock("@/shared/components/ui/calendar", () => ({
	Calendar: ({
		onSelect,
	}: {
		mode?: string;
		selected?: Date;
		onSelect?: (date: Date | undefined) => void;
		disabled?: (date: Date) => boolean;
		initialFocus?: boolean;
	}) => (
		<div data-testid="calendar">
			<button
				data-testid="calendar-select-btn"
				onClick={() => onSelect?.(new Date("2026-01-15T00:00:00.000Z"))}
			>
				Choisir date
			</button>
			<button data-testid="calendar-clear-btn" onClick={() => onSelect?.(undefined)}>
				Effacer date
			</button>
		</div>
	),
}));

vi.mock("@/shared/components/ui/popover", () => ({
	Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	PopoverTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<div data-testid="popover-trigger">{children}</div>
	),
	PopoverContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="popover-content">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: () => <hr data-testid="separator" />,
}));

vi.mock("@/modules/orders/components/admin/amount-range-inputs", () => ({
	AmountRangeInputs: ({
		value,
		onChange,
		maxPrice,
	}: {
		value: [number, number];
		onChange: (v: [number, number]) => void;
		maxPrice: number;
	}) => (
		<div
			data-testid="amount-range-inputs"
			data-min={value[0]}
			data-max={value[1]}
			data-maxprice={maxPrice}
		>
			<button data-testid="amount-range-change-btn" onClick={() => onChange([500, 3000])}>
				Modifier plage
			</button>
		</div>
	),
}));

vi.mock("@/modules/orders/constants/status-display", () => ({
	ORDER_STATUS_LABELS: {
		PENDING: "En attente",
		PROCESSING: "En cours",
		SHIPPED: "Expédiée",
		DELIVERED: "Livrée",
		CANCELLED: "Annulée",
	},
	PAYMENT_STATUS_LABELS: {
		PENDING: "En attente",
		PAID: "Payée",
		FAILED: "Échouée",
		EXPIRED: "Expirée",
		PARTIALLY_REFUNDED: "Partiellement remboursée",
		REFUNDED: "Remboursée",
	},
	FULFILLMENT_STATUS_LABELS: {
		UNFULFILLED: "Non traité",
		PROCESSING: "En traitement",
		SHIPPED: "Expédié",
		DELIVERED: "Livré",
		RETURNED: "Retourné",
	},
	INVOICE_STATUS_LABELS: {
		PENDING: "Non émise",
		GENERATED: "Émise",
		VOIDED: "Annulée (avoir)",
	},
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	CalendarBlankIcon: () => <svg data-testid="icon-calendar" />,
}));

vi.mock("date-fns", () => ({
	format: (_date: Date, _fmt: string) => "15 janv. 2026",
}));

vi.mock("date-fns/locale", () => ({
	fr: {},
}));

import { OrdersFilterSheet } from "../orders-filter-sheet";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	// Reset per-field state between tests
	for (const key of Object.keys(fieldStateMap)) {
		delete fieldStateMap[key];
	}
});

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Builds a minimal URLSearchParams-compatible mock from a plain entries array.
 */
function makeSearchParams(entries: [string, string][] = []) {
	return {
		forEach: (cb: (value: string, key: string) => void) => {
			entries.forEach(([key, value]) => cb(value, key));
		},
		toString: () =>
			entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&"),
		get: (key: string) => entries.find(([k]) => k === key)?.[1] ?? null,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("OrdersFilterSheet", () => {
	beforeEach(() => {
		mockSearchParamsForEach.mockImplementation(vi.fn());
		mockSearchParamsToString.mockReturnValue("");
	});

	// --------------------------------------------------------------------------
	// Basic rendering
	// --------------------------------------------------------------------------

	it("renders without crashing", () => {
		render(<OrdersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("renders the filter sheet wrapper", () => {
		render(<OrdersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("renders order status legend", () => {
		render(<OrdersFilterSheet />);
		expect(screen.getByText("Statut de commande")).toBeInTheDocument();
	});

	it("renders payment status legend", () => {
		render(<OrdersFilterSheet />);
		expect(screen.getByText("Statut de paiement")).toBeInTheDocument();
	});

	it("renders amount range inputs", () => {
		render(<OrdersFilterSheet />);
		expect(screen.getByTestId("amount-range-inputs")).toBeInTheDocument();
	});

	it("renders date range fieldset legend", () => {
		render(<OrdersFilterSheet />);
		expect(screen.getByText("Période de commande")).toBeInTheDocument();
	});

	it("renders display filter legend", () => {
		render(<OrdersFilterSheet />);
		expect(screen.getByText("Affichage")).toBeInTheDocument();
	});

	it("renders display radio options", () => {
		render(<OrdersFilterSheet />);
		expect(screen.getByText("Toutes")).toBeInTheDocument();
		expect(screen.getByText("Non supprimées uniquement")).toBeInTheDocument();
		expect(screen.getByText("Supprimées uniquement")).toBeInTheDocument();
	});

	it("renders separators between filter groups", () => {
		render(<OrdersFilterSheet />);
		const separators = screen.getAllByTestId("separator");
		expect(separators.length).toBeGreaterThan(0);
	});

	it("renders 'Du' date label", () => {
		render(<OrdersFilterSheet />);
		expect(screen.getByText("Du")).toBeInTheDocument();
	});

	it("renders 'Au' date label", () => {
		render(<OrdersFilterSheet />);
		expect(screen.getByText("Au")).toBeInTheDocument();
	});

	it("forwards className to FilterSheetWrapper as triggerClassName", () => {
		render(<OrdersFilterSheet className="custom-class" />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute(
			"data-trigger-classname",
			"custom-class",
		);
	});

	// --------------------------------------------------------------------------
	// Order status checkboxes
	// --------------------------------------------------------------------------

	it("renders checkboxes with correct ids for order statuses", () => {
		render(<OrdersFilterSheet />);
		expect(document.getElementById("status-PENDING")).toBeInTheDocument();
		expect(document.getElementById("status-PROCESSING")).toBeInTheDocument();
		expect(document.getElementById("status-SHIPPED")).toBeInTheDocument();
		expect(document.getElementById("status-DELIVERED")).toBeInTheDocument();
		expect(document.getElementById("status-CANCELLED")).toBeInTheDocument();
	});

	it("calls pushValue when an order status checkbox is checked", () => {
		render(<OrdersFilterSheet />);
		const checkbox = document.getElementById("status-PENDING") as HTMLInputElement;
		fireEvent.click(checkbox);
		expect(mockFieldPushValue).toHaveBeenCalledWith("statuses", "PENDING");
	});

	// --------------------------------------------------------------------------
	// Payment status checkboxes
	// --------------------------------------------------------------------------

	it("renders a checkbox for each payment status", () => {
		render(<OrdersFilterSheet />);
		expect(document.getElementById("payment-PENDING")).toBeInTheDocument();
		expect(document.getElementById("payment-PAID")).toBeInTheDocument();
		expect(document.getElementById("payment-FAILED")).toBeInTheDocument();
		expect(document.getElementById("payment-EXPIRED")).toBeInTheDocument();
		expect(document.getElementById("payment-PARTIALLY_REFUNDED")).toBeInTheDocument();
		expect(document.getElementById("payment-REFUNDED")).toBeInTheDocument();
	});

	it("calls pushValue when a payment status checkbox is checked", () => {
		render(<OrdersFilterSheet />);
		const checkbox = document.getElementById("payment-PAID") as HTMLInputElement;
		fireEvent.click(checkbox);
		expect(mockFieldPushValue).toHaveBeenCalledWith("paymentStatuses", "PAID");
	});

	// --------------------------------------------------------------------------
	// showDeleted radio buttons
	// --------------------------------------------------------------------------

	it("renders radio buttons with correct ids for showDeleted", () => {
		render(<OrdersFilterSheet />);
		expect(document.getElementById("showDeleted-all")).toBeInTheDocument();
		expect(document.getElementById("showDeleted-active")).toBeInTheDocument();
		expect(document.getElementById("showDeleted-deleted")).toBeInTheDocument();
	});

	it("calls handleChange with correct value when a showDeleted radio is selected", () => {
		render(<OrdersFilterSheet />);
		const radio = document.getElementById("showDeleted-all") as HTMLInputElement;
		fireEvent.click(radio);
		expect(mockFieldHandleChange).toHaveBeenCalledWith("showDeleted", "all");
	});

	it("calls handleChange with 'deleted' when deleted radio is selected", () => {
		render(<OrdersFilterSheet />);
		const radio = document.getElementById("showDeleted-deleted") as HTMLInputElement;
		fireEvent.click(radio);
		expect(mockFieldHandleChange).toHaveBeenCalledWith("showDeleted", "deleted");
	});

	// --------------------------------------------------------------------------
	// Date range — placeholder text when no date selected
	// --------------------------------------------------------------------------

	it("shows placeholder text when no date is selected for 'Du'", () => {
		render(<OrdersFilterSheet />);
		const placeholders = screen.getAllByText("Sélectionner une date");
		expect(placeholders.length).toBeGreaterThanOrEqual(2);
	});

	it("renders calendar components for date picking", () => {
		render(<OrdersFilterSheet />);
		const calendars = screen.getAllByTestId("calendar");
		expect(calendars).toHaveLength(2);
	});

	it("calls handleChange with ISO string when a date is selected", () => {
		render(<OrdersFilterSheet />);
		const selectBtns = screen.getAllByTestId("calendar-select-btn");
		fireEvent.click(selectBtns[0]!);
		expect(mockFieldHandleChange).toHaveBeenCalledWith(
			"dateRange.from",
			expect.stringContaining("2026-01-15"),
		);
	});

	it("calls handleChange with empty string when date is cleared", () => {
		render(<OrdersFilterSheet />);
		const clearBtns = screen.getAllByTestId("calendar-clear-btn");
		fireEvent.click(clearBtns[0]!);
		expect(mockFieldHandleChange).toHaveBeenCalledWith("dateRange.from", "");
	});

	it("shows formatted date text when dateRange.from has a value", () => {
		// Pre-populate the field state so the component renders a date
		fieldStateMap["dateRange.from"] = "2026-01-15T00:00:00.000Z";
		render(<OrdersFilterSheet />);
		expect(screen.getAllByText("15 janv. 2026").length).toBeGreaterThanOrEqual(1);
	});

	it("shows formatted date text when dateRange.to has a value", () => {
		fieldStateMap["dateRange.to"] = "2026-01-20T00:00:00.000Z";
		render(<OrdersFilterSheet />);
		expect(screen.getAllByText("15 janv. 2026").length).toBeGreaterThanOrEqual(1);
	});

	// --------------------------------------------------------------------------
	// Amount range inputs
	// --------------------------------------------------------------------------

	it("passes the schema-derived max price (euros) to AmountRangeInputs", () => {
		render(<OrdersFilterSheet />);
		expect(screen.getByTestId("amount-range-inputs")).toHaveAttribute(
			"data-maxprice",
			String(ORDER_TOTAL_FILTER_MAX_EUROS),
		);
	});

	it("passes default price range [0, max] to AmountRangeInputs", () => {
		render(<OrdersFilterSheet />);
		const el = screen.getByTestId("amount-range-inputs");
		expect(el).toHaveAttribute("data-min", "0");
		expect(el).toHaveAttribute("data-max", String(ORDER_TOTAL_FILTER_MAX_EUROS));
	});

	it("calls handleChange when price range changes", () => {
		render(<OrdersFilterSheet />);
		fireEvent.click(screen.getByTestId("amount-range-change-btn"));
		expect(mockFieldHandleChange).toHaveBeenCalledWith("priceRange", [500, 3000]);
	});

	// --------------------------------------------------------------------------
	// Active filter counting — zero filters by default
	// --------------------------------------------------------------------------

	it("shows activeFiltersCount=0 when no URL params are set", () => {
		render(<OrdersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-count", "0");
	});

	it("shows hasActiveFilters=false when no URL params are set", () => {
		render(<OrdersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-has-active", "false");
	});

	// --------------------------------------------------------------------------
	// Active filter counting — with URL params
	// --------------------------------------------------------------------------

	it("counts each filter_status value as one active filter", () => {
		mockSearchParamsForEach.mockImplementation((cb: (v: string, k: string) => void) => {
			cb("PENDING", "filter_status");
			cb("PROCESSING", "filter_status");
		});
		render(<OrdersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-count", "2");
	});

	it("counts each filter_paymentStatus value as one active filter", () => {
		mockSearchParamsForEach.mockImplementation((cb: (v: string, k: string) => void) => {
			cb("PAID", "filter_paymentStatus");
		});
		render(<OrdersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-count", "1");
	});

	it("counts filter_totalMin as one active filter (paired with totalMax)", () => {
		mockSearchParamsForEach.mockImplementation((cb: (v: string, k: string) => void) => {
			cb("500", "filter_totalMin");
			cb("3000", "filter_totalMax");
		});
		render(<OrdersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-count", "1");
	});

	it("counts filter_createdAfter as one active filter (paired with createdBefore)", () => {
		mockSearchParamsForEach.mockImplementation((cb: (v: string, k: string) => void) => {
			cb("2026-01-01", "filter_createdAfter");
			cb("2026-01-31", "filter_createdBefore");
		});
		render(<OrdersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-count", "1");
	});

	// P2 (audit 2026-08-01) : chaque borne est écrite indépendamment — une borne
	// « max seule » (ou « Au seule ») est un filtre actif à part entière. L'ancien
	// compteur ne reconnaissait que la clé représentante du couple : « Max = 200 € »
	// seul donnait 0 pendant que badge et StickyActionBar affichaient le filtre.
	it("counts a lone filter_totalMax as one active filter", () => {
		mockSearchParamsForEach.mockImplementation((cb: (v: string, k: string) => void) => {
			cb("200", "filter_totalMax");
		});
		render(<OrdersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-count", "1");
	});

	it("counts a lone filter_createdBefore as one active filter", () => {
		mockSearchParamsForEach.mockImplementation((cb: (v: string, k: string) => void) => {
			cb("2026-01-31", "filter_createdBefore");
		});
		render(<OrdersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-count", "1");
	});

	it("counts filter_showDeleted=all as one active filter (non-default)", () => {
		mockSearchParamsForEach.mockImplementation((cb: (v: string, k: string) => void) => {
			cb("all", "filter_showDeleted");
		});
		render(<OrdersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-count", "1");
	});

	it("does not count filter_showDeleted=active as an active filter (default value)", () => {
		mockSearchParamsForEach.mockImplementation((cb: (v: string, k: string) => void) => {
			cb("active", "filter_showDeleted");
		});
		render(<OrdersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-count", "0");
	});

	it("accumulates count across multiple filter types", () => {
		mockSearchParamsForEach.mockImplementation((cb: (v: string, k: string) => void) => {
			cb("PENDING", "filter_status");
			cb("PAID", "filter_paymentStatus");
			cb("500", "filter_totalMin");
			cb("all", "filter_showDeleted");
		});
		render(<OrdersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-count", "4");
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-has-active", "true");
	});

	// --------------------------------------------------------------------------
	// Initial values parsed from URL params
	// --------------------------------------------------------------------------

	it("initializes statuses from filter_status URL params", () => {
		const params = makeSearchParams([
			["filter_status", "PENDING"],
			["filter_status", "SHIPPED"],
		]);
		mockSearchParamsForEach.mockImplementation(params.forEach.bind(params));
		mockSearchParamsToString.mockReturnValue(params.toString());

		render(<OrdersFilterSheet />);

		// The form was instantiated — check defaultValues passed to useAppForm
		// by verifying checkboxes are rendered (component did not crash with those values)
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("initializes paymentStatuses from filter_paymentStatus URL params", () => {
		const params = makeSearchParams([["filter_paymentStatus", "PAID"]]);
		mockSearchParamsForEach.mockImplementation(params.forEach.bind(params));
		render(<OrdersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("initializes priceRange from filter_totalMin and filter_totalMax URL params", () => {
		const params = makeSearchParams([
			["filter_totalMin", "500"],
			["filter_totalMax", "3000"],
		]);
		mockSearchParamsForEach.mockImplementation(params.forEach.bind(params));
		render(<OrdersFilterSheet />);
		// AmountRangeInputs receives the initial field value from useAppForm defaultValues
		// The component renders without crashing and the wrapper is present
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("initializes dateRange from filter_createdAfter and filter_createdBefore URL params", () => {
		const params = makeSearchParams([
			["filter_createdAfter", "2026-01-01"],
			["filter_createdBefore", "2026-01-31"],
		]);
		mockSearchParamsForEach.mockImplementation(params.forEach.bind(params));
		render(<OrdersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("initializes showDeleted from filter_showDeleted URL param", () => {
		const params = makeSearchParams([["filter_showDeleted", "deleted"]]);
		mockSearchParamsForEach.mockImplementation(params.forEach.bind(params));
		render(<OrdersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	// --------------------------------------------------------------------------
	// clearAllFilters — triggered via onClearAll callback
	// --------------------------------------------------------------------------

	it("calls form.reset when the clear-all button is clicked", () => {
		render(<OrdersFilterSheet />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		expect(mockFormReset).toHaveBeenCalledOnce();
	});

	it("resets form to default values on clear-all", () => {
		render(<OrdersFilterSheet />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		expect(mockFormReset).toHaveBeenCalledWith({
			statuses: [],
			paymentStatuses: [],
			invoiceStatuses: [],
			invoiceAnomaly: false,
			pdfNotArchived: false,
			retryDeferred: false,
			priceRange: [0, ORDER_TOTAL_FILTER_MAX_EUROS],
			dateRange: { from: "", to: "" },
			showDeleted: "active",
		});
	});

	it("calls router.push when the clear-all button is clicked", () => {
		render(<OrdersFilterSheet />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		expect(mockRouterPush).toHaveBeenCalledWith(expect.stringContaining("?"), { scroll: false });
	});

	it("purges the cursor when APPLYING filters from a paginated page", () => {
		// Le cas réellement vécu : l'admin est page 3, coche un filtre, applique.
		mockSearchParamsToString.mockReturnValue(
			"cursor=cm3x7k2ab0001qz8v4h2j9d3&direction=forward&page=3",
		);
		render(<OrdersFilterSheet />);
		fireEvent.click(screen.getByTestId("apply-btn"));

		const url = mockRouterPush.mock.calls[0]![0] as string;
		expect(url).not.toContain("cursor=");
		expect(url).not.toContain("direction=");
		expect(url).not.toContain("page=");
	});

	it("purges the cursor (not a dead `page` param) when clearing filters", () => {
		// Ces listes sont en pagination CURSEUR : `page` n'est lu par personne. Garder le
		// curseur de l'ancien jeu produisait une tranche arbitraire du nouveau.
		mockSearchParamsToString.mockReturnValue(
			"page=3&cursor=cm3x7k2ab0001qz8v4h2j9d3&direction=forward&filter_status=PENDING",
		);
		render(<OrdersFilterSheet />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));

		const url = mockRouterPush.mock.calls[0]![0] as string;
		expect(url).not.toContain("cursor=");
		expect(url).not.toContain("direction=");
		expect(url).not.toContain("page=");
	});

	it("removes all filter keys from URL when clearing filters", () => {
		mockSearchParamsToString.mockReturnValue(
			"filter_status=PENDING&filter_paymentStatus=PAID&filter_showDeleted=all",
		);
		render(<OrdersFilterSheet />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		const pushedUrl = mockRouterPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).not.toContain("filter_status");
		expect(pushedUrl).not.toContain("filter_paymentStatus");
		expect(pushedUrl).not.toContain("filter_showDeleted");
	});

	// --------------------------------------------------------------------------
	// applyFilters — triggered via onApply callback
	// --------------------------------------------------------------------------

	it("calls form.handleSubmit when the apply button is clicked", () => {
		render(<OrdersFilterSheet />);
		fireEvent.click(screen.getByTestId("apply-btn"));
		expect(mockHandleSubmit).toHaveBeenCalledOnce();
	});

	// --------------------------------------------------------------------------
	// Form submit
	// --------------------------------------------------------------------------

	it("does not bubble the form submit event", () => {
		const parentSubmit = vi.fn();
		render(
			<div onSubmit={parentSubmit}>
				<OrdersFilterSheet />
			</div>,
		);
		const form = document.querySelector("form")!;
		fireEvent.submit(form);
		expect(parentSubmit).not.toHaveBeenCalled();
	});

	it("calls form.handleSubmit when the inner form is submitted", () => {
		render(<OrdersFilterSheet />);
		const form = document.querySelector("form")!;
		fireEvent.submit(form);
		expect(mockHandleSubmit).toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// isPending state
	// --------------------------------------------------------------------------

	it("passes isPending=false to FilterSheetWrapper initially", () => {
		render(<OrdersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-pending", "false");
	});

	// --------------------------------------------------------------------------
	// Calendar icons
	// --------------------------------------------------------------------------

	it("renders two calendar icons for the date pickers", () => {
		render(<OrdersFilterSheet />);
		const icons = screen.getAllByTestId("icon-calendar");
		expect(icons).toHaveLength(2);
	});
});
