import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/link", () => ({
	default: ({ href, children }: { href: string; children: React.ReactNode }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("@/shared/components/animations", () => ({
	Stagger: ({
		children,
		role,
		"aria-label": ariaLabel,
		className,
		as: Container = "div",
		itemAs: ItemTag = "div",
	}: {
		children: React.ReactNode;
		role?: string;
		"aria-label"?: string;
		className?: string;
		as?: "div" | "ul" | "ol";
		itemAs?: "div" | "li";
		[key: string]: unknown;
	}) => (
		<Container role={role} aria-label={ariaLabel} className={className}>
			{React.Children.map(children, (child, index) => (
				<ItemTag key={index}>{child}</ItemTag>
			))}
		</Container>
	),
}));

vi.mock("@/shared/components/cursor-pagination", () => ({
	StorefrontPaginationBand: ({
		hasNextPage,
		hasPreviousPage,
	}: {
		hasNextPage: boolean;
		hasPreviousPage: boolean;
		currentPageSize: number;
		nextCursor?: string | null;
		prevCursor?: string | null;
	}) => (
		<nav
			data-testid="cursor-pagination"
			data-has-next={hasNextPage}
			data-has-prev={hasPreviousPage}
		/>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: (props: RenderPropMockProps) => renderPropMock("button", props),
}));

vi.mock("@/shared/components/ui/empty", () => ({
	Empty: ({
		children,
		role,
		"aria-live": ariaLive,
	}: {
		children: React.ReactNode;
		role?: string;
		"aria-live"?: "off" | "assertive" | "polite";
		className?: string;
	}) => (
		<div data-testid="empty" role={role} aria-live={ariaLive}>
			{children}
		</div>
	),
	EmptyHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyMedia: ({ children }: { children: React.ReactNode; variant?: string }) => (
		<div>{children}</div>
	),
	EmptyTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
	EmptyDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	EmptyContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/modules/collections/components/collection-chapter", () => ({
	// STUB volontaire, pas une copie de la SSOT : ce fichier n'assert rien sur
	// l'empilement, et c'est `collection-skeleton-parity.regression.test.ts` qui
	// vérifie — au SOURCE, donc à l'abri de ce mock — que l'assembleur consomme
	// bien `CHAPTER_STACK_CLASSES`. Le rendu réel du chapitre est mocké ci-dessous.
	CHAPTER_STACK_CLASSES: "stub-chapter-stack",
	CollectionChapter: ({
		slug,
		name,
		productCount,
	}: {
		slug: string;
		name: string;
		productCount?: number;
		[key: string]: unknown;
	}) => (
		<article data-testid={`collection-chapter-${slug}`}>
			<h2>{name}</h2>
			{productCount !== undefined && <span>{productCount} articles</span>}
		</article>
	),
}));

vi.mock("@/modules/collections/utils/collection-images.utils", () => ({
	extractCollectionImages: vi.fn(() => []),
}));

// La fourchette de prix ne se dérive plus du payload de la liste (elle y était
// fausse dès le 5ᵉ produit) : c'est une data fn cachée à part.
// Cf. `modules/collections/data/get-collection-price-ranges.ts`.
vi.mock("@/modules/collections/data/get-collection-price-ranges", () => ({
	getCollectionPriceRanges: vi.fn(() => Promise.resolve({})),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	FlowerIcon: () => <svg data-testid="gem-icon" />,
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CollectionChapters } from "../collection-chapters";
import type { GetCollectionsReturn } from "../../data/get-collections";

// ============================================================================
// TEST HELPERS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

const emptyPagination = {
	hasNextPage: false,
	hasPreviousPage: false,
	nextCursor: null,
	prevCursor: null,
};

function createCollection(id: string, slug: string, name: string) {
	return {
		id,
		slug,
		name,
		description: null,
		products: [],
		_count: { products: 3 },
	};
}

function makePromise(
	data: Omit<GetCollectionsReturn, "totalCount"> & { totalCount?: number },
): Promise<GetCollectionsReturn> {
	return Promise.resolve({ totalCount: data.collections.length, ...data });
}

/**
 * `CollectionChapters` est un Server Component **async** (il agrège les
 * fourchettes de prix — 2ᵉ lecture, dépendante de la 1re). Le renderer client de
 * React ne sait pas rendre une fonction async : on l'appelle et on rend son
 * résultat, comme `cart-recommendations.test.tsx`.
 */
async function renderChapters(promise: Promise<GetCollectionsReturn>) {
	const ui = await CollectionChapters({ collectionsPromise: promise });
	await act(async () => {
		render(ui);
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("CollectionChapters", () => {
	it("renders empty state when there are no collections", async () => {
		const promise = makePromise({ collections: [], pagination: emptyPagination });
		await renderChapters(promise);
		expect(screen.getByTestId("empty")).toBeInTheDocument();
		expect(screen.getByText("Aucune collection disponible")).toBeInTheDocument();
	});

	it("renders a link to /produits in the empty state", async () => {
		const promise = makePromise({ collections: [], pagination: emptyPagination });
		await renderChapters(promise);
		expect(screen.getByRole("link", { name: /Découvrir la boutique/i })).toHaveAttribute(
			"href",
			"/produits",
		);
	});

	it("renders a chapter for each collection", async () => {
		const collections = [
			createCollection("1", "bagues", "Bagues"),
			createCollection("2", "colliers", "Colliers"),
			createCollection("3", "bracelets", "Bracelets"),
		];
		const promise = makePromise({ collections: collections as never, pagination: emptyPagination });
		await renderChapters(promise);
		expect(screen.getByTestId("collection-chapter-bagues")).toBeInTheDocument();
		expect(screen.getByTestId("collection-chapter-colliers")).toBeInTheDocument();
		expect(screen.getByTestId("collection-chapter-bracelets")).toBeInTheDocument();
	});

	it("renders the chapters list with aria-label", async () => {
		const collections = [createCollection("1", "bagues", "Bagues")];
		const promise = makePromise({ collections: collections as never, pagination: emptyPagination });
		await renderChapters(promise);
		expect(screen.getByRole("list", { name: "Liste des collections" })).toBeInTheDocument();
	});

	it("renders pagination component", async () => {
		const collections = [createCollection("1", "bagues", "Bagues")];
		const pagination = { ...emptyPagination, hasNextPage: true };
		const promise = makePromise({ collections: collections as never, pagination });
		await renderChapters(promise);
		expect(screen.getByTestId("cursor-pagination")).toHaveAttribute("data-has-next", "true");
	});

	it("emits enriched ItemList JSON-LD with AggregateOffer when priceRange is set", async () => {
		const utils = await import("@/modules/collections/utils/collection-images.utils");
		const priceData = await import("@/modules/collections/data/get-collection-price-ranges");
		// `offerCount: 7` ≠ `_count.products` (3) : c'est ce qui rend l'assertion
		// capable de VOIR la source. Audit 2026-08-05 — l'`AggregateOffer` publiait
		// `offerCount: productCount`, un ensemble plus large (produits publiés) que
		// le `lowPrice`/`highPrice` qui l'accompagne (produits à SKU actif). Tant que
		// la fixture faisait coïncider les deux, le test restait vert quelle que soit
		// la source lue.
		(priceData.getCollectionPriceRanges as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
			"1": { min: 1500, max: 4500, offerCount: 7 },
		});
		(utils.extractCollectionImages as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
			{ url: "https://cdn/img.jpg", alt: "img" },
		]);

		const collections = [createCollection("1", "bagues", "Bagues")];
		const promise = makePromise({ collections: collections as never, pagination: emptyPagination });
		await renderChapters(promise);

		const script = document.querySelector('script[type="application/ld+json"]');
		expect(script).not.toBeNull();
		const ld = JSON.parse(script!.innerHTML) as {
			"@type": string;
			itemListElement: Array<{
				item?: {
					"@type": string;
					image?: string;
					offers?: {
						"@type": string;
						priceCurrency: string;
						lowPrice: string;
						highPrice: string;
						offerCount: number;
						availability: string;
					};
				};
			}>;
		};
		expect(ld["@type"]).toBe("ItemList");
		const item = ld.itemListElement[0]!.item!;
		expect(item["@type"]).toBe("CollectionPage");
		expect(item.image).toBe("https://cdn/img.jpg");
		expect(item.offers).toEqual({
			"@type": "AggregateOffer",
			priceCurrency: "EUR",
			lowPrice: "15.00",
			highPrice: "45.00",
			offerCount: 7,
			availability: "https://schema.org/InStock",
		});
	});
});
