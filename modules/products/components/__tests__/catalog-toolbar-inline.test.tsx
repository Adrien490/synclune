import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockSearchParams, mockPathname } = vi.hoisted(() => ({
	mockSearchParams: new URLSearchParams(),
	mockPathname: { value: "/produits" },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useSearchParams: () => mockSearchParams,
	usePathname: () => mockPathname.value,
}));

/**
 * Le champ a sa propre suite : ce fichier teste le CLUSTER — sa géométrie, ses
 * gates de viewport, le nom accessible de son déclencheur. Sans ce stub,
 * `SearchInput` réclame `useRouter`, absent du mock `next/navigation` ci-dessus.
 */
vi.mock("@/shared/components/search-input", () => ({
	SearchInput: ({ placeholder, className }: { placeholder?: string; className?: string }) => (
		<input data-testid="search-input" placeholder={placeholder} className={className} />
	),
}));

/**
 * Le menu de tri desktop a sa propre suite : le stub rend le déclencheur
 * (l'étiquette `ShelfBarButton` passée en enfant) tel quel — sans lui,
 * `ProductSortMenu` réclame `useRouter`.
 */
vi.mock("@/modules/products/components/product-sort-menu", () => ({
	ProductSortMenu: ({ children }: { children: ReactNode }) => (
		<div data-testid="sort-menu">{children}</div>
	),
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { CatalogToolbarInline } from "../catalog-toolbar-inline";
import type { SortOption } from "@/shared/types/sort.types";

// ============================================================================
// FIXTURES
// ============================================================================

const sortOptions: SortOption[] = [
	{ value: "created-descending", label: "Plus récents" },
	{ value: "price-ascending", label: "Prix croissant" },
];

function renderDefault() {
	return render(<CatalogToolbarInline sortOptions={sortOptions} />);
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	mockSearchParams.delete("sortBy");
	mockPathname.value = "/produits";
});

describe("CatalogToolbarInline", () => {
	it("n'existe qu'à partir de md — le wrapper est `hidden md:flex`", () => {
		const { container } = renderDefault();
		const wrapper = container.firstElementChild!;
		// Sous `md`, la recherche passe par le bouton de la barre (quick-search) :
		// le cluster ne doit rien afficher.
		expect(wrapper.className).toContain("hidden");
		expect(wrapper.className).toContain("md:flex");
	});

	it("transmet le placeholder au champ, avec un défaut bijoux", () => {
		renderDefault();
		expect(screen.getByTestId("search-input")).toHaveAttribute(
			"placeholder",
			"Rechercher un bijou…",
		);
		cleanup();

		render(
			<CatalogToolbarInline sortOptions={sortOptions} searchPlaceholder="Rechercher des bagues…" />,
		);
		expect(screen.getByTestId("search-input")).toHaveAttribute(
			"placeholder",
			"Rechercher des bagues…",
		);
	});

	it("ne monte qu'UN seul champ de recherche", () => {
		// Un corps monté deux fois partage ses `id` — et `search.page.ts` (E2E)
		// attend UN `role="searchbox"` en strict mode. La barre (`ProductSortBar`)
		// n'en monte plus : celui-ci est l'unique instance du DOM.
		renderDefault();
		expect(screen.getAllByTestId("search-input")).toHaveLength(1);
	});

	it("le déclencheur « Trier » est le meuble lg — `hidden lg:flex`", () => {
		renderDefault();
		// Entre `md` et `lg`, le tri reste le tiroir de la barre sticky : le menu
		// ancré du cluster n'apparaît qu'à `lg`, quand la barre disparaît.
		expect(screen.getByRole("button", { name: /^Trier$/ }).className).toContain("hidden lg:flex");
	});

	it("WCAG 2.5.3 : sans tri actif le nom accessible EST « Trier », avec tri il COMMENCE par lui", () => {
		renderDefault();
		expect(screen.getByRole("button", { name: /^Trier$/ })).toBeInTheDocument();
		cleanup();

		// Même SSOT (`sortTriggerLabelFor`) que le déclencheur tiroir de la barre :
		// une commande vocale « clique Trier » matche aux deux viewports.
		mockSearchParams.set("sortBy", "price-ascending");
		renderDefault();
		expect(
			screen.getByRole("button", { name: /^Trier — tri actif : Prix croissant/ }),
		).toBeInTheDocument();
	});
});
