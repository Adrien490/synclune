import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/components/data-table", () => ({
	DataTableSkeleton: ({
		className,
		columns,
	}: {
		className?: string;
		columns: unknown[];
		pagination?: string;
	}) => (
		<div data-testid="data-table-skeleton" className={className} data-columns={columns.length} />
	),
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}));

import { OrdersDataTableSkeleton } from "../orders-data-table-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("OrdersDataTableSkeleton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders without crashing", () => {
		render(<OrdersDataTableSkeleton />);
		expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
	});

	it("applies hidden md:block class for responsive display", () => {
		render(<OrdersDataTableSkeleton />);
		expect(screen.getByTestId("data-table-skeleton")).toHaveClass("hidden", "md:block");
	});

	it("passes 8 columns to DataTableSkeleton", () => {
		render(<OrdersDataTableSkeleton />);
		expect(screen.getByTestId("data-table-skeleton")).toHaveAttribute("data-columns", "8");
	});
});
