import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}));

import { ReviewableProductCardSkeleton } from "../reviewable-product-card-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewableProductCardSkeleton", () => {
	it("renders without error", () => {
		render(<ReviewableProductCardSkeleton />);
		expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
	});

	it("renders multiple skeleton elements", () => {
		render(<ReviewableProductCardSkeleton />);
		expect(screen.getAllByTestId("skeleton").length).toBeGreaterThanOrEqual(3);
	});
});
