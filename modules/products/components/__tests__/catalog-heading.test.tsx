/**
 * Le bloc titre du catalogue — les trois copies possibles.
 *
 * Ce choix vivait dans `ProductCatalog` (`pageTitle`) jusqu'au 2026-08-07 : il
 * y était calculé à partir de props déjà résolues, donc d'un `await searchParams`
 * / `await params` au niveau supérieur des deux pages — ce qui vidait leur App
 * Shell. Le bloc résout désormais ses propres promesses derrière la frontière
 * `Suspense` du shell, et c'est ici que la règle se teste.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GetProductsReturn } from "@/modules/products/data/get-products";
import type {
	ActiveProductType,
	CatalogListProps,
} from "@/modules/products/types/catalog-shell.types";

// Le bloc partagé porte le `h1` ; on ne teste ici que ce que le wrapper décide.
vi.mock("@/shared/components/storefront-heading", () => ({
	StorefrontHeading: ({
		title,
		description,
		accent,
	}: {
		title: string;
		description?: string;
		accent?: string;
	}) => (
		<div data-testid="storefront-heading" data-accent={accent} data-description={description}>
			<h1>{title}</h1>
		</div>
	),
	StorefrontHeadingSkeleton: () => <div data-testid="storefront-heading-skeleton" />,
}));

import { CatalogHeading } from "../catalog-heading";

const productsPromise = Promise.resolve({
	products: [],
	pagination: {
		nextCursor: null,
		prevCursor: null,
		hasNextPage: false,
		hasPreviousPage: false,
	},
	totalCount: 0,
	suggestion: undefined,
} as unknown as GetProductsReturn);

function listProps(overrides: Partial<CatalogListProps> = {}): Promise<CatalogListProps> {
	return Promise.resolve({ perPage: 24, ...overrides });
}

/**
 * `CatalogHeading` est un Server Component `async` : on l'appelle comme une
 * fonction et on rend son élément, plutôt que de le monter (le renderer client
 * de RTL ne sait pas rendre un composant asynchrone).
 */
async function renderHeading(props: {
	listPropsPromise: Promise<CatalogListProps>;
	activeProductTypePromise?: Promise<ActiveProductType>;
}) {
	const element = await CatalogHeading({ ...props, productsPromise });
	render(element);
}

// Pas d'auto-cleanup RTL dans ce dépôt : sans ça, chaque rendu s'empile et les
// requêtes `getBy*` trouvent plusieurs éléments.
afterEach(cleanup);

describe("CatalogHeading — le titre", () => {
	it("rend « Les créations » par défaut", async () => {
		await renderHeading({ listPropsPromise: listProps() });
		expect(screen.getByRole("heading", { name: "Les créations" })).toBeInTheDocument();
	});

	it("rend le libellé de la famille sur une page catégorie", async () => {
		await renderHeading({
			listPropsPromise: listProps(),
			activeProductTypePromise: Promise.resolve({ slug: "bagues", label: "Bagues" }),
		});
		expect(screen.getByRole("heading", { name: "Bagues" })).toBeInTheDocument();
	});

	it("le terme recherché l'emporte sur la famille — c'est le contexte le plus étroit", async () => {
		await renderHeading({
			listPropsPromise: listProps({ searchTerm: "argent" }),
			activeProductTypePromise: Promise.resolve({ slug: "bagues", label: "Bagues" }),
		});
		expect(screen.getByRole("heading", { name: 'Recherche "argent"' })).toBeInTheDocument();
	});

	it("préfère la description de la base à la copie d'atelier", async () => {
		await renderHeading({
			listPropsPromise: listProps(),
			activeProductTypePromise: Promise.resolve({
				slug: "bagues",
				label: "Bagues",
				description: "Toutes mes bagues artisanales.",
			}),
		});
		expect(screen.getByTestId("storefront-heading")).toHaveAttribute(
			"data-description",
			"Toutes mes bagues artisanales.",
		);
	});

	it("sur une recherche, la copie laisse place au contexte de recherche", async () => {
		await renderHeading({ listPropsPromise: listProps({ searchTerm: "argent" }) });
		expect(screen.getByTestId("storefront-heading")).toHaveAttribute(
			"data-description",
			"Voici ce que j'ai trouvé dans l'atelier.",
		);
	});
});
