import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/discounts/constants/discount.constants", () => ({
	DISCOUNT_TYPE_LABELS: {
		PERCENTAGE: "Pourcentage",
		FIXED_AMOUNT: "Montant fixe",
	},
}));

vi.mock("@/app/generated/prisma/client", () => ({
	DiscountType: {
		PERCENTAGE: "PERCENTAGE",
		FIXED_AMOUNT: "FIXED_AMOUNT",
	},
}));

vi.mock("@/modules/discounts/services/discount-validation.service", () => ({
	getDiscountStatus: vi.fn(() => "active"),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (cents: number) => `${(cents / 100).toFixed(2)} €`,
}));

vi.mock("@/modules/discounts/components/admin/discount-row-actions", () => ({
	DiscountRowActions: ({ discount }: { discount: { code: string } }) => (
		<div data-testid={`row-actions-${discount.code}`}>Actions</div>
	),
}));

vi.mock("@/modules/discounts/components/admin/discounts-selection-toolbar", () => ({
	DiscountsSelectionToolbar: () => <div data-testid="selection-toolbar" />,
}));

vi.mock("@/modules/discounts/components/admin/create-discount-button", () => ({
	CreateDiscountButton: () => <button>Nouveau code</button>,
}));

vi.mock("@/shared/components/table-scroll-container", () => ({
	TableScrollContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="table-scroll-container">{children}</div>
	),
}));

vi.mock("@/shared/components/cursor-pagination", () => ({
	CursorPagination: () => <div data-testid="cursor-pagination" />,
}));

vi.mock("@/shared/components/data-table/table-empty-state", () => ({
	TableEmptyState: ({
		title,
		description,
	}: {
		title: string;
		description: string;
		icon?: unknown;
		actionElement?: React.ReactNode;
	}) => (
		<div data-testid="empty-state">
			<p>{title}</p>
			<p>{description}</p>
		</div>
	),
}));

vi.mock("@/shared/components/table-selection-cell", () => ({
	TableSelectionCell: ({ type }: { type: string; itemIds?: string[]; itemId?: string }) => (
		<div data-testid={`selection-cell-${type}`} />
	),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card" className={className}>
			{children}
		</div>
	),
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/table", () => ({
	Table: ({
		children,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		caption?: string;
		striped?: boolean;
		className?: string;
	}) => (
		<table data-testid="discounts-table" aria-label={ariaLabel}>
			{children}
		</table>
	),
	TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
	TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
	TableHead: ({ children }: { children: React.ReactNode; className?: string }) => (
		<th>{children}</th>
	),
	TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
	TableCell: ({ children }: { children: React.ReactNode; className?: string }) => (
		<td>{children}</td>
	),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
		<span data-testid="badge" data-variant={variant}>
			{children}
		</span>
	),
}));

vi.mock("lucide-react", () => ({
	Ticket: () => <svg data-testid="icon-ticket" />,
}));

import { DiscountsDataTable } from "../discounts-data-table";
import { getDiscountStatus } from "@/modules/discounts/services/discount-validation.service";

// ============================================================================
// HELPERS
// ============================================================================

function createDiscount(overrides: Record<string, unknown> = {}) {
	return {
		id: "d-1",
		code: "PROMO10",
		type: "PERCENTAGE" as const,
		value: 10,
		minOrderAmount: null,
		maxUsageCount: null,
		maxUsagePerUser: null,
		isActive: true,
		startsAt: new Date("2026-01-01"),
		endsAt: null,
		usageCount: 0,
		createdAt: new Date("2026-01-01"),
		_count: { usages: 0 },
		...overrides,
	};
}

function createPagination(overrides: Record<string, unknown> = {}) {
	return {
		hasNextPage: false,
		hasPreviousPage: false,
		nextCursor: null,
		prevCursor: null,
		...overrides,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("DiscountsDataTable", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getDiscountStatus).mockReturnValue("active");
	});

	// ─── Empty state ──────────────────────────────────────────────────────────

	it("renders empty state when no discounts", async () => {
		const promise = Promise.resolve({ discounts: [], pagination: createPagination() });
		render(await DiscountsDataTable({ discountsPromise: promise, perPage: 20 }));
		expect(screen.getByTestId("empty-state")).toBeInTheDocument();
	});

	it("shows empty state title 'Aucun code promo trouvé'", async () => {
		const promise = Promise.resolve({ discounts: [], pagination: createPagination() });
		render(await DiscountsDataTable({ discountsPromise: promise, perPage: 20 }));
		expect(screen.getByText("Aucun code promo trouvé")).toBeInTheDocument();
	});

	// ─── Table renders ────────────────────────────────────────────────────────

	it("renders table when discounts are present", async () => {
		const promise = Promise.resolve({
			discounts: [createDiscount()],
			pagination: createPagination(),
		});
		render(await DiscountsDataTable({ discountsPromise: promise, perPage: 20 }));
		expect(screen.getByTestId("discounts-table")).toBeInTheDocument();
	});

	it("shows discount code in table row", async () => {
		const promise = Promise.resolve({
			discounts: [createDiscount({ code: "SUMMER25" })],
			pagination: createPagination(),
		});
		render(await DiscountsDataTable({ discountsPromise: promise, perPage: 20 }));
		expect(screen.getByText("SUMMER25")).toBeInTheDocument();
	});

	it("shows discount type label", async () => {
		const promise = Promise.resolve({
			discounts: [createDiscount({ type: "PERCENTAGE" })],
			pagination: createPagination(),
		});
		render(await DiscountsDataTable({ discountsPromise: promise, perPage: 20 }));
		expect(screen.getByText("Pourcentage")).toBeInTheDocument();
	});

	it("formats percentage value with % symbol", async () => {
		const promise = Promise.resolve({
			discounts: [createDiscount({ type: "PERCENTAGE", value: 15 })],
			pagination: createPagination(),
		});
		render(await DiscountsDataTable({ discountsPromise: promise, perPage: 20 }));
		expect(screen.getByText("15%")).toBeInTheDocument();
	});

	it("shows status badge", async () => {
		vi.mocked(getDiscountStatus).mockReturnValue("active");
		const promise = Promise.resolve({
			discounts: [createDiscount()],
			pagination: createPagination(),
		});
		render(await DiscountsDataTable({ discountsPromise: promise, perPage: 20 }));
		expect(screen.getByTestId("badge")).toBeInTheDocument();
		expect(screen.getByText("Actif")).toBeInTheDocument();
	});

	it("renders cursor pagination", async () => {
		const promise = Promise.resolve({
			discounts: [createDiscount()],
			pagination: createPagination(),
		});
		render(await DiscountsDataTable({ discountsPromise: promise, perPage: 20 }));
		expect(screen.getByTestId("cursor-pagination")).toBeInTheDocument();
	});
});
