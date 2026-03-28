import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/shared/components/data-table", () => ({
	DataTableSkeleton: ({
		className,
		columns,
		pagination,
	}: {
		className?: string;
		columns: unknown[];
		pagination?: string;
	}) => (
		<div
			data-testid="data-table-skeleton"
			className={className}
			data-columns={columns.length}
			data-pagination={pagination}
		/>
	),
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}));

import { ProductTypesDataTableSkeleton } from "../product-types-data-table-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ProductTypesDataTableSkeleton", () => {
	it("renders without crashing", () => {
		render(<ProductTypesDataTableSkeleton />);
		expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
	});

	it("passes 6 columns to DataTableSkeleton", () => {
		render(<ProductTypesDataTableSkeleton />);
		expect(screen.getByTestId("data-table-skeleton")).toHaveAttribute("data-columns", "6");
	});

	it("uses offset pagination type", () => {
		render(<ProductTypesDataTableSkeleton />);
		expect(screen.getByTestId("data-table-skeleton")).toHaveAttribute("data-pagination", "offset");
	});

	it("applies hidden md:block className", () => {
		render(<ProductTypesDataTableSkeleton />);
		expect(screen.getByTestId("data-table-skeleton")).toHaveClass("hidden", "md:block");
	});
});
