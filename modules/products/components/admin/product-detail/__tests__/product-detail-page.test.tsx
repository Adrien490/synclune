import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../product-detail-header", () => ({
	ProductDetailHeader: ({ product }: { product: { title: string } }) => (
		<header data-testid="header">{product.title}</header>
	),
}));

vi.mock("../product-detail-media-card", () => ({
	ProductDetailMediaCard: () => <section data-testid="media-card" />,
}));

vi.mock("../product-detail-info-card", () => ({
	ProductDetailInfoCard: () => <section data-testid="info-card" />,
}));

vi.mock("../product-detail-skus-summary-card", () => ({
	ProductDetailSkusSummaryCard: () => <section data-testid="skus-card" />,
}));

vi.mock("../product-detail-collections-card", () => ({
	ProductDetailCollectionsCard: () => <section data-testid="collections-card" />,
}));

vi.mock("../product-detail-reviews-card", () => ({
	ProductDetailReviewsCard: ({ productTitle }: { productTitle: string }) => (
		<section data-testid="reviews-card" data-product-title={productTitle} />
	),
}));

vi.mock("../product-detail-storefront-link-card", () => ({
	ProductDetailStorefrontLinkCard: ({ slug, status }: { slug: string; status: string }) => (
		<section data-testid="storefront-card" data-slug={slug} data-status={status} />
	),
}));

import { ProductDetailPage } from "../product-detail-page";

const product = {
	id: "p-1",
	slug: "anneau-lune",
	title: "Anneau Lune",
	description: null,
	status: "PUBLIC" as const,
	createdAt: new Date(),
	updatedAt: new Date(),
	type: null,
	skus: [],
	collections: [],
} as any;

const reviewStats = { totalCount: 0, averageRating: 0, distribution: [] } as any;

describe("ProductDetailPage", () => {
	afterEach(cleanup);

	it("monte les 7 sous-composants attendus", () => {
		render(<ProductDetailPage product={product} reviewStats={reviewStats} />);
		expect(screen.getByTestId("header")).toBeInTheDocument();
		expect(screen.getByTestId("media-card")).toBeInTheDocument();
		expect(screen.getByTestId("info-card")).toBeInTheDocument();
		expect(screen.getByTestId("skus-card")).toBeInTheDocument();
		expect(screen.getByTestId("reviews-card")).toBeInTheDocument();
		expect(screen.getByTestId("collections-card")).toBeInTheDocument();
		expect(screen.getByTestId("storefront-card")).toBeInTheDocument();
	});

	it("transmet slug + status à la storefront card", () => {
		render(<ProductDetailPage product={product} reviewStats={reviewStats} />);
		const card = screen.getByTestId("storefront-card");
		expect(card).toHaveAttribute("data-slug", "anneau-lune");
		expect(card).toHaveAttribute("data-status", "PUBLIC");
	});

	it("transmet le titre produit à la reviews card", () => {
		render(<ProductDetailPage product={product} reviewStats={reviewStats} />);
		expect(screen.getByTestId("reviews-card")).toHaveAttribute("data-product-title", "Anneau Lune");
	});
});
