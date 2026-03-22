import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/components/data-table", () => ({
	DataTableSkeleton: ({ className }: { className?: string }) => (
		<div data-testid="data-table-skeleton" className={className} />
	),
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { SkusDataTableSkeleton } from "../skus-data-table-skeleton";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("SkusDataTableSkeleton", () => {
	it("renders the DataTableSkeleton", () => {
		render(<SkusDataTableSkeleton />);

		expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
	});

	it("applies hidden md:block className to DataTableSkeleton", () => {
		render(<SkusDataTableSkeleton />);

		expect(screen.getByTestId("data-table-skeleton")).toHaveClass("hidden", "md:block");
	});
});
