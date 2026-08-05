/**
 * @regression catalog-live-region-not-a-cell
 *
 * La live region du nombre de résultats était enveloppée dans une cellule
 * `col-span-full` de la grille du catalogue. Comme elle est `sr-only` (donc
 * `position: absolute`, hors flux), cette cellule mesurait 0 px de haut tout en
 * consommant une RANGÉE ENTIÈRE en tête de grille.
 *
 * Deux conséquences, aucune visible en test unitaire classique (décrites dans
 * le montage de l'époque, où le bloc titre était la première cellule de la
 * grille — il vit en tête de page depuis le 2026-08-05, mais la rangée fantôme
 * resterait un défaut aujourd'hui) :
 *
 * - à `lg`, la cellule vide fermait la rangée du bloc titre : la 3ᵉ colonne
 *   restait blanche (~245 px) et toutes les cartes tombaient d'une rangée ;
 * - à tous les paliers, la rangée fantôme coûtait une gouttière de plus (16 /
 *   24 / 32 px) que `ProductListSkeleton`, qui ne rend aucune cellule de ce
 *   genre : le swap Suspense → contenu décalait la grille sur la seule page dont
 *   le CLS est budgété en CI (`e2e/performance.spec.ts`).
 *
 * Le correctif est un wrapper `display: contents`. ⚠️ Il doit rester un `<div>`
 * PARTAGÉ par les trois branches (erreur / vide / peuplée) : c'est son identité
 * de nœud qui garde la live region montée quand on passe de 0 à N résultats, et
 * une région recréée en même temps que son texte n'est jamais annoncée (audit
 * recherche 2026-07-26). Les deux invariants sont donc testés ensemble — les
 * séparer laisserait « corriger » l'un en cassant l'autre.
 */

import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// INFRASTRUCTURE MOCKS (évitent l'init Stripe/auth/prisma à l'import)
// ---------------------------------------------------------------------------

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/modules/auth/lib/auth", () => ({ auth: {} }));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {},
	notDeleted: { deletedAt: null },
	softDelete: {},
}));

// ---------------------------------------------------------------------------
// MODULE MOCKS
// ---------------------------------------------------------------------------

vi.mock("@/modules/products/components/product-card", () => ({
	ProductCard: ({ product }: { product: { id: string; title: string } }) => (
		<article data-testid={`product-card-${product.id}`}>{product.title}</article>
	),
}));

vi.mock("@/shared/components/cursor-pagination", () => ({
	StorefrontPaginationBand: () => <nav data-testid="cursor-pagination" aria-label="Pagination" />,
}));

vi.mock("@/modules/products/components/refresh-button", () => ({
	RefreshButton: () => <button data-testid="refresh-button">Recharger</button>,
}));

vi.mock("@/modules/products/components/search-fallback-suggestions", () => ({
	SearchFallbackSuggestions: () => <div data-testid="search-fallback-suggestions" />,
	SearchFallbackSuggestionsSkeleton: () => (
		<div data-testid="search-fallback-suggestions-skeleton" />
	),
}));

vi.mock("@/modules/products/components/search-correction-suggestion", () => ({
	SearchCorrectionSuggestion: ({ suggestion }: { suggestion: string }) => (
		<div data-testid="search-correction-suggestion">{suggestion}</div>
	),
}));

vi.mock("@/shared/components/ui/alert", () => ({
	Alert: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert" role="alert">
			{children}
		</div>
	),
	AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	WarningIcon: () => <span data-testid="triangle-alert" />,
}));

// ---------------------------------------------------------------------------

import { ProductList } from "../product-list";
import { CATALOG_ROW_CELL } from "../catalog-grid.constants";
import type { GetProductsReturn } from "@/modules/products/data/get-products";

function makeProduct(id: string) {
	return {
		id,
		slug: `product-${id}`,
		title: `Product ${id}`,
		status: "PUBLIC",
		type: { id: "type-1", label: "Bague", slug: "bague" },
		skus: [],
		collections: [],
		createdAt: new Date("2025-01-01"),
	};
}

function makeResult(
	overrides: Partial<{
		products: ReturnType<typeof makeProduct>[];
		totalCount: number;
		suggestion: string | null;
	}> = {},
): Promise<GetProductsReturn> {
	const products = overrides.products ?? [makeProduct("1"), makeProduct("2")];
	return Promise.resolve({
		products,
		pagination: {
			nextCursor: null,
			prevCursor: null,
			hasNextPage: false,
			hasPreviousPage: false,
		},
		totalCount: overrides.totalCount ?? products.length,
		suggestion: overrides.suggestion ?? null,
	} as unknown as GetProductsReturn);
}

