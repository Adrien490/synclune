import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { CursorPaginationSkeleton } from "../cursor-pagination-skeleton";
import { RESET_BUTTON_SIZE, NAV_BUTTON_SIZE, PAGE_INDICATOR_SIZE } from "../constants";

// ============================================================================
// TESTS
// ============================================================================

describe("CursorPaginationSkeleton", () => {
	afterEach(cleanup);

	it("renders with role='status' and aria-label", () => {
		render(<CursorPaginationSkeleton />);
		expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Chargement de la pagination");
	});

	it("renders navigation skeletons by default", () => {
		render(<CursorPaginationSkeleton />);
		const skeletons = screen.getAllByTestId("skeleton");
		// Info section (3) + navigation section (reset + prev + indicator + next = 4) = 7
		expect(skeletons.length).toBe(7);
	});

	it("hides navigation skeletons when showNavigation is false", () => {
		render(<CursorPaginationSkeleton showNavigation={false} />);
		const skeletons = screen.getAllByTestId("skeleton");
		// Only info section: 3 skeletons
		expect(skeletons.length).toBe(3);
	});

	it("uses correct size constants for navigation buttons", () => {
		render(<CursorPaginationSkeleton />);
		const skeletons = screen.getAllByTestId("skeleton");
		const classNames = skeletons.map((s) => s.className);

		// Reset button skeleton uses RESET_BUTTON_SIZE
		expect(classNames.some((c) => c.includes(RESET_BUTTON_SIZE))).toBe(true);
		// Nav button skeletons use NAV_BUTTON_SIZE
		expect(classNames.filter((c) => c.includes(NAV_BUTTON_SIZE)).length).toBe(2);
		// Page indicator skeleton uses PAGE_INDICATOR_SIZE
		expect(classNames.some((c) => c.includes(PAGE_INDICATOR_SIZE))).toBe(true);
	});
});
