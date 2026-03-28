import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
	useSearchParams: () => ({
		forEach: vi.fn(),
		toString: () => "",
		get: vi.fn(),
	}),
}));

vi.mock("@/shared/components/filter-sheet-wrapper", () => ({
	FilterSheetWrapper: ({
		children,
		activeFiltersCount,
	}: {
		children: React.ReactNode;
		activeFiltersCount: number;
		hasActiveFilters: boolean;
		onClearAll: () => void;
		onApply: () => void;
		isPending?: boolean;
		triggerClassName?: string;
	}) => (
		<div data-testid="filter-sheet-wrapper" data-count={activeFiltersCount}>
			{children}
		</div>
	),
}));

vi.mock("@/shared/components/forms/checkbox-filter-item", () => ({
	CheckboxFilterItem: ({
		children,
		id,
	}: {
		children: React.ReactNode;
		id: string;
		checked: boolean;
		onCheckedChange: (checked: boolean) => void;
	}) => (
		<label htmlFor={id}>
			<input type="checkbox" id={id} readOnly />
			{children}
		</label>
	),
}));

vi.mock("@/shared/components/forms/radio-filter-item", () => ({
	RadioFilterItem: ({
		children,
		id,
	}: {
		children: React.ReactNode;
		id: string;
		name: string;
		value: string;
		checked: boolean;
		onCheckedChange: (checked: boolean) => void;
	}) => (
		<label htmlFor={id}>
			<input type="radio" id={id} readOnly />
			{children}
		</label>
	),
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: ({
		defaultValues,
	}: {
		defaultValues: unknown;
		onSubmit: (args: { value: unknown }) => Promise<void>;
	}) => ({
		handleSubmit: vi.fn(),
		reset: vi.fn(),
		Field: ({
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
		}) =>
			children({
				state: { value: [] },
				handleChange: vi.fn(),
				pushValue: vi.fn(),
				removeValue: vi.fn(),
			}),
		defaultValues,
	}),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		className,
	}: {
		children: React.ReactNode;
		variant?: string;
		className?: string;
		onClick?: () => void;
	}) => <button className={className}>{children}</button>,
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock("@/shared/components/ui/calendar", () => ({
	Calendar: () => <div data-testid="calendar" />,
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
	AmountRangeInputs: () => <div data-testid="amount-range-inputs" />,
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
	},
}));

vi.mock("lucide-react", () => ({
	CalendarIcon: () => <svg data-testid="icon-calendar" />,
}));

vi.mock("date-fns", () => ({
	format: (_date: Date, _fmt: string) => "1 janv. 2026",
}));

vi.mock("date-fns/locale", () => ({
	fr: {},
}));

import { OrdersFilterSheet } from "../orders-filter-sheet";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("OrdersFilterSheet", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

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
});
