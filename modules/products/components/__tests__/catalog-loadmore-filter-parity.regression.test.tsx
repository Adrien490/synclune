/**
 * @regression catalog-loadmore-filter-parity
 *
 * Le tri et les filtres SERVEUR doivent atteindre le load-more mobile.
 *
 * ## Le défaut, tel qu'il vivait en production
 *
 * `ProductCatalogProps` ne déclarait **ni `sortBy` ni `filters`**, et montait
 * `<ProductList>` sans les passer — alors que les deux pages catalogue
 * calculaient bien leurs filtres pour la requête serveur. Sur `/produits` et
 * `/produits/[productTypeSlug]`, `ProductsLoadMore` recevait donc `undefined`
 * pour les deux, et `loadMoreProducts` retombait sur `created-descending` +
 * `{}`. Conséquences, toutes les deux invisibles à `tsc` (les props étaient
 * optionnelles) :
 *
 * 1. **Un curseur issu de la requête FILTRÉE paginait une requête DIFFÉRENTE.**
 *    Filtre « boucles d'oreilles, < 30 € » → 9 pièces annoncées, puis 20 colliers
 *    à 80 € ajoutés par l'auto-load, et un compteur qui affichait « 29 sur 9 ».
 * 2. **La `key` de remount devenait inerte** (`"default-<search>-{}"`) : comme
 *    `useActionState` fige son état initial, changer de tri ou de filtre ne
 *    réinitialisait plus l'accumulation — les anciens lots restaient posés sous
 *    la nouvelle page 1.
 *
 * ⚠️ `/collections/[slug]` était le SEUL des trois montages à passer les deux
 * props : c'est ce qui rendait le défaut invisible à qui regardait un seul
 * appelant.
 *
 * Ce test exerce les deux maillons de la chaîne — `ProductCatalog → ProductList`
 * puis `ProductList → ProductsLoadMore` — parce qu'il suffit qu'UN maillon
 * laisse tomber la prop pour que le défaut revienne, sans qu'aucun autre outil
 * ne le signale.
 */

import React, { Suspense } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GetProductsReturn, ProductFilters } from "@/modules/products/data/get-products";

// ============================================================================
// INFRASTRUCTURE MOCKS (prevent Stripe/auth/prisma init errors)
// ============================================================================

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/modules/auth/lib/auth", () => ({ auth: {} }));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: {},
	notDeleted: { deletedAt: null },
	softDelete: {},
}));

// ============================================================================
// MODULE MOCKS — on n'observe QUE ce qui arrive aux deux frontières
// ============================================================================

vi.mock("@/modules/products/components/product-card", () => ({
	ProductCard: ({ product }: { product: { id: string } }) => (
		<article data-testid={`product-card-${product.id}`} />
	),
}));

vi.mock("@/shared/components/cursor-pagination", () => ({
	StorefrontPaginationBand: () => <nav aria-label="Pagination" />,
	CursorPaginationSkeleton: () => <div />,
}));

/** Le témoin : ce que `ProductList` transmet réellement au load-more. */
vi.mock("@/modules/products/components/products-load-more", () => ({
	ProductsLoadMore: (props: {
		sortBy?: string;
		filters?: ProductFilters;
		perPage: number;
		totalCount: number;
	}) => (
		<div
			data-testid="products-load-more"
			data-sort-by={props.sortBy ?? "ABSENT"}
			data-filters={JSON.stringify(props.filters ?? "ABSENT")}
			data-per-page={props.perPage}
		/>
	),
}));

import { ProductList } from "../product-list";

// ============================================================================
// HELPERS
// ============================================================================

function makeProduct(id: string) {
	return {
		id,
		title: `Pièce ${id}`,
		slug: `piece-${id}`,
		skus: [],
		productType: null,
	};
}

function makeResult(): Promise<GetProductsReturn> {
	return Promise.resolve({
		products: [makeProduct("1"), makeProduct("2")],
		pagination: {
			nextCursor: "cursor-1",
			prevCursor: null,
			hasNextPage: true,
			hasPreviousPage: false,
		},
		totalCount: 62,
		suggestion: null,
	} as unknown as GetProductsReturn);
}

async function renderList(props: Parameters<typeof ProductList>[0]) {
	await act(async () => {
		render(
			<Suspense fallback={null}>
				<ProductList {...props} />
			</Suspense>,
		);
	});
}

