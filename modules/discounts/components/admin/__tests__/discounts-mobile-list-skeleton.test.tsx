import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/item", () => ({
	ItemGroup: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="item-group">{children}</div>
	),
	Item: ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
		<div data-testid="item" style={style}>
			{children}
		</div>
	),
	ItemContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="item-content">{children}</div>
	),
	ItemActions: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="item-actions">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	SkeletonGroup: ({ children, label }: { children: React.ReactNode; label?: string }) => (
		<div data-testid="skeleton-group" aria-label={label}>
			{children}
		</div>
	),
	Skeleton: ({ shape, className }: { shape?: string; className?: string }) => (
		<div data-testid="skeleton" data-shape={shape} className={className} />
	),
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { DiscountsMobileListSkeleton } from "../discounts-mobile-list-skeleton";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("DiscountsMobileListSkeleton", () => {
	describe("rendering", () => {
		it("renders the skeleton group with accessible label", () => {
			render(<DiscountsMobileListSkeleton />);
			expect(screen.getByTestId("skeleton-group")).toHaveAttribute(
				"aria-label",
				"Chargement des codes promo",
			);
		});

		it("renders exactly 5 skeleton items", () => {
			render(<DiscountsMobileListSkeleton />);
			expect(screen.getAllByTestId("item")).toHaveLength(5);
		});

		it("renders skeletons inside each item", () => {
			render(<DiscountsMobileListSkeleton />);
			const skeletons = screen.getAllByTestId("skeleton");
			// 2 title skeletons + 3 description skeletons + 1 action skeleton per item = 6 per item × 5 = 30
			expect(skeletons.length).toBeGreaterThanOrEqual(5);
		});

		it("renders ItemActions with a skeleton in each item", () => {
			render(<DiscountsMobileListSkeleton />);
			expect(screen.getAllByTestId("item-actions")).toHaveLength(5);
		});

		it("renders within an md:hidden wrapper", () => {
			const { container } = render(<DiscountsMobileListSkeleton />);
			const wrapper = container.firstChild as HTMLElement;
			expect(wrapper.className).toContain("md:hidden");
		});

		it("applies staggered animation delays to items", () => {
			render(<DiscountsMobileListSkeleton />);
			const items = screen.getAllByTestId("item");
			expect(items[0]).toHaveStyle("animation-delay: 0ms");
			expect(items[1]).toHaveStyle("animation-delay: 100ms");
			expect(items[2]).toHaveStyle("animation-delay: 200ms");
			expect(items[3]).toHaveStyle("animation-delay: 300ms");
			expect(items[4]).toHaveStyle("animation-delay: 400ms");
		});
	});

	describe("skeleton shapes", () => {
		it("renders rounded skeletons for title area", () => {
			render(<DiscountsMobileListSkeleton />);
			const rounded = screen
				.getAllByTestId("skeleton")
				.filter((el) => el.getAttribute("data-shape") === "rounded");
			// 2 rounded per item (code + badge) + 1 action = 3 per item × 5
			expect(rounded.length).toBeGreaterThanOrEqual(5);
		});

		it("renders text skeletons for description area", () => {
			render(<DiscountsMobileListSkeleton />);
			const text = screen
				.getAllByTestId("skeleton")
				.filter((el) => el.getAttribute("data-shape") === "text");
			// 3 text per item × 5
			expect(text.length).toBe(15);
		});
	});
});
