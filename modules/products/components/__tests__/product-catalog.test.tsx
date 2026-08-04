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

vi.mock("@/modules/products/components/product-sort-bar", () => ({
	ProductSortBar: ({
		sortOptions,
		searchPlaceholder,
	}: {
		sortOptions: { value: string; label: string }[];
		searchPlaceholder?: string;
	}) => (
		<div
			data-testid="product-sort-bar"
			data-options={sortOptions.length}
			data-search-placeholder={searchPlaceholder}
		/>
	),
}));

/**
 * Le bloc titre est un Server Component `async` (son compteur `await` la promesse
 * catalogue) : on le stube pour que ce fichier reste un test du SHELL — titre
 * calculé, props transmises, structure de grille. Le bloc lui-même a son propre
 * garde-fou statique (`@regression catalogue-mobile-h1`).
 */
vi.mock("@/modules/products/components/catalog-heading", () => ({
	CatalogHeading: ({
		title,
		activeProductType,
		searchTerm,
	}: {
		title: string;
		activeProductType?: { slug: string; label: string; description?: string | null };
		searchTerm?: string;
	}) => (
		<div
			data-testid="catalog-heading"
			data-active-type={activeProductType?.slug}
			data-search-term={searchTerm}
			data-description={activeProductType?.description ?? undefined}
		>
			<h1>{title}</h1>
		</div>
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
	PRODUCTS_SORT_LABELS: {
		"price-ascending": "Prix croissant",
		"price-descending": "Prix décroissant",
		"created-descending": "Plus récents",
	},
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { ProductCatalog, type ProductCatalogProps } from "../product-catalog";

// ============================================================================
// FIXTURES
// ============================================================================

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
		perPage: 24,
		productTypes: [],
		colors: [],
		materials: [],
		maxPriceInEuros: 500,
		activeFiltersCount: 0,
		jsonLd: { "@type": "ItemList" },
		// Forme RÉELLE : ni `/produits` ni `/produits/[type]` ne passent « Accueil »,
		// c'est le fil d'Ariane qui l'ajoute en tête (comme le faisait `PageHeader`).
		breadcrumbs: [{ label: "Créations", href: "/produits" }],
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.resetAllMocks();
});

describe("ProductCatalog", () => {
	describe("page title", () => {
		// Depuis « L'étal continue » (2026-08-05) il n'y a plus qu'UN h1 : celui du
		// bloc titre, visible à tous les viewports. L'ancien montage en rendait deux
		// (un `sr-only sm:hidden` + celui du PageHeader `hidden sm:block`).
		it('shows "Les créations" by default', () => {
			render(<ProductCatalog {...makeProps()} />);
			expect(screen.getByRole("heading", { name: "Les créations" })).toBeInTheDocument();
		});

		it("shows search term title when searchTerm is provided", () => {
			render(<ProductCatalog {...makeProps({ searchTerm: "bague" })} />);
			expect(screen.getByRole("heading", { name: 'Recherche "bague"' })).toBeInTheDocument();
		});

		it("shows product type label when activeProductType is provided", () => {
			render(
				<ProductCatalog
					{...makeProps({
						activeProductType: { slug: "bague", label: "Bagues", description: null },
					})}
				/>,
			);
			expect(screen.getByRole("heading", { name: "Bagues" })).toBeInTheDocument();
		});

		it("prioritises searchTerm title over activeProductType label", () => {
			render(
				<ProductCatalog
					{...makeProps({
						searchTerm: "argent",
						activeProductType: { slug: "bague", label: "Bagues", description: null },
					})}
				/>,
			);
			expect(screen.getByRole("heading", { name: 'Recherche "argent"' })).toBeInTheDocument();
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
	});

	describe("contexte transmis au bloc titre", () => {
		// La description n'est plus une prop de bande : c'est le bloc titre qui décide
		// quoi dire (copie d'atelier, description du type, ou contexte de recherche).
		it("passe le type actif et sa description au bloc titre", () => {
			render(
				<ProductCatalog
					{...makeProps({
						activeProductType: {
							slug: "bague",
							label: "Bagues",
							description: "Toutes mes bagues artisanales.",
						},
					})}
				/>,
			);
			const heading = screen.getByTestId("catalog-heading");
			expect(heading).toHaveAttribute("data-active-type", "bague");
			expect(heading).toHaveAttribute("data-description", "Toutes mes bagues artisanales.");
		});

		it("passe le terme recherché au bloc titre", () => {
			render(<ProductCatalog {...makeProps({ searchTerm: "argent" })} />);
			expect(screen.getByTestId("catalog-heading")).toHaveAttribute("data-search-term", "argent");
		});
	});

	describe("breadcrumbs", () => {
		it("rend « Accueil » en tête, puis les breadcrumbs passés", () => {
			render(
				<ProductCatalog
					{...makeProps({
						breadcrumbs: [
							{ label: "Créations", href: "/produits" },
							{ label: "Bagues", href: "/produits/bagues" },
						],
					})}
				/>,
			);

			// « Accueil » est ajouté par le fil d'Ariane, pas par l'appelant — même
			// contrat que l'ancien `PageHeader`. Un appelant qui le passerait aussi
			// produirait deux liens identiques.
			expect(screen.getByRole("link", { name: "Accueil" })).toHaveAttribute("href", "/");
			expect(screen.getByRole("link", { name: "Créations" })).toHaveAttribute("href", "/produits");
		});

		it("marque le dernier maillon comme page courante, sans lien", () => {
			render(
				<ProductCatalog
					{...makeProps({
						breadcrumbs: [
							{ label: "Créations", href: "/produits" },
							{ label: "Bagues", href: "/produits/bagues" },
						],
					})}
				/>,
			);

			expect(screen.queryByRole("link", { name: "Bagues" })).not.toBeInTheDocument();
			expect(screen.getByText("Bagues")).toHaveAttribute("aria-current", "page");
		});
	});

	describe("filter badges", () => {
		it("does not render filter badges when no active filters and no activeProductType", () => {
			render(<ProductCatalog {...makeProps({ activeFiltersCount: 0 })} />);
			expect(screen.queryByTestId("product-filter-badges")).not.toBeInTheDocument();
		});

		it("renders filter badges when activeFiltersCount > 0", () => {
			render(<ProductCatalog {...makeProps({ activeFiltersCount: 2 })} />);
			expect(screen.getByTestId("product-filter-badges")).toBeInTheDocument();
		});

		it("renders filter badges when activeProductType is set even with 0 active filters", () => {
			render(
				<ProductCatalog
					{...makeProps({
						activeFiltersCount: 0,
						activeProductType: { slug: "bague", label: "Bagues", description: null },
					})}
				/>,
			);
			expect(screen.getByTestId("product-filter-badges")).toBeInTheDocument();
		});

		/**
		 * @regression onsale-active-filters
		 * preferOnSale alone must flip hasActiveFilters → badges row visible so the
		 * "En promotion" filter can be removed from the grid. Before this fix,
		 * `?onSale=true` alone left activeFiltersCount=0 and hid the badges row.
		 */
		it("renders filter badges when preferOnSale is true even with 0 active filters", () => {
			render(<ProductCatalog {...makeProps({ activeFiltersCount: 0, preferOnSale: true })} />);
			expect(screen.getByTestId("product-filter-badges")).toBeInTheDocument();
		});
	});

	describe("search placeholder", () => {
		// Le champ vit désormais DANS la barre unique (`ProductSortBar`), qui le déplie
		// à partir de `md`. L'ancienne `Toolbar` desktop a disparu avec son
		// `SelectFilter`, dont le libellé bégayait « Trier par  Trier par ».
		it("uses generic jewelry placeholder by default", () => {
			render(<ProductCatalog {...makeProps()} />);
			expect(screen.getByTestId("product-sort-bar")).toHaveAttribute(
				"data-search-placeholder",
				"Rechercher des bijoux…",
			);
		});

		it("uses product type specific placeholder when activeProductType is set", () => {
			render(
				<ProductCatalog
					{...makeProps({
						activeProductType: { slug: "bague", label: "Bagues", description: null },
					})}
				/>,
			);
			expect(screen.getByTestId("product-sort-bar")).toHaveAttribute(
				"data-search-placeholder",
				"Rechercher des bagues…",
			);
		});

		it("ne rend plus de barre d'outils desktop concurrente", () => {
			render(<ProductCatalog {...makeProps()} />);
			expect(screen.queryByTestId("toolbar")).not.toBeInTheDocument();
			expect(screen.queryByTestId("select-filter")).not.toBeInTheDocument();
		});
	});

	describe("layout", () => {
		it("does not expose a static region label that would contradict the dynamic h1", () => {
			render(<ProductCatalog {...makeProps({ searchTerm: "bague" })} />);
			expect(
				screen.queryByRole("region", { name: "Catalogue des créations" }),
			).not.toBeInTheDocument();
		});

		it("renders the ProductList component", () => {
			render(<ProductCatalog {...makeProps()} />);
			expect(screen.getByTestId("product-list")).toBeInTheDocument();
		});

		it("passes perPage to ProductList", () => {
			render(<ProductCatalog {...makeProps({ perPage: 48 })} />);
			expect(screen.getByTestId("product-list")).toHaveAttribute("data-per-page", "48");
		});

		it("passes searchTerm to ProductList", () => {
			render(<ProductCatalog {...makeProps({ searchTerm: "collier" })} />);
			expect(screen.getByTestId("product-list")).toHaveAttribute("data-search-term", "collier");
		});

		it("passes preferOnSale to ProductList", () => {
			render(<ProductCatalog {...makeProps({ preferOnSale: true })} />);
			expect(screen.getByTestId("product-list")).toHaveAttribute("data-prefer-on-sale", "true");
		});

		it("renders the sort bar", () => {
			render(<ProductCatalog {...makeProps()} />);
			expect(screen.getByTestId("product-sort-bar")).toBeInTheDocument();
		});

		it("renders 3 sort options in the sort bar", () => {
			render(<ProductCatalog {...makeProps()} />);
			expect(screen.getByTestId("product-sort-bar")).toHaveAttribute("data-options", "3");
		});
	});

	describe("JSON-LD", () => {
		it("renders the JSON-LD script tag", () => {
			const { container } = render(
				<ProductCatalog
					{...makeProps({ jsonLd: { "@type": "CollectionPage", name: "Bijoux" } })}
				/>,
			);
			const scripts = container.querySelectorAll('script[type="application/ld+json"]');
			expect(scripts.length).toBeGreaterThanOrEqual(1);
		});
	});
});
