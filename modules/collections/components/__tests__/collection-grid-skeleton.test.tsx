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
		// Each item mirrors CollectionCard: image + divider + 2 title lines + price + count
		// = 6 skeletons each. 8 items * 6 = 48 total.
		const skeletons = screen.getAllByTestId("skeleton");
		expect(skeletons).toHaveLength(48);
	});

	it("renders the cursor pagination skeleton", () => {
		render(<CollectionGridSkeleton />);
		expect(screen.getByTestId("cursor-pagination-skeleton")).toBeInTheDocument();
	});
});
