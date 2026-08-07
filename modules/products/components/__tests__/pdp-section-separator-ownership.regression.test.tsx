/**
 * @regression pdp-section-separator-ownership
 *
 * Un séparateur de section appartient à SA section, jamais à la page.
 *
 * Défaut d'origine (audit PDP 2026-08-05) : `app/(shop)/creations/[slug]/page.tsx`
 * rendait `<Separator/>` · « Récemment vus » · `<Separator/>` · « Dans la même veine »
 * de façon inconditionnelle, alors que les DEUX sections retournent `null` quand
 * elles sont vides — « Récemment vus » l'était sur la première fiche de chaque visite
 * (le cookie n'était écrit qu'après le rendu, et la fiche courante était exclue),
 * « Dans la même veine » l'est sur un produit isolé. Les deux filets devenaient alors
 * des frères adjacents dans le `space-y-12`, soit deux traits horizontaux à 48 px
 * l'un de l'autre avec rien entre eux.
 *
 * ⚠️ La feature « produits récemment vus » a été SUPPRIMÉE le 2026-08-06 : ce test ne
 * garde plus qu'une section conditionnelle, « Dans la même veine ». L'invariant est
 * inchangé et vaut pour toute section future — un filet rendu par la page ne peut pas
 * disparaître avec la section qu'il ouvre. C'est aussi pourquoi l'assertion « la page
 * ne rend AUCUN séparateur » est CONSERVÉE : elle est ce qui empêche le défaut de
 * revenir par la prochaine section ajoutée.
 *
 * Toute modification exige une review explicite.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetRelatedProducts, mockGetWishlistProductIds } = vi.hoisted(() => ({
	mockGetRelatedProducts: vi.fn(),
	mockGetWishlistProductIds: vi.fn(),
}));

vi.mock("@/modules/products/data/get-related-products", () => ({
	getRelatedProducts: mockGetRelatedProducts,
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

import { RelatedProducts } from "../related-products";
import { RelatedProductsSkeleton } from "../related-products-skeleton";

afterEach(cleanup);

const PRODUCT = { id: "p1", title: "Bague Lune", slug: "bague-lune" };

beforeEach(() => {
	mockGetWishlistProductIds.mockResolvedValue(new Set<string>());
	mockGetRelatedProducts.mockResolvedValue([PRODUCT]);
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

	it("le squelette porte le même séparateur que la section qu'il double", () => {
		const related = render(<RelatedProductsSkeleton limit={2} />);
		expect(countSeparators(related.container)).toBe(1);
	});

	it("la page ne rend AUCUN séparateur autour des sections", () => {
		const pageSource = readFileSync(
			join(process.cwd(), "app/(shop)/creations/[slug]/page.tsx"),
			"utf8",
		);
		expect(pageSource).not.toMatch(/\bSeparator\b/);
	});

	it("la feature « produits récemment vus » ne revient pas par la PDP", () => {
		// Supprimée le 2026-08-06. Le garde-fou est ici parce que c'est cette page qui
		// la montait : son retour passerait par un import de plus dans page.tsx ou son
		// repli de route.
		for (const file of ["page.tsx", "loading.tsx"]) {
			const source = readFileSync(join(process.cwd(), "app/(shop)/creations/[slug]", file), "utf8");
			expect(source).not.toMatch(/RecentlyViewed|RecordProductView|getRecentProduct/);
		}
	});
});
