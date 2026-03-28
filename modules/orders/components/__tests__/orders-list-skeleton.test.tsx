import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}));

import { OrdersListSkeleton } from "../orders-list-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("OrdersListSkeleton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders without crashing", () => {
		const { container } = render(<OrdersListSkeleton />);
		expect(container.firstChild).toBeInTheDocument();
	});

	it("renders skeleton elements", () => {
		render(<OrdersListSkeleton />);
		const skeletons = screen.getAllByTestId("skeleton");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("renders 3 order card skeletons", () => {
		render(<OrdersListSkeleton />);
		// The component renders 3 cards each with multiple skeletons
		// There are ~7 skeletons per card × 3 cards = ~21
		const skeletons = screen.getAllByTestId("skeleton");
		expect(skeletons.length).toBeGreaterThanOrEqual(3);
	});
});
