import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/shared/components/cursor-pagination", () => ({
	CursorPaginationSkeleton: () => <div data-testid="cursor-pagination-skeleton" />,
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}));

import { CollectionGridSkeleton } from "../collection-grid-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CollectionGridSkeleton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders without error", () => {
		const { container } = render(<CollectionGridSkeleton />);
		expect(container.firstChild).toBeInTheDocument();
	});

	it("renders 8 skeleton grid items", () => {
		render(<CollectionGridSkeleton />);
		// Each item has multiple skeletons; check the grid container children
		// 8 items, each with: image skeleton + 2 title lines + 1 count = 4 skeletons each = 32 total
		const skeletons = screen.getAllByTestId("skeleton");
		// 8 items * 4 skeletons each = 32
		expect(skeletons).toHaveLength(32);
	});

	it("renders the cursor pagination skeleton", () => {
		render(<CollectionGridSkeleton />);
		expect(screen.getByTestId("cursor-pagination-skeleton")).toBeInTheDocument();
	});
});
