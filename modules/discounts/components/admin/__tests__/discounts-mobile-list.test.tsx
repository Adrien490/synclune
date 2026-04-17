import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockGetDiscountStatus } = vi.hoisted(() => ({
	mockGetDiscountStatus: vi.fn<() => "active" | "inactive" | "scheduled" | "expired" | "exhausted">(
		() => "active",
	),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/discounts/services/discount-validation.service", () => ({
	getDiscountStatus: mockGetDiscountStatus,
}));

vi.mock("@/modules/discounts/constants/discount.constants", () => ({
	DISCOUNT_TYPE_LABELS: {
		PERCENTAGE: "Pourcentage",
		FIXED_AMOUNT: "Montant fixe",
	},
	DISCOUNT_TYPE_ICONS: {
		PERCENTAGE: "%",
		FIXED_AMOUNT: "€",
	},
}));

vi.mock("@/app/generated/prisma/client", () => ({
	DiscountType: {
		PERCENTAGE: "PERCENTAGE",
		FIXED_AMOUNT: "FIXED_AMOUNT",
	},
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (value: number) => `${value} €`,
}));

vi.mock("@/shared/components/cursor-pagination", () => ({
	CursorPagination: ({
		hasNextPage,
		hasPreviousPage,
	}: {
		perPage: number;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
		currentPageSize: number;
		nextCursor?: string | null;
		prevCursor?: string | null;
	}) => (
		<div
			data-testid="cursor-pagination"
			data-has-next={hasNextPage}
			data-has-prev={hasPreviousPage}
		/>
	),
}));

vi.mock("@/shared/components/data-table/table-empty-state", () => ({
	TableEmptyState: ({
		title,
		description,
		actionElement,
	}: {
		icon?: React.ElementType;
		title: string;
		description: string;
		actionElement?: React.ReactNode;
	}) => (
		<div data-testid="table-empty-state">
			<span>{title}</span>
			<span>{description}</span>
			{actionElement}
		</div>
	),
}));

vi.mock("@/shared/components/ui/item", () => ({
	ItemGroup: ({
		children,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		className?: string;
	}) => (
		<div data-testid="item-group" aria-label={ariaLabel}>
			{children}
		</div>
	),
	Item: ({
		children,
		"aria-roledescription": ariaRoleDescription,
	}: {
		children: React.ReactNode;
		variant?: string;
		size?: string;
		className?: string;
		"aria-roledescription"?: string;
	}) => (
		<div data-testid="item" aria-roledescription={ariaRoleDescription}>
			{children}
		</div>
	),
	ItemContent: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="item-content">{children}</div>
	),
	ItemTitle: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="item-title">{children}</div>
	),
	ItemDescription: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="item-description">{children}</div>
	),
	ItemActions: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="item-actions">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
		<span data-testid="badge" data-variant={variant}>
			{children}
		</span>
	),
}));

vi.mock("../discounts-selection-toolbar", () => ({
	DiscountsSelectionToolbar: ({
		discountIds,
	}: {
		discountIds: string[];
		discounts: { id: string; code: string; usageCount: number }[];
	}) => <div data-testid="selection-toolbar" data-count={discountIds.length} />,
}));

vi.mock("../discount-row-actions", () => ({
	DiscountRowActions: ({ discount }: { discount: { id: string; code: string } }) => (
		<div data-testid="discount-row-actions" data-id={discount.id} />
	),
}));

