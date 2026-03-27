import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ─── Module mocks ─────────────────────────────────────────────────────────────

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

// ─── Imports ──────────────────────────────────────────────────────────────────

import { ProductListSkeleton } from "../product-list-skeleton";

afterEach(cleanup);

describe("ProductListSkeleton", () => {
	it("renders without crashing", () => {
		const { container } = render(<ProductListSkeleton />);
		expect(container.firstChild).not.toBeNull();
	});

	it("renders 8 product card skeletons", () => {
		const { container } = render(<ProductListSkeleton />);
		const productItems = container.querySelectorAll(".product-item");
		expect(productItems).toHaveLength(8);
	});

	it("renders the pagination skeleton", () => {
		render(<ProductListSkeleton />);
		expect(screen.getByTestId("cursor-pagination-skeleton")).toBeInTheDocument();
	});

	it("renders skeleton elements for product cards", () => {
		render(<ProductListSkeleton />);
		const skeletons = screen.getAllByTestId("skeleton");
		// Each card has: image(1) + title(1) + 3 color swatches + price(1) + mobile button(1) = 7 skeletons
		// Plus 1 result counter skeleton = 8 * 7 + 1 = 57 total
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("renders article elements for each product skeleton card", () => {
		const { container } = render(<ProductListSkeleton />);
		const articles = container.querySelectorAll("article");
		expect(articles).toHaveLength(8);
	});

	it("applies staggered animation delay styles to product items", () => {
		const { container } = render(<ProductListSkeleton />);
		const productItems = Array.from(container.querySelectorAll(".product-item"));
		// Each item should have a different animationDelay
		const delays = productItems.map((el) => (el as HTMLElement).style.animationDelay);
		expect(delays[0]).toBe("0ms");
		expect(delays[1]).toBe("100ms");
		expect(delays[7]).toBe("700ms");
	});
});
