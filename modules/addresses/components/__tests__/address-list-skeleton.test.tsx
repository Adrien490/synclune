import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
	SkeletonGroup: ({
		children,
		label,
		className,
	}: {
		children: React.ReactNode;
		label?: string;
		className?: string;
	}) => (
		<div aria-label={label} className={className} data-testid="skeleton-group">
			{children}
		</div>
	),
}));

// ============================================================================
// IMPORTS AFTER MOCKS
// ============================================================================

import { AddressListSkeleton } from "../address-list-skeleton";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("AddressListSkeleton", () => {
	it("renders without crashing", () => {
		expect(() => render(<AddressListSkeleton />)).not.toThrow();
	});

	it("renders SkeletonGroup with loading label", () => {
		render(<AddressListSkeleton />);
		expect(screen.getByTestId("skeleton-group")).toBeInTheDocument();
		expect(screen.getByTestId("skeleton-group")).toHaveAttribute(
			"aria-label",
			"Chargement des adresses",
		);
	});

	it("renders 3 skeleton card groups", () => {
		const { container } = render(<AddressListSkeleton />);
		const grid = container.querySelector(".grid");
		expect(grid).toBeInTheDocument();
		// 3 card wrappers
		const cards = grid!.children;
		expect(cards.length).toBe(3);
	});

	it("renders multiple skeleton items inside each card", () => {
		render(<AddressListSkeleton />);
		const skeletons = screen.getAllByTestId("skeleton");
		// Each of the 3 cards has multiple skeletons (header + address lines + phone)
		expect(skeletons.length).toBeGreaterThanOrEqual(12);
	});

	it("has a grid layout container", () => {
		const { container } = render(<AddressListSkeleton />);
		const grid = container.querySelector(".grid");
		expect(grid).toBeInTheDocument();
	});
});