vi.mock("@/shared/components/selectable-mobile-card", () => ({
	SelectableMobileCard: ({
		ariaLabel,
		onOpen,
		children,
	}: {
		ariaLabel: string;
		onOpen?: () => void;
		children: React.ReactNode;
	}) => (
		<button type="button" aria-label={ariaLabel} onClick={onOpen}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({
		isOpen: false,
		data: null,
		open: vi.fn(),
		close: vi.fn(),
	}),
}));

vi.mock("../create-discount-button", () => ({
	CreateDiscountButton: () => <button data-testid="create-discount-button">Créer</button>,
}));

vi.mock("lucide-react", () => ({
	Ticket: () => <svg data-testid="icon-ticket" />,
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { DiscountsMobileList } from "../discounts-mobile-list";
import type { GetDiscountsReturn } from "@/modules/discounts/data/get-discounts";

// ============================================================================
// HELPERS
// ============================================================================

type DiscountShape = {
	id: string;
	code: string;
	type: "PERCENTAGE" | "FIXED_AMOUNT";
	value: number;
	minOrderAmount: null;
	maxUsageCount: number | null;
	maxUsagePerUser: null;
	isActive: boolean;
	startsAt: Date;
	endsAt: null;
	usageCount: number;
	createdAt: Date;
	_count: { usages: number };
};

function createDiscount(overrides: Partial<DiscountShape> = {}): DiscountShape {
	return {
		id: "d-1",
		code: "PROMO10",
		type: "PERCENTAGE",
		value: 10,
		minOrderAmount: null,
		maxUsageCount: 100,
		maxUsagePerUser: null,
		isActive: true,
		startsAt: new Date("2026-01-01T00:00:00Z"),
		endsAt: null,
		usageCount: 5,
		createdAt: new Date("2026-01-01T00:00:00Z"),
		_count: { usages: 5 },
		...overrides,
	};
}

function createReturn(
	discounts: DiscountShape[],
	paginationOverrides: Partial<GetDiscountsReturn["pagination"]> = {},
): GetDiscountsReturn {
	return {
		discounts: discounts as unknown as GetDiscountsReturn["discounts"],
		pagination: {
			hasNextPage: false,
			hasPreviousPage: false,
			nextCursor: null,
			prevCursor: null,
			...paginationOverrides,
		},
	};
}

/**
 * Renders DiscountsMobileList wrapped in React.Suspense and flushes the promise
 * via `act` so that the component resolves synchronously in tests.
 * DiscountsMobileList uses React.use() to unwrap its promise prop.
 */
async function renderWithSuspense(data: GetDiscountsReturn, perPage = 20) {
	const promise = Promise.resolve(data);
	let result!: ReturnType<typeof render>;
	await act(async () => {
		result = render(
			<React.Suspense fallback={<div data-testid="suspense-fallback" />}>
				<DiscountsMobileList discountsPromise={promise} perPage={perPage} />
			</React.Suspense>,
		);
	});
	return result;
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("DiscountsMobileList", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetDiscountStatus.mockReturnValue("active");
	});

	// ─── Empty state ──────────────────────────────────────────────────────────

	describe("empty state", () => {
		it("renders TableEmptyState when discounts array is empty", async () => {
			await renderWithSuspense(createReturn([]));
			expect(screen.getByTestId("table-empty-state")).toBeInTheDocument();
		});

		it("shows the correct empty state title", async () => {
			await renderWithSuspense(createReturn([]));
			expect(screen.getByText("Aucun code promo trouvé")).toBeInTheDocument();
		});

		it("shows the correct empty state description", async () => {
			await renderWithSuspense(createReturn([]));
			expect(
				screen.getByText("Aucun code promo ne correspond aux critères de recherche."),
			).toBeInTheDocument();
		});

		it("renders CreateDiscountButton inside empty state", async () => {
			await renderWithSuspense(createReturn([]));
			expect(screen.getByTestId("create-discount-button")).toBeInTheDocument();
		});

		it("empty state container has md:hidden class", async () => {
			const { container } = await renderWithSuspense(createReturn([]));
			expect(container.querySelector(".md\\:hidden")).toBeInTheDocument();
		});

		it("does not render the item list when empty", async () => {
			await renderWithSuspense(createReturn([]));
			expect(screen.queryByTestId("item-group")).not.toBeInTheDocument();
		});
	});

	// ─── List rendering ───────────────────────────────────────────────────────

	describe("list rendering", () => {
		it("renders the selection toolbar", async () => {
			await renderWithSuspense(
				createReturn([createDiscount(), createDiscount({ id: "d-2", code: "ETE25" })]),
			);
			expect(screen.getByTestId("selection-toolbar")).toBeInTheDocument();
		});

		it("passes correct discount count to selection toolbar", async () => {
			await renderWithSuspense(
				createReturn([createDiscount(), createDiscount({ id: "d-2", code: "ETE25" })]),
			);
			expect(screen.getByTestId("selection-toolbar")).toHaveAttribute("data-count", "2");
		});

		it("renders ItemGroup with aria-label 'Codes promo'", async () => {
			await renderWithSuspense(createReturn([createDiscount()]));
			expect(screen.getByTestId("item-group")).toHaveAttribute("aria-label", "Codes promo");
		});

		it("renders one Item per discount", async () => {
			await renderWithSuspense(
				createReturn([
					createDiscount(),
					createDiscount({ id: "d-2", code: "ETE25" }),
					createDiscount({ id: "d-3", code: "NOEL50" }),
				]),
			);
			expect(screen.getAllByTestId("item")).toHaveLength(3);
		});

		it("renders Item with aria-roledescription 'carte code promo'", async () => {
			await renderWithSuspense(createReturn([createDiscount()]));
			expect(screen.getByTestId("item")).toHaveAttribute(
				"aria-roledescription",
				"carte code promo",
			);
		});

		it("renders the discount code", async () => {
			await renderWithSuspense(createReturn([createDiscount({ code: "PROMO10" })]));
			expect(screen.getByText("PROMO10")).toBeInTheDocument();
		});

		it("renders DiscountRowActions for each discount", async () => {
			await renderWithSuspense(
				createReturn([createDiscount(), createDiscount({ id: "d-2", code: "ETE25" })]),
			);
			expect(screen.getAllByTestId("discount-row-actions")).toHaveLength(2);
		});

		it("renders CursorPagination", async () => {
			await renderWithSuspense(createReturn([createDiscount()]));
			expect(screen.getByTestId("cursor-pagination")).toBeInTheDocument();
		});

		it("passes hasNextPage=true to CursorPagination", async () => {
			await renderWithSuspense(createReturn([createDiscount()], { hasNextPage: true }));
			expect(screen.getByTestId("cursor-pagination")).toHaveAttribute("data-has-next", "true");
		});

		it("passes hasPreviousPage=true to CursorPagination", async () => {
			await renderWithSuspense(createReturn([createDiscount()], { hasPreviousPage: true }));
			expect(screen.getByTestId("cursor-pagination")).toHaveAttribute("data-has-prev", "true");
		});

		it("non-empty list wrapper has md:hidden class", async () => {
			const { container } = await renderWithSuspense(createReturn([createDiscount()]));
			expect(container.querySelector(".md\\:hidden")).toBeInTheDocument();
		});
	});

	// ─── Status badge ─────────────────────────────────────────────────────────

	describe("status badge", () => {
		it("renders 'Actif' badge with success variant", async () => {
			mockGetDiscountStatus.mockReturnValue("active");
			await renderWithSuspense(createReturn([createDiscount()]));
			const badge = screen.getByTestId("badge");
			expect(badge).toHaveTextContent("Actif");
			expect(badge).toHaveAttribute("data-variant", "success");
		});

		it("renders 'Inactif' badge with secondary variant", async () => {
			mockGetDiscountStatus.mockReturnValue("inactive");
			await renderWithSuspense(createReturn([createDiscount()]));
			const badge = screen.getByTestId("badge");
			expect(badge).toHaveTextContent("Inactif");
			expect(badge).toHaveAttribute("data-variant", "secondary");
		});

		it("renders 'Planifié' badge with outline variant", async () => {
			mockGetDiscountStatus.mockReturnValue("scheduled");
			await renderWithSuspense(createReturn([createDiscount()]));
			const badge = screen.getByTestId("badge");
			expect(badge).toHaveTextContent("Planifié");
			expect(badge).toHaveAttribute("data-variant", "outline");
		});

		it("renders 'Expiré' badge", async () => {
			mockGetDiscountStatus.mockReturnValue("expired");
			await renderWithSuspense(createReturn([createDiscount()]));
			expect(screen.getByText("Expiré")).toBeInTheDocument();
		});

		it("renders 'Épuisé' badge", async () => {
			mockGetDiscountStatus.mockReturnValue("exhausted");
			await renderWithSuspense(createReturn([createDiscount()]));
			expect(screen.getByText("Épuisé")).toBeInTheDocument();
		});
	});

	// ─── Value formatting ─────────────────────────────────────────────────────

	describe("value formatting", () => {
		it("formats PERCENTAGE type as percentage string", async () => {
			await renderWithSuspense(createReturn([createDiscount({ type: "PERCENTAGE", value: 10 })]));
			expect(screen.getByText("10%")).toBeInTheDocument();
		});

		it("formats FIXED_AMOUNT type via formatEuro", async () => {
			await renderWithSuspense(createReturn([createDiscount({ type: "FIXED_AMOUNT", value: 15 })]));
			expect(screen.getByText("15 €")).toBeInTheDocument();
		});
	});

	// ─── Usage formatting ─────────────────────────────────────────────────────

	describe("usage formatting", () => {
		it("displays 'usageCount / maxUsageCount' when maxUsageCount is set", async () => {
			await renderWithSuspense(
				createReturn([createDiscount({ usageCount: 3, maxUsageCount: 50 })]),
			);
			expect(screen.getByText("3 / 50")).toBeInTheDocument();
		});

		it("displays 'usageCount / ∞' when maxUsageCount is null", async () => {
			await renderWithSuspense(
				createReturn([createDiscount({ usageCount: 7, maxUsageCount: null })]),
			);
			expect(screen.getByText("7 / ∞")).toBeInTheDocument();
		});
	});

	// ─── Type labels ──────────────────────────────────────────────────────────

	describe("type labels", () => {
		it("shows 'Pourcentage' label for PERCENTAGE type", async () => {
			await renderWithSuspense(createReturn([createDiscount({ type: "PERCENTAGE" })]));
			expect(screen.getByText(/Pourcentage/)).toBeInTheDocument();
		});

		it("shows 'Montant fixe' label for FIXED_AMOUNT type", async () => {
			await renderWithSuspense(createReturn([createDiscount({ type: "FIXED_AMOUNT", value: 5 })]));
			expect(screen.getByText(/Montant fixe/)).toBeInTheDocument();
		});
	});
});