const FILTERS: ProductFilters = {
	type: ["boucles-oreilles"],
	priceMax: 3000,
};

// ============================================================================
// TESTS
// ============================================================================

describe("parité filtres catalogue ↔ load-more", () => {
	afterEach(cleanup);

	it("ProductList transmet `sortBy` et `filters` à ProductsLoadMore", async () => {
		await renderList({
			productsPromise: makeResult(),
			perPage: 20,
			sortBy: "price-ascending",
			filters: FILTERS,
		});

		const loadMore = screen.getByTestId("products-load-more");

		// Le défaut historique rendait « ABSENT » sur les deux.
		expect(loadMore).toHaveAttribute("data-sort-by", "price-ascending");
		expect(JSON.parse(loadMore.getAttribute("data-filters")!)).toEqual(FILTERS);
	});

	it("ProductList transmet aussi `perPage` — les lots suivent la taille de la page", async () => {
		await renderList({
			productsPromise: makeResult(),
			perPage: 50,
			sortBy: "price-ascending",
			filters: FILTERS,
		});

		// Codé en dur auparavant : un visiteur arrivé en `?perPage=50` voyait
		// 50 pièces rendues par le serveur, puis des lots de 20.
		expect(screen.getByTestId("products-load-more")).toHaveAttribute("data-per-page", "50");
	});

	it("monte le load-more à la MÊME profondeur que les cartes — pas dans un wrapper", async () => {
		await renderList({
			productsPromise: makeResult(),
			perPage: 20,
			sortBy: "price-ascending",
			filters: FILTERS,
		});

		// La couture de 40 px venait de là : le load-more vivait dans un
		// `<div class="mt-6 md:hidden">` imbriqué dans une cellule `col-span-full`,
		// et rendait sa propre grille. Ses cellules doivent être des enfants
		// DIRECTS de la grille hôte, donc au même niveau que les cartes serveur.
		const card = screen.getByTestId("product-card-1");
		const loadMore = screen.getByTestId("products-load-more");

		// `.product-item` est la cellule qui enveloppe la carte ; le load-more,
		// lui, rend ses propres cellules — les deux partagent le même parent.
		expect(loadMore.parentElement).toBe(card.parentElement?.parentElement);
	});

	it("ProductCatalog déclare les deux props et les fait descendre", async () => {
		// On lit le TYPE et le point de montage plutôt que de rendre tout le
		// shell (qui tire la sort bar, la filter sheet et le JSON-LD) : ce qui
		// s'était perdu, c'est la DÉCLARATION — `ProductCatalogProps` ne
		// connaissait pas ces deux noms, donc les pages ne pouvaient même pas les
		// passer, et `tsc` ne pouvait rien dire.
		const { readFileSync } = await import("node:fs");
		const { join } = await import("node:path");
		const source = readFileSync(
			join(process.cwd(), "modules/products/components/product-catalog.tsx"),
			"utf8",
		);

		expect(source).toMatch(/sortBy\?:\s*SortField/);
		expect(source).toMatch(/filters\?:\s*ProductFilters/);
		// …et elles doivent effectivement atterrir sur `<ProductList>`.
		const listMount = source.slice(source.indexOf("<ProductList"));
		expect(listMount).toContain("sortBy={sortBy}");
		expect(listMount).toContain("filters={filters}");
	});

	it("les trois pages qui montent le catalogue passent tri et filtres", async () => {
		const { readFileSync } = await import("node:fs");
		const { join } = await import("node:path");

		const mounts = [
			// `mergedFilters` sur la page catégorie : le type vient du PATH, pas des
			// searchParams — passer `filters` nu ramènerait TOUT le catalogue.
			["app/(shop)/produits/page.tsx", "<ProductCatalog", "filters={filters}"],
			[
				"app/(shop)/produits/[productTypeSlug]/page.tsx",
				"<ProductCatalog",
				"filters={mergedFilters}",
			],
			["app/(shop)/collections/[slug]/page.tsx", "<ProductList", "filters={parseFilters("],
		] as const;

		for (const [file, mountTag, expectedFilters] of mounts) {
			const source = readFileSync(join(process.cwd(), file), "utf8");
			const mount = source.slice(source.indexOf(mountTag));
			expect(mount, `${file} — tri non transmis`).toContain("sortBy={sortBy");
			expect(mount, `${file} — filtres non transmis`).toContain(expectedFilters);
		}
	});
});
