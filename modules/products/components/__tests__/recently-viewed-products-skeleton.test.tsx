import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RecentlyViewedProductsSkeleton } from "../recently-viewed-products-skeleton";

afterEach(cleanup);

describe("RecentlyViewedProductsSkeleton", () => {
	it("renders without crashing", () => {
		const { container } = render(<RecentlyViewedProductsSkeleton />);
		expect(container.firstChild).not.toBeNull();
	});

	it("renders an aside with the correct aria-label", () => {
		render(<RecentlyViewedProductsSkeleton />);
		const aside = screen.getByRole("complementary");
		expect(aside).toHaveAttribute("aria-label", "Chargement des produits recemment vus");
	});

	it("renders the default number of product card skeletons (4)", () => {
		const { container } = render(<RecentlyViewedProductsSkeleton />);
		const cards = container.querySelectorAll(".product-card-skeleton");
		expect(cards).toHaveLength(4);
	});

	it("renders the correct number of product card skeletons when limit is provided", () => {
		const { container } = render(<RecentlyViewedProductsSkeleton limit={6} />);
		const cards = container.querySelectorAll(".product-card-skeleton");
		expect(cards).toHaveLength(6);
	});

	it("renders 1 product card skeleton when limit is 1", () => {
		const { container } = render(<RecentlyViewedProductsSkeleton limit={1} />);
		const cards = container.querySelectorAll(".product-card-skeleton");
		expect(cards).toHaveLength(1);
	});

	it("renders the header skeleton", () => {
		const { container } = render(<RecentlyViewedProductsSkeleton />);
		const headerDiv = container.querySelector(".space-y-6 > .space-y-2");
		expect(headerDiv).not.toBeNull();
		// Should have 1 skeleton for the title
		expect(headerDiv?.children).toHaveLength(1);
	});

	it("renders a grid container for the product cards", () => {
		const { container } = render(<RecentlyViewedProductsSkeleton />);
		const grid = container.querySelector(".grid");
		expect(grid).not.toBeNull();
	});

	it("renders skeleton content inside each product card", () => {
		const { container } = render(<RecentlyViewedProductsSkeleton limit={2} />);
		const cards = container.querySelectorAll(".product-card-skeleton");
		// Each card has an image and content area
		cards.forEach((card) => {
			// Image skeleton — ratio 4/5 aligné sur product-card.tsx (parité CLS)
			const imageDiv = card.querySelector(".bg-muted.aspect-4\\/5");
			expect(imageDiv).not.toBeNull();
			// Content area
			const contentDiv = card.querySelector(".flex.flex-col");
			expect(contentDiv).not.toBeNull();
		});
	});
});
