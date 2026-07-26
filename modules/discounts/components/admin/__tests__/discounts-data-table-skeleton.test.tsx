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

import { DiscountsDataTableSkeleton } from "../discounts-data-table-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("DiscountsDataTableSkeleton", () => {
	it("renders without crashing", () => {
		render(<DiscountsDataTableSkeleton />);
		expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
	});

	// 6 = nombre de colonnes de `discounts-data-table.tsx` (le skeleton en
	// déclarait 8 : une colonne `checkbox` fantôme + une colonne en trop).
	it("passes 6 columns to DataTableSkeleton (parité avec la table réelle)", () => {
		render(<DiscountsDataTableSkeleton />);
		expect(screen.getByTestId("data-table-skeleton")).toHaveAttribute("data-columns", "6");
	});

	it("uses cursor pagination type", () => {
		render(<DiscountsDataTableSkeleton />);
		expect(screen.getByTestId("data-table-skeleton")).toHaveAttribute("data-pagination", "cursor");
	});

	it("applies hidden md:block className", () => {
		render(<DiscountsDataTableSkeleton />);
		expect(screen.getByTestId("data-table-skeleton")).toHaveClass("hidden", "md:block");
	});
});
