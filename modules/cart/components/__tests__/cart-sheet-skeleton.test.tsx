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

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CartSheetSkeleton } from "../cart-sheet-skeleton";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("CartSheetSkeleton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders a status region with aria-busy=true", () => {
		render(<CartSheetSkeleton />);
		const status = screen.getByRole("status");
		expect(status).toHaveAttribute("aria-busy", "true");
	});

	it("renders accessible label 'Chargement du panier'", () => {
		render(<CartSheetSkeleton />);
		const status = screen.getByRole("status");
		expect(status).toHaveAttribute("aria-label", "Chargement du panier");
	});

	it("renders exactly 3 skeleton item rows", () => {
		const { container } = render(<CartSheetSkeleton />);
		// Each item row has a grid with class containing "grid-cols"
		const rows = container.querySelectorAll(".grid.grid-cols-\\[5rem_1fr\\]");
		expect(rows).toHaveLength(3);
	});

	it("renders skeleton elements inside each row", () => {
		render(<CartSheetSkeleton />);
		const skeletons = screen.getAllByTestId("skeleton");
		// 3 rows × (1 image + 3 content + 2 action) = 3 rows × 6 = 18 skeletons
		expect(skeletons.length).toBeGreaterThanOrEqual(3);
	});
});
