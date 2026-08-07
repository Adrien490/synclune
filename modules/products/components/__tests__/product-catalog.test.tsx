import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/dynamic", () => ({
	default: (_loader: () => Promise<{ default: React.ComponentType }>) => {
		return function DynamicComponent(props: Record<string, unknown>) {
			return <div data-testid="product-filter-sheet" {...props} />;
		};
	},
}));

vi.mock("@/modules/products/components/filter-badges", () => ({
	ProductFilterBadges: ({
		colors,
		materials,
		productTypes,
	}: {
		colors: unknown[];
		materials: unknown[];
		productTypes: unknown[];
		activeProductType?: unknown;
	}) => (
		<div
			data-testid="product-filter-badges"
			data-colors={colors.length}
			data-materials={materials.length}
			data-product-types={productTypes.length}
		/>
	),
}));

vi.mock("@/modules/products/components/product-list", () => ({
	ProductList: ({
		searchTerm,
		perPage,
		preferOnSale,
	}: {
		productsPromise: Promise<unknown>;
		perPage: number;
		searchTerm?: string;
		wishlistProductIdsPromise?: Promise<Set<string>>;
		preferOnSale?: boolean;
	}) => (
		<div
			data-testid="product-list"
			data-search-term={searchTerm}
			data-per-page={perPage}
			data-prefer-on-sale={preferOnSale}
		/>
	),
}));

vi.mock("@/modules/products/components/product-list-skeleton", () => ({
	ProductListSkeleton: () => <div data-testid="product-list-skeleton" />,
}));

/**
 * La barre « Filtrer » est un client component (`useSearchParams`/`usePathname`
 * via son Inner) : on la stube pour que ce fichier reste un test du SHELL.
 */
vi.mock("@/modules/products/components/product-filter-bar", () => ({
	ProductFilterBar: () => <div data-testid="product-filter-bar" />,
}));

/**
 * Le rail de filtres desktop est un client component qui lit le router
 * (`useImmediateProductFilters`) : sans stub, `useRouter` jette « invariant
 * expected app router to be mounted » et emporte tout le fichier. Son
 * comportement propre est couvert par `filter-rail-immediate-apply` et l'E2E
 * desktop.
 */
vi.mock("@/modules/products/components/product-filter-rail", () => ({
	ProductFilterRail: ({
		maxPriceInEuros,
		sortOptions,
	}: {
		maxPriceInEuros: number;
		sortOptions: { value: string; label: string }[];
	}) => (
		<div
			data-testid="product-filter-rail"
			data-max-price={maxPriceInEuros}
			data-sort-options={sortOptions.length}
		/>
	),
}));

/**
 * Le bloc titre est un Server Component `async` : depuis le 2026-08-07 il résout
 * lui-même le terme recherché et le type du path (c'est en SORTANT ces lectures
 * d'URL du niveau supérieur des pages que le meuble de filtres a pu entrer dans
 * l'App Shell). On le stube pour que ce fichier reste un test du SHELL —
 * ce qui est monté, dans quel ordre, et ce qui descend aux enfants. Le titre
 * lui-même est couvert par `catalog-heading.test.tsx`.
 */
vi.mock("@/modules/products/components/catalog-heading", () => ({
	CatalogHeading: ({
		activeProductTypePromise,
	}: {
		activeProductTypePromise?: Promise<unknown>;
	}) => (
		<div data-testid="catalog-heading" data-has-active-type={!!activeProductTypePromise}>
			<h1>Les créations</h1>
		</div>
	),
	CatalogHeadingSkeleton: ({ accent }: { accent?: string }) => (
		<div data-testid="catalog-heading-skeleton" data-accent={accent} />
	),
}));

vi.mock("@/shared/utils/safe-json-ld", () => ({
	safeJsonLd: (data: object) => JSON.stringify(data),
}));

vi.mock("@/shared/components/scroll-restoration", () => ({
	ScrollRestoration: () => null,
}));

