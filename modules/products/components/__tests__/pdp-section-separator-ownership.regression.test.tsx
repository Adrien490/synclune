/**
 * @regression pdp-section-separator-ownership
 *
 * Un séparateur de section appartient à SA section, jamais à la page.
 *
 * Défaut d'origine (audit PDP 2026-08-05) : `app/(shop)/creations/[slug]/page.tsx`
 * rendait `<Separator/>` · « Récemment vus » · `<Separator/>` · « Dans la même veine »
 * de façon inconditionnelle, alors que les DEUX sections retournent `null` quand
 * elles sont vides — « Récemment vus » l'est sur la première fiche de chaque visite
 * (le cookie n'est écrit qu'après le rendu, et la fiche courante est exclue), « Dans
 * la même veine » l'est sur un produit isolé. Les deux filets devenaient alors des
 * frères adjacents dans le `space-y-12`, soit deux traits horizontaux à 48 px l'un
 * de l'autre avec rien entre eux.
 *
 * Toute modification exige une review explicite.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetRelatedProducts, mockGetRecentProducts, mockGetWishlistProductIds } = vi.hoisted(
	() => ({
		mockGetRelatedProducts: vi.fn(),
		mockGetRecentProducts: vi.fn(),
		mockGetWishlistProductIds: vi.fn(),
	}),
);

vi.mock("@/modules/products/data/get-related-products", () => ({
	getRelatedProducts: mockGetRelatedProducts,
}));
vi.mock("@/modules/products/data/get-recent-products", () => ({
	getRecentProducts: mockGetRecentProducts,
}));
vi.mock("@/modules/wishlist/data/get-wishlist-product-ids", () => ({
	getWishlistProductIds: mockGetWishlistProductIds,
}));

vi.mock("@/modules/products/components/product-card", () => ({
	ProductCard: ({ product }: { product: { id: string } }) => <div data-testid={product.id} />,
}));

vi.mock("@/shared/components/animations", () => ({
	Reveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	Stagger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/carousel", () => ({
	Carousel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CarouselContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CarouselItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CarouselDots: () => <div />,
	CarouselNext: () => <button type="button" />,
	CarouselPrevious: () => <button type="button" />,
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

import { RecentlyViewedProducts } from "../recently-viewed-products";
import { RecentlyViewedProductsSkeleton } from "../recently-viewed-products-skeleton";
import { RelatedProducts } from "../related-products";
import { RelatedProductsSkeleton } from "../related-products-skeleton";

afterEach(cleanup);

const PRODUCT = { id: "p1", title: "Bague Lune", slug: "bague-lune" };

beforeEach(() => {
	mockGetWishlistProductIds.mockResolvedValue(new Set<string>());
	mockGetRelatedProducts.mockResolvedValue([PRODUCT]);
	mockGetRecentProducts.mockResolvedValue([PRODUCT]);
});

function countSeparators(container: HTMLElement) {
	return container.querySelectorAll('[data-slot="separator"]').length;
}

describe("un séparateur de section appartient à sa section", () => {
	it("« Dans la même veine » porte son séparateur quand elle est peuplée", async () => {
		const { container } = render(await RelatedProducts({ currentProductSlug: "autre" }));
		expect(countSeparators(container)).toBe(1);
	});

	it("« Dans la même veine » ne rend RIEN — séparateur compris — quand elle est vide", async () => {
		mockGetRelatedProducts.mockResolvedValue([]);
		expect(await RelatedProducts({ currentProductSlug: "autre" })).toBeNull();
	});

	it("« Récemment vus » porte son séparateur quand elle est peuplée", async () => {
		const { container } = render(await RecentlyViewedProducts({ currentProductSlug: "autre" }));
		expect(countSeparators(container)).toBe(1);
	});

	it("« Récemment vus » ne rend RIEN — séparateur compris — quand elle est vide", async () => {
		mockGetRecentProducts.mockResolvedValue([]);
		expect(await RecentlyViewedProducts({ currentProductSlug: "autre" })).toBeNull();
	});

	it("les squelettes portent le même séparateur que la section qu'ils doublent", () => {
		const related = render(<RelatedProductsSkeleton limit={2} />);
		expect(countSeparators(related.container)).toBe(1);
		cleanup();
		const recent = render(<RecentlyViewedProductsSkeleton limit={2} />);
		expect(countSeparators(recent.container)).toBe(1);
	});

	it("la page ne rend AUCUN séparateur autour des sections", () => {
		const pageSource = readFileSync(
			join(process.cwd(), "app/(shop)/creations/[slug]/page.tsx"),
			"utf8",
		);
		expect(pageSource).not.toMatch(/\bSeparator\b/);
	});

	it("le repli de route ne dessine pas la section « Récemment vus »", () => {
		// Il ne peut pas lire le cookie sans devenir dynamique : il ne doit donc pas
		// promettre une section qui, sur une première visite, n'arrive jamais.
		const loadingSource = readFileSync(
			join(process.cwd(), "app/(shop)/creations/[slug]/loading.tsx"),
			"utf8",
		);
		expect(loadingSource).not.toMatch(/RecentlyViewedProductsSkeleton/);
	});
});
