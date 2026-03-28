import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("../reviewable-product-card", () => ({
	ReviewableProductCard: ({ product }: { product: { productId: string } }) => (
		<div data-testid="reviewable-product-card" data-product-id={product.productId} />
	),
}));

import { ReviewableProductsSection } from "../reviewable-products-section";
import type { ReviewableProduct } from "@/modules/reviews/types/review.types";

function createProduct(id: string): ReviewableProduct {
	return {
		productId: id,
		productTitle: `Produit ${id}`,
		productSlug: `produit-${id}`,
		productImage: null,
		orderItemId: `oi-${id}`,
		orderedAt: new Date("2026-01-01"),
		deliveredAt: new Date("2026-01-10"),
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewableProductsSection", () => {
	it("renders the section heading with product count", () => {
		render(<ReviewableProductsSection products={[createProduct("1"), createProduct("2")]} />);
		expect(screen.getByText("Produits à évaluer (2)")).toBeInTheDocument();
	});

	it("renders a card for each product", () => {
		render(
			<ReviewableProductsSection
				products={[createProduct("1"), createProduct("2"), createProduct("3")]}
			/>,
		);
		expect(screen.getAllByTestId("reviewable-product-card").length).toBe(3);
	});

	it("renders the section element with aria-labelledby", () => {
		render(<ReviewableProductsSection products={[createProduct("1")]} />);
		const section = screen.getByRole("region", { name: "Produits à évaluer (1)" });
		expect(section).toBeInTheDocument();
	});
});
