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

import { OrderCardSkeleton } from "../order-card-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("OrderCardSkeleton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders without crashing", () => {
		const { container } = render(<OrderCardSkeleton />);
		expect(container.firstChild).toBeInTheDocument();
	});

	it("renders skeleton elements", () => {
		render(<OrderCardSkeleton />);
		const skeletons = screen.getAllByTestId("skeleton");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("renders multiple skeletons for card sections", () => {
		render(<OrderCardSkeleton />);
		// Header: icon (1) + title (1) + subtitle (1) + badge (1)
		// Details: 4 label/value skeletons
		// Actions: 1 button skeleton
		// Total: at least 8
		const skeletons = screen.getAllByTestId("skeleton");
		expect(skeletons.length).toBeGreaterThanOrEqual(8);
	});
});
