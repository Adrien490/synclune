import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPush } = vi.hoisted(() => ({
	mockPush: vi.fn(),
}));

let mockSearchParamsValue = new URLSearchParams();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
	useSearchParams: () => mockSearchParamsValue,
}));

vi.mock("@/app/generated/prisma/browser", () => ({
	DiscountType: {
		PERCENTAGE: "PERCENTAGE",
		FIXED_AMOUNT: "FIXED_AMOUNT",
	},
}));

vi.mock("@/modules/discounts/constants/discount.constants", () => ({
	DISCOUNT_TYPE_LABELS: {
		PERCENTAGE: "Pourcentage",
		FIXED_AMOUNT: "Montant fixe",
	},
}));

vi.mock("@/shared/components/filter-sheet-wrapper", () => ({
	FilterSheetWrapper: ({
		children,
		activeFiltersCount,
		hasActiveFilters,
	}: {
		children: React.ReactNode;
		activeFiltersCount: number;
		hasActiveFilters: boolean;
		onClearAll: () => void;
		onApply: () => void;
		isPending?: boolean;
		triggerClassName?: string;
	}) => (
		<div
			data-testid="filter-sheet-wrapper"
			data-active-count={activeFiltersCount}
			data-has-active={hasActiveFilters}
		>
			{children}
		</div>
	),
}));

vi.mock("@/shared/components/forms/radio-filter-item", () => ({
	RadioFilterItem: ({
		children,
		id,
		value,
		checked,
	}: {
		children: React.ReactNode;
		id: string;
		name: string;
		value: string;
		checked: boolean;
		onCheckedChange: (checked: boolean) => void;
	}) => (
		<label data-testid={`radio-item-${id}`} data-value={value} data-checked={checked}>
			<input type="radio" id={id} value={value} readOnly checked={checked} />
			{children}
		</label>
	),
}));

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: () => <hr data-testid="separator" />,
}));

vi.mock("@tanstack/react-form", () => ({
	useForm: ({ defaultValues }: { defaultValues: Record<string, string>; onSubmit: unknown }) => ({
		handleSubmit: vi.fn(),
		reset: vi.fn(),
		Field: ({
			children,
			name,
		}: {
			children: (field: {
				state: { value: string };
				handleChange: (value: string) => void;
			}) => React.ReactNode;
			name: string;
		}) =>
			children({
				state: { value: defaultValues[name] ?? "all" },
				handleChange: vi.fn(),
			}),
	}),
}));

import { DiscountsFilterSheet } from "../discounts-filter-sheet";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("DiscountsFilterSheet", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSearchParamsValue = new URLSearchParams();
	});

	// ─── Filter sections ──────────────────────────────────────────────────────

	it("renders the filter sheet wrapper", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("renders the type filter section", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByText("Type")).toBeInTheDocument();
	});

	it("renders the status filter section", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByText("Statut")).toBeInTheDocument();
	});

	it("renders the usage filter section", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByText("Utilisations")).toBeInTheDocument();
	});

	// ─── Radio items ──────────────────────────────────────────────────────────

	it("renders 'Tous' radio item for type filter", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByTestId("radio-item-type-all")).toBeInTheDocument();
	});

	it("renders 'Pourcentage' radio item for type filter", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByText("Pourcentage")).toBeInTheDocument();
	});

	it("renders 'Montant fixe' radio item for type filter", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByText("Montant fixe")).toBeInTheDocument();
	});

	it("renders 'Actifs' radio item for status filter", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByText("Actifs")).toBeInTheDocument();
	});

	it("renders 'Inactifs' radio item for status filter", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByText("Inactifs")).toBeInTheDocument();
	});

	it("renders 'Avec utilisations' radio item for usage filter", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByText("Avec utilisations")).toBeInTheDocument();
	});

	it("renders 'Sans utilisation' radio item for usage filter", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByText("Sans utilisation")).toBeInTheDocument();
	});

	// ─── Filter badge count ───────────────────────────────────────────────────

	it("shows 0 active filters when no search params", () => {
		render(<DiscountsFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper.getAttribute("data-active-count")).toBe("0");
	});

	it("shows correct active filters count when filter params are present", () => {
		mockSearchParamsValue = new URLSearchParams("filter_type=PERCENTAGE&filter_isActive=true");
		render(<DiscountsFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper.getAttribute("data-active-count")).toBe("2");
	});

	it("renders separators between filter sections", () => {
		render(<DiscountsFilterSheet />);
		const separators = screen.getAllByTestId("separator");
		expect(separators.length).toBeGreaterThanOrEqual(2);
	});
});