/** La grille réelle : `ProductList` ne rend AUCUN conteneur, ses cellules sont
 *  des enfants directs de celle du shell (`CATALOG_GRID`). */
function renderInGrid(props: Parameters<typeof ProductList>[0]) {
	return render(
		<div data-testid="grid">
			<Suspense fallback={<div data-testid="loading" />}>
				<ProductList {...props} />
			</Suspense>
		</div>,
	);
}

async function renderList(props: Parameters<typeof ProductList>[0]) {
	let result!: ReturnType<typeof render>;
	await act(async () => {
		result = renderInGrid(props);
		await props.productsPromise;
	});
	return result;
}

/**
 * Les cellules de rangée pleine réellement posées dans la grille.
 *
 * Sélecteur DESCENDANT, pas `>` : un wrapper `display: contents` est transparent
 * pour la DISPOSITION (ses enfants sont les items de la grille) mais reste un
 * nœud dans le DOM — une cellule rangée dedans est bien une cellule de la
 * grille, et c'est justement le cas de celle de la suggestion.
 */
function rowCells(container: HTMLElement) {
	return [...container.querySelectorAll(`[data-testid="grid"] .${CATALOG_ROW_CELL}`)];
}

/** Une cellule qui n'a ni élément ni texte ne réserve qu'une rangée vide. */
function isEmptyCell(cell: Element) {
	return cell.childElementCount === 0 && cell.textContent === "";
}

afterEach(() => {
	cleanup();
	vi.resetAllMocks();
});

describe("@regression catalog-live-region-not-a-cell", () => {
	it("n'enveloppe PAS la live region dans une cellule de la grille", async () => {
		const { container } = await renderList({ productsPromise: makeResult(), perPage: 24 });

		const liveRegion = screen.getByRole("status");
		// Le wrapper existe (il porte l'identité du nœud entre les branches), mais
		// il est hors disposition : `contents`, jamais `col-span-full`.
		const wrapper = liveRegion.parentElement!;
		expect(wrapper.className).toContain("contents");
		expect(wrapper.className).not.toContain(CATALOG_ROW_CELL);
		expect(rowCells(container)).not.toContain(wrapper);
	});

	it("ne pose AUCUNE cellule vide avant la première carte", async () => {
		const { container } = await renderList({ productsPromise: makeResult(), perPage: 24 });

		// Une cellule de rangée pleine SANS contenu ne réserve rien d'autre qu'une
		// rangée fantôme en tête de grille. C'est le défaut, et il est invisible à
		// l'œil.
		const cells = rowCells(container);
		expect(cells.filter(isEmptyCell)).toEqual([]);

		// La live region n'est PAS dans l'une d'elles (son wrapper est `contents`).
		for (const cell of cells) {
			expect(cell).not.toContainElement(screen.getByRole("status"));
		}

		// Et la première cellule de rangée pleine reste la pagination, en fin de
		// grille — rien ne s'insère avant la première carte.
		expect(cells.at(-1)).toContainElement(screen.getByTestId("cursor-pagination"));
	});

	it("garde une cellule pour la suggestion de correction, elle a du contenu", async () => {
		const { container } = await renderList({
			productsPromise: makeResult({ suggestion: "bagues" }),
			perPage: 24,
		});

		const suggestionCell = screen.getByTestId("search-correction-suggestion").parentElement!;
		expect(suggestionCell.className).toContain(CATALOG_ROW_CELL);
		expect(rowCells(container)).toContain(suggestionCell);
	});

	it("garde le MÊME nœud de live region en passant de 0 à N résultats", async () => {
		// L'invariant d'annonce : une région recréée en même temps que son texte
		// reste muette. C'est ce que le wrapper partagé protège — et c'est ce qu'un
		// « nettoyage » du wrapper casserait en silence.
		const { rerender } = await renderList({
			productsPromise: makeResult({ products: [], totalCount: 0 }),
			perPage: 24,
			searchTerm: "argent",
		});
		const before = screen.getByRole("status");

		const populated = makeResult({ totalCount: 2 });
		await act(async () => {
			rerender(
				<div data-testid="grid">
					<Suspense fallback={<div data-testid="loading" />}>
						<ProductList productsPromise={populated} perPage={24} searchTerm="argent" />
					</Suspense>
				</div>,
			);
			await populated;
		});

		expect(screen.getByRole("status")).toBe(before);
	});
});
