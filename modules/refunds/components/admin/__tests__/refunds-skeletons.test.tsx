import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRefresh, mockIsPending } = vi.hoisted(() => ({
	mockRefresh: vi.fn(),
	mockIsPending: { value: false },
}));

vi.mock("@/shared/components/data-table", () => ({
	DataTableSkeleton: ({
		className,
		columns,
		pagination,
	}: {
		className?: string;
		columns?: unknown[];
		pagination?: string;
	}) => (
		<div
			data-testid="data-table-skeleton"
			className={className}
			data-pagination={pagination}
			data-columns={columns?.length}
		/>
	),
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}));

vi.mock("@/modules/refunds/hooks/use-refresh-refunds", () => ({
	useRefreshRefunds: () => ({
		refresh: mockRefresh,
		isPending: mockIsPending.value,
	}),
}));

vi.mock("@/shared/components/refresh-button", () => ({
	RefreshButton: ({
		onRefresh,
		isPending,
		label,
		className,
		variant,
		hideOnMobile,
	}: {
		onRefresh: () => void;
		isPending: boolean;
		label: string;
		className?: string;
		variant?: string;
		hideOnMobile?: boolean;
	}) => (
		<button
			data-testid="refresh-button"
			data-label={label}
			data-variant={variant}
			data-hide-on-mobile={String(hideOnMobile)}
			data-is-pending={String(isPending)}
			onClick={onRefresh}
			className={className}
		>
			{label}
		</button>
	),
}));

import { RefundsDataTableSkeleton } from "../refunds-data-table-skeleton";
import { RefreshRefundsButton } from "../refresh-refunds-button";

afterEach(() => {
	cleanup();
	mockIsPending.value = false;
	mockRefresh.mockReset();
});

// ============================================================================
// RefundsDataTableSkeleton
// ============================================================================

describe("RefundsDataTableSkeleton", () => {
	it("renders a DataTableSkeleton", () => {
		render(<RefundsDataTableSkeleton />);
		expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
	});

	// La table réelle est en pagination curseur : le skeleton annonçait `offset`,
	// donc des placeholders de barre offset remplacés par une barre curseur.
	it("uses cursor pagination like the real table", () => {
		render(<RefundsDataTableSkeleton />);
		expect(screen.getByTestId("data-table-skeleton")).toHaveAttribute("data-pagination", "cursor");
	});

	it("passes the expected number of column definitions", () => {
		render(<RefundsDataTableSkeleton />);
		// 6 colonnes — la colonne Actions est partie avec le workflow (Lot 2 S3.3).
		expect(screen.getByTestId("data-table-skeleton")).toHaveAttribute("data-columns", "6");
	});
});

// ============================================================================
// RefreshRefundsButton
// ============================================================================

describe("RefreshRefundsButton", () => {
	it("renders RefreshButton with the correct label", () => {
		render(<RefreshRefundsButton />);
		expect(screen.getByTestId("refresh-button")).toHaveAttribute(
			"data-label",
			"Rafraîchir remboursements",
		);
	});

	it("passes the refresh function from the hook as onRefresh", () => {
		render(<RefreshRefundsButton />);
		screen.getByTestId("refresh-button").click();
		expect(mockRefresh).toHaveBeenCalledOnce();
	});

	it("passes isPending from the hook", () => {
		mockIsPending.value = true;
		render(<RefreshRefundsButton />);
		expect(screen.getByTestId("refresh-button")).toHaveAttribute("data-is-pending", "true");
	});

	it("uses 'outline' as the default variant", () => {
		render(<RefreshRefundsButton />);
		expect(screen.getByTestId("refresh-button")).toHaveAttribute("data-variant", "outline");
	});

	it("accepts a custom variant prop", () => {
		render(<RefreshRefundsButton variant="ghost" />);
		expect(screen.getByTestId("refresh-button")).toHaveAttribute("data-variant", "ghost");
	});

	it("does not hide on mobile", () => {
		render(<RefreshRefundsButton />);
		expect(screen.getByTestId("refresh-button")).toHaveAttribute("data-hide-on-mobile", "false");
	});

	it("forwards the className prop to the button", () => {
		render(<RefreshRefundsButton className="my-custom-class" />);
		expect(screen.getByTestId("refresh-button")).toHaveClass("my-custom-class");
	});
});
