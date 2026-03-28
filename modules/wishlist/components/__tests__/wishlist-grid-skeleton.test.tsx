import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/components/cursor-pagination", () => ({
	CursorPaginationSkeleton: () => <div data-testid="cursor-pagination-skeleton" />,
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { WishlistGridSkeleton } from "../wishlist-grid-skeleton";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("WishlistGridSkeleton", () => {
	it("renders the skeleton container", () => {
		const { container } = render(<WishlistGridSkeleton />);
		expect(container.firstChild).not.toBeNull();
	});

	it("renders 8 skeleton product cards", () => {
		render(<WishlistGridSkeleton />);
		const articles = document.querySelectorAll("article");
		expect(articles.length).toBe(8);
	});

	it("renders the header count skeleton", () => {
		render(<WishlistGridSkeleton />);
		const skeletons = screen.getAllByTestId("skeleton");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("renders the pagination skeleton", () => {
		render(<WishlistGridSkeleton />);
		expect(screen.getByTestId("cursor-pagination-skeleton")).toBeInTheDocument();
	});

	it("each product card has an image skeleton", () => {
		render(<WishlistGridSkeleton />);
		const articles = document.querySelectorAll("article");
		articles.forEach((article) => {
			const imgSkeleton = article.querySelector(".absolute.inset-0");
			expect(imgSkeleton).not.toBeNull();
		});
	});

	it("each product card has a wishlist button skeleton (rounded-full)", () => {
		render(<WishlistGridSkeleton />);
		const roundedFullSkeletons = screen
			.getAllByTestId("skeleton")
			.filter((s) => s.className?.includes("rounded-full"));
		// 8 cards × 3 color swatches + 8 wishlist buttons = at least 8 rounded-full skeletons
		expect(roundedFullSkeletons.length).toBeGreaterThanOrEqual(8);
	});

	it("articles have staggered animation delays", () => {
		render(<WishlistGridSkeleton />);
		const articles = document.querySelectorAll("article");
		const delays = Array.from(articles).map((a) => (a as HTMLElement).style.animationDelay);
		// First article has 0ms delay, second has 50ms, etc.
		expect(delays[0]).toBe("0ms");
		expect(delays[1]).toBe("50ms");
	});
});
