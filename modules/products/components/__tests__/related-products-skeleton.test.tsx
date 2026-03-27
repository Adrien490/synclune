import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RelatedProductsSkeleton } from "../related-products-skeleton";

afterEach(cleanup);

describe("RelatedProductsSkeleton", () => {
	it("renders without crashing", () => {
		const { container } = render(<RelatedProductsSkeleton />);
		expect(container.firstChild).not.toBeNull();
	});

	it("renders an aside with the correct aria-label", () => {
		render(<RelatedProductsSkeleton />);
		const aside = screen.getByRole("complementary");
		expect(aside).toHaveAttribute("aria-label", "Chargement des produits similaires");
	});

	it("renders the default number of product card skeletons (8)", () => {
		const { container } = render(<RelatedProductsSkeleton />);
		const cards = container.querySelectorAll(".product-card-skeleton");
		expect(cards).toHaveLength(8);
	});

	it("renders the correct number of product card skeletons when limit is provided", () => {
		const { container } = render(<RelatedProductsSkeleton limit={4} />);
		const cards = container.querySelectorAll(".product-card-skeleton");
		expect(cards).toHaveLength(4);
	});

	it("renders the header title skeleton", () => {
		const { container } = render(<RelatedProductsSkeleton />);
		const headerDiv = container.querySelector(".space-y-6 > .space-y-2");
		expect(headerDiv).not.toBeNull();
		// Should have 1 skeleton for the h2
		expect(headerDiv?.children).toHaveLength(1);
	});

	it("renders the CTA skeleton at the bottom", () => {
		const { container } = render(<RelatedProductsSkeleton />);
		const ctaDiv = container.querySelector(".flex.justify-center.pt-4");
		expect(ctaDiv).not.toBeNull();
		// CTA contains one skeleton element
		expect(ctaDiv?.children).toHaveLength(1);
	});

	it("renders dots skeleton on mobile with default limit (min 5 dots)", () => {
		const { container } = render(<RelatedProductsSkeleton />);
		const dotsContainer = container.querySelector(".flex.justify-center.gap-2");
		expect(dotsContainer).not.toBeNull();
		// limit=8, min(5, 8) = 5 dots
		expect(dotsContainer?.children).toHaveLength(5);
	});

	it("renders fewer dots when limit is less than 5", () => {
		const { container } = render(<RelatedProductsSkeleton limit={3} />);
		const dotsContainer = container.querySelector(".flex.justify-center.gap-2");
		expect(dotsContainer).not.toBeNull();
		// limit=3, min(5, 3) = 3 dots
		expect(dotsContainer?.children).toHaveLength(3);
	});

	it("renders the carousel container", () => {
		const { container } = render(<RelatedProductsSkeleton />);
		const carousel = container.querySelector(".w-full.overflow-hidden");
		expect(carousel).not.toBeNull();
	});
});
