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

import { ColorsDataTableSkeleton } from "../colors-data-table-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ColorsDataTableSkeleton", () => {
	it("renders without crashing", () => {
		render(<ColorsDataTableSkeleton />);
		expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
	});

	it("passes 6 columns to DataTableSkeleton", () => {
		render(<ColorsDataTableSkeleton />);
		expect(screen.getByTestId("data-table-skeleton")).toHaveAttribute("data-columns", "6");
	});

	it("uses cursor pagination type", () => {
		render(<ColorsDataTableSkeleton />);
		expect(screen.getByTestId("data-table-skeleton")).toHaveAttribute("data-pagination", "cursor");
	});

	it("applies hidden md:block className", () => {
		render(<ColorsDataTableSkeleton />);
		expect(screen.getByTestId("data-table-skeleton")).toHaveClass("hidden", "md:block");
	});
});