vi.mock("@/modules/products/constants/product.constants", () => ({
	PRODUCTS_SORT_OPTIONS: {
		PRICE_ASC: "price-ascending",
		PRICE_DESC: "price-descending",
		NEWEST: "created-descending",
	},
	// Importée par `product-filter-params.service` (défaut de `sortBy`).
	PRODUCTS_DEFAULT_SORT: "created-descending",
	PRODUCTS_SORT_LABELS: {
		"price-ascending": "Prix croissant",
		"price-descending": "Prix décroissant",
		"created-descending": "Plus récents",
	},
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import {
	CatalogBreadcrumbs,
	CatalogList,
	ProductCatalog,
	type ProductCatalogProps,
} from "../product-catalog";
import type { CatalogListProps } from "@/modules/products/types/catalog-shell.types";

// ============================================================================
// FIXTURES
// ============================================================================

function makeListProps(overrides: Partial<CatalogListProps> = {}): CatalogListProps {
	return { perPage: 24, ...overrides };
}

function makeProps(overrides: Partial<ProductCatalogProps> = {}): ProductCatalogProps {
	return {
		productsPromise: Promise.resolve({
			products: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
			totalCount: 0,
			suggestion: undefined,
		}),
		// Tout ce qui dérive des `searchParams` arrive en UNE promesse, résolue
		// dans un enfant suspendu — le shell lui-même n'await rien.
		listPropsPromise: Promise.resolve(makeListProps()),
		productTypes: [],
		colors: [],
		materials: [],
		maxPriceInEuros: 500,
		// Le shell ne construit plus le balisage : il reçoit l'ÉMETTEUR et le rend
		// derrière sa propre frontière `Suspense` (`CatalogJsonLd` porte l'`await`
		// du catalogue, cf. `app/(shop)/produits/_components/catalog-json-ld.tsx`).
		jsonLdSlot: (
			<script
				type="application/ld+json"
				// react-doctor-disable-next-line react/no-danger
				dangerouslySetInnerHTML={{ __html: '{"@type":"ItemList"}' }}
			/>
		),
		// Forme RÉELLE : ni `/produits` ni `/produits/[type]` ne passent « Accueil »,
		// c'est le fil d'Ariane qui l'ajoute en tête (comme le faisait `PageHeader`).
		breadcrumbsPromise: Promise.resolve([{ label: "Créations", href: "/produits" }]),
		...overrides,
	};
}

/**
 * Le fil d'Ariane et la grille sont des Server Components `async` : le renderer
 * client de RTL ne sait pas les monter, ils restent donc en fallback dans le
 * rendu du shell. On les exerce en les APPELANT, puis en rendant leur retour —
 * c'est ce que fait `renderAsync` (même méthode que `catalog-heading.test.tsx`).
 */
async function renderAsync(element: Promise<React.ReactElement>) {
	render(await element);
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.resetAllMocks();
});

describe("ProductCatalog", () => {
	/**
	 * Ce que le shell garantit depuis le 2026-08-07, et qui est tout l'objet du
	 * changement de contrat : le meuble de filtres se rend SANS attendre l'URL.
	 * S'il repassait derrière une promesse, la navigation entre `/produits` et
	 * `/produits/[type]` réafficherait le squelette pleine page de `loading.tsx`
	 * — le défaut d'origine.
	 */
	describe("ce qui se peint sans attendre l'URL (App Shell)", () => {
		it("monte le meuble de filtres au premier rendu, avant toute résolution", () => {
			render(<ProductCatalog {...makeProps()} />);

			expect(screen.getByTestId("product-filter-bar")).toBeInTheDocument();
			expect(screen.getByTestId("product-filter-rail")).toBeInTheDocument();
			expect(screen.getByTestId("product-filter-sheet")).toBeInTheDocument();
			expect(screen.getByTestId("product-filter-badges")).toBeInTheDocument();
		});

		it("la grille, elle, attend — c'est la seule à montrer un squelette", () => {
			render(<ProductCatalog {...makeProps()} />);

			expect(screen.getByTestId("product-list-skeleton")).toBeInTheDocument();
			expect(screen.queryByTestId("product-list")).not.toBeInTheDocument();
		});

		it("transmet le type du path au bloc titre sur une page catégorie", () => {
			render(
				<ProductCatalog
					{...makeProps({
						activeProductTypePromise: Promise.resolve({ slug: "bague", label: "Bagues" }),
					})}
				/>,
			);
			expect(screen.getByTestId("catalog-heading")).toHaveAttribute("data-has-active-type", "true");
		});

		it("sur /produits, aucun type n'est transmis", () => {
			render(<ProductCatalog {...makeProps()} />);
			expect(screen.getByTestId("catalog-heading")).toHaveAttribute(
				"data-has-active-type",
				"false",
			);
		});
	});

	describe("breadcrumbs", () => {
		const items = [
			{ label: "Créations", href: "/produits" },
			{ label: "Bagues", href: "/produits/bagues" },
		];

		it("rend « Accueil » en tête, puis les breadcrumbs résolus", async () => {
			await renderAsync(CatalogBreadcrumbs({ breadcrumbsPromise: Promise.resolve(items) }));

			// « Accueil » est ajouté par le fil d'Ariane, pas par l'appelant — même
			// contrat que l'ancien `PageHeader`. Un appelant qui le passerait aussi
			// produirait deux liens identiques.
			expect(screen.getByRole("link", { name: "Accueil" })).toHaveAttribute("href", "/");
			expect(screen.getByRole("link", { name: "Créations" })).toHaveAttribute("href", "/produits");
		});

		it("marque le dernier maillon comme page courante, sans lien", async () => {
			await renderAsync(CatalogBreadcrumbs({ breadcrumbsPromise: Promise.resolve(items) }));

			expect(screen.queryByRole("link", { name: "Bagues" })).not.toBeInTheDocument();
			expect(screen.getByText("Bagues")).toHaveAttribute("aria-current", "page");
		});
	});

	describe("filter badges", () => {
		/**
		 * Le gate `hasActiveFilters` a quitté le shell le 2026-08-07 : il se
		 * déduisait des `searchParams` AWAITÉS, donc il retenait le bandeau hors de
		 * la coquille. C'est `FilterBadges` qui rend `null` sur une liste vide —
		 * même résultat visible, sans dépendance à l'URL côté serveur.
		 *
		 * @regression onsale-active-filters — `?onSale=true` seul doit laisser le
		 * bandeau se monter, pour qu'on puisse retirer « En promotion ». Le compte
		 * serveur l'oubliait ; le composant client, lui, le voit dans l'URL.
		 */
		it("monte le bandeau sans condition serveur — c'est lui qui décide de se taire", () => {
			render(<ProductCatalog {...makeProps()} />);
			expect(screen.getByTestId("product-filter-badges")).toBeInTheDocument();
		});
	});

	describe("search & sort furniture", () => {
		// La recherche inline et le cluster de la rangée titre sont partis
		// (2026-08-06) : l'entrée de recherche est le quick-search navbar, le tri
		// vit dans le compartiment « Trier par » du meuble de filtres.
		it("ne rend plus de cluster recherche/tri ni de barre d'outils concurrente", () => {
			render(<ProductCatalog {...makeProps()} />);
			expect(screen.queryByTestId("catalog-toolbar-inline")).not.toBeInTheDocument();
			expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
			expect(screen.queryByTestId("toolbar")).not.toBeInTheDocument();
			expect(screen.queryByTestId("select-filter")).not.toBeInTheDocument();
		});

		it("passe les options de tri au rail (compartiment « Trier par »)", () => {
			render(<ProductCatalog {...makeProps()} />);
			expect(screen.getByTestId("product-filter-rail")).toHaveAttribute("data-sort-options", "3");
		});
	});

	describe("layout", () => {
		it("does not expose a static region label that would contradict the dynamic h1", () => {
			render(<ProductCatalog {...makeProps()} />);
			expect(
				screen.queryByRole("region", { name: "Catalogue des créations" }),
			).not.toBeInTheDocument();
		});

		/**
		 * L'ancien montage exposait un `h1` `sr-only sm:hidden` via
		 * `data-testid="catalog-mobile-title"`, parce que le `PageHeader` était masqué
		 * sous 40rem — la page n'affichait alors AUCUN mot en mobile. Le contournement
		 * est parti avec la bande : il ne doit pas revenir.
		 */
		it("n'expose plus de h1 masqué en mobile — il n'y en a qu'un, et il est visible", () => {
			render(<ProductCatalog {...makeProps()} />);

			expect(screen.queryByTestId("catalog-mobile-title")).not.toBeInTheDocument();
			expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
		});

		it("fait descendre à ProductList ce que la promesse a résolu", async () => {
			await renderAsync(
				CatalogList({
					listPropsPromise: Promise.resolve(
						makeListProps({ perPage: 48, searchTerm: "collier", preferOnSale: true }),
					),
					productsPromise: makeProps().productsPromise,
				}),
			);

			const list = screen.getByTestId("product-list");
			expect(list).toHaveAttribute("data-per-page", "48");
			expect(list).toHaveAttribute("data-search-term", "collier");
			expect(list).toHaveAttribute("data-prefer-on-sale", "true");
		});
	});

	describe("JSON-LD", () => {
		it("monte l'émetteur de balisage reçu en slot", () => {
			const { container } = render(<ProductCatalog {...makeProps()} />);
			const scripts = container.querySelectorAll('script[type="application/ld+json"]');
			// UN seul script par URL : la `BreadcrumbList` et l'`ItemList` restent
			// imbriquées dans le même `CollectionPage` (@regression
			// catalogue-single-breadcrumb).
			expect(scripts).toHaveLength(1);
		});
	});
});
