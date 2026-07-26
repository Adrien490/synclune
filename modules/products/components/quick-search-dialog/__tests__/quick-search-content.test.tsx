import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { QuickSearchResult } from "@/modules/products/data/quick-search-products";

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		onClick,
		...rest
	}: {
		children: React.ReactNode;
		href: string;
		onClick?: () => void;
		[key: string]: unknown;
	}) => (
		<a href={href} onClick={onClick} {...rest}>
			{children}
		</a>
	),
}));

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string; [key: string]: unknown }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} />
	),
}));

vi.mock("@/shared/components/scroll-fade", () => ({
	default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/animations/tap", () => ({
	Tap: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/animations/stagger", () => ({
	Stagger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div className={className}>{children}</div>
	),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (n: number) => `${(n / 100).toFixed(2)} €`,
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/shared/utils/with-view-transition", () => ({
	withViewTransition: (cb: () => void) => cb(),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: vi.fn(),
	useHaptic: () => vi.fn(),
}));

vi.mock("@/modules/products/constants/search-synonyms", () => ({
	SEARCH_SYNONYMS: new Map(),
}));

// ─── Import after mocks ──────────────────────────────────────────────────────

import { QuickSearchContent } from "../quick-search-content";
import type { QuickSearchCollection, QuickSearchProductType } from "../constants";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockProduct = {
	id: "p1",
	slug: "bague-lune",
	title: "Bague Lune",
	skus: [
		{
			priceInclTax: 4500,
			compareAtPrice: null,
			inventory: 3,
			isDefault: true,
			colors: [],
			images: [{ url: "/img/bague.jpg", blurDataUrl: null, altText: "Bague" }],
		},
	],
};

const mockProduct2 = {
	id: "p2",
	slug: "collier-etoile",
	title: "Collier Etoile",
	skus: [
		{
			priceInclTax: 6000,
			compareAtPrice: null,
			inventory: 5,
			isDefault: true,
			colors: [],
			images: [{ url: "/img/collier.jpg", blurDataUrl: null, altText: "Collier" }],
		},
	],
};

function makeResults(
	overrides: Partial<{
		products: (typeof mockProduct)[];
		suggestion: string | null;
		totalCount: number;
		rateLimited: boolean;
		error: boolean;
	}> = {},
): QuickSearchResult {
	if (overrides.rateLimited) return { kind: "rate-limited" };
	if (overrides.error) return { kind: "error" };
	return {
		kind: "success",
		products: overrides.products ?? [mockProduct, mockProduct2],
		suggestion: overrides.suggestion ?? null,
		totalCount: overrides.totalCount ?? 2,
	};
}

const mockCollections: QuickSearchCollection[] = [
	{ slug: "bagues", name: "Bagues", productCount: 10, image: null },
	{ slug: "colliers", name: "Colliers", productCount: 8, image: null },
];

const mockProductTypes: QuickSearchProductType[] = [
	{ slug: "bague", label: "Bagues" },
	{ slug: "collier", label: "Colliers" },
];

const defaultProps = {
	query: "bague",
	collections: mockCollections,
	productTypes: mockProductTypes,
	onSearch: vi.fn(),
	onClose: vi.fn(),
	onSelectResult: vi.fn(),
	onViewAllResults: vi.fn(),
	onRetry: vi.fn(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

afterEach(() => {
	cleanup();
});

describe("QuickSearchContent", () => {
	it("renders product links from results", () => {
		const { container } = render(<QuickSearchContent results={makeResults()} {...defaultProps} />);

		expect(container.querySelector('a[href="/creations/bague-lune"]')).toBeInTheDocument();
		expect(container.querySelector('a[href="/creations/collier-etoile"]')).toBeInTheDocument();
	});

	/**
	 * Le libellé ne porte plus de nombre : `totalCount` sous-compte dès que la
	 * branche floue sature ses 6 places, donc il pouvait contredire le compte de
	 * /produits?search=.
	 */
	it("affiche un CTA sans nombre quand il y a des résultats", () => {
		render(<QuickSearchContent results={makeResults({ totalCount: 5 })} {...defaultProps} />);

		expect(screen.getByRole("button", { name: /voir tous les résultats/i })).toBeInTheDocument();
		expect(screen.queryByText(/voir les 5 résultats/i)).not.toBeInTheDocument();
	});

	/**
	 * Le CTA n'était rendu que si `totalCount > 0` : à zéro résultat, le dialog
	 * n'offrait aucun chemin vers /produits?search= — donc la page de repli
	 * `SearchFallbackSuggestions` était inatteignable depuis la recherche rapide.
	 */
	it("offre une sortie vers le catalogue même à zéro résultat", async () => {
		const onViewAllResults = vi.fn();
		render(
			<QuickSearchContent
				results={makeResults({ products: [], totalCount: 0 })}
				{...defaultProps}
				onViewAllResults={onViewAllResults}
				query="zzzzz"
				collections={[]}
				productTypes={[]}
			/>,
		);

		const cta = screen.getByRole("button", { name: /dans tout le catalogue/i });
		await userEvent.click(cta);
		expect(onViewAllResults).toHaveBeenCalledOnce();
	});

	it("n'affiche aucun CTA en erreur ou rate-limit (la recherche n'a pas abouti)", () => {
		render(
			<QuickSearchContent
				results={makeResults({ products: [], totalCount: 0, error: true })}
				{...defaultProps}
				query="zzzzz"
				collections={[]}
				productTypes={[]}
			/>,
		);

		expect(
			screen.queryByRole("button", {
				name: /catalogue|dans tout le catalogue|voir tous les résultats/i,
			}),
		).not.toBeInTheDocument();
	});

	it("shows empty state message when no products, no matched nav, no suggestion", () => {
		render(
			<QuickSearchContent
				results={makeResults({ products: [], totalCount: 0 })}
				{...defaultProps}
				query="zzzzz"
				collections={[]}
				productTypes={[]}
			/>,
		);

		expect(screen.getByText(/aucun résultat pour/i)).toBeInTheDocument();
	});

	it("shows rate limited message", () => {
		render(
			<QuickSearchContent
				results={makeResults({ products: [], totalCount: 0, rateLimited: true })}
				{...defaultProps}
				query="test"
			/>,
		);

		expect(screen.getByText(/trop de requêtes/i)).toBeInTheDocument();
	});

	it("shows error message with a retry button when error flag is set", async () => {
		const onRetry = vi.fn();
		render(
			<QuickSearchContent
				results={makeResults({ products: [], totalCount: 0, error: true })}
				{...defaultProps}
				onRetry={onRetry}
				query="zzzzz"
				collections={[]}
				productTypes={[]}
			/>,
		);

		expect(screen.getByText(/temporairement indisponible/i)).toBeInTheDocument();
		expect(screen.queryByText(/aucun résultat pour/i)).not.toBeInTheDocument();

		await userEvent.click(screen.getByRole("button", { name: /réessayer/i }));
		expect(onRetry).toHaveBeenCalledOnce();
	});

	it("does not show error message when rateLimited takes precedence", () => {
		render(
			<QuickSearchContent
				results={makeResults({ products: [], totalCount: 0, error: true, rateLimited: true })}
				{...defaultProps}
				query="test"
			/>,
		);

		expect(screen.getByText(/trop de requêtes/i)).toBeInTheDocument();
		expect(screen.queryByText(/temporairement indisponible/i)).not.toBeInTheDocument();
	});

	it("shows spell suggestion", () => {
		render(
			<QuickSearchContent results={makeResults({ suggestion: "bagues" })} {...defaultProps} />,
		);

		expect(screen.getByText(/vouliez-vous dire/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /rechercher bagues/i })).toBeInTheDocument();
	});

	/**
	 * `showEmptyState` incluait `!suggestion` : dès qu'une correction existait, le
	 * message « Aucun résultat pour X » disparaissait ENTIÈREMENT et l'utilisateur
	 * ne voyait que « Vouliez-vous dire Y ? », sans savoir que sa requête n'avait
	 * rien donné.
	 */
	it("affiche l'état vide ET la suggestion, dans cet ordre", () => {
		const { container } = render(
			<QuickSearchContent
				results={makeResults({ products: [], totalCount: 0, suggestion: "bagues" })}
				{...defaultProps}
				query="bgue"
				collections={[]}
				productTypes={[]}
			/>,
		);

		const emptyTitle = screen.getByText(/aucun résultat pour/i);
		const suggestionText = screen.getByText(/vouliez-vous dire/i);
		expect(emptyTitle).toBeInTheDocument();
		expect(suggestionText).toBeInTheDocument();

		// Ordre de lecture : « rien trouvé » AVANT « voici une alternative ».
		const position = emptyTitle.compareDocumentPosition(suggestionText);
		expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(container).toBeTruthy();
	});

	it("calls onSearch when suggestion is clicked", async () => {
		const onSearch = vi.fn();
		render(
			<QuickSearchContent
				results={makeResults({ suggestion: "bagues" })}
				{...defaultProps}
				onSearch={onSearch}
			/>,
		);

		const suggestionBtn = screen.getByRole("button", { name: /rechercher bagues/i });
		await userEvent.click(suggestionBtn);

		expect(onSearch).toHaveBeenCalledWith("bagues");
	});

	it("shows matched collections section", () => {
		render(<QuickSearchContent results={makeResults()} {...defaultProps} />);

		// "bague" query matches "Bagues" collection via word-start
		expect(screen.getByRole("group", { name: /collections correspondantes/i })).toBeInTheDocument();
	});

	it("shows matched categories section", () => {
		render(<QuickSearchContent results={makeResults()} {...defaultProps} />);

		// "bague" query matches "Bagues" product type via word-start
		expect(screen.getByRole("group", { name: /categories correspondantes/i })).toBeInTheDocument();
	});

	it("announces result count for screen readers", () => {
		render(<QuickSearchContent results={makeResults({ totalCount: 3 })} {...defaultProps} />);

		const status = screen.getByRole("status");
		expect(status).toHaveTextContent("3 résultats trouvés.");
	});

	it("announces singular result for screen readers", () => {
		render(<QuickSearchContent results={makeResults({ totalCount: 1 })} {...defaultProps} />);

		const status = screen.getByRole("status");
		expect(status).toHaveTextContent("1 résultat trouvé.");
	});

	it('calls onViewAllResults when "Voir tous les résultats" button clicked', async () => {
		const onViewAllResults = vi.fn();
		render(
			<QuickSearchContent
				results={makeResults()}
				{...defaultProps}
				onViewAllResults={onViewAllResults}
			/>,
		);

		const button = screen.getByRole("button", { name: /voir tous les résultats/i });
		await userEvent.click(button);

		expect(onViewAllResults).toHaveBeenCalledOnce();
	});

	it("calls onSelectResult when a product link is clicked", async () => {
		const onSelectResult = vi.fn();
		const { container } = render(
			<QuickSearchContent
				results={makeResults()}
				{...defaultProps}
				onSelectResult={onSelectResult}
			/>,
		);

		const link = container.querySelector('a[href="/creations/bague-lune"]')!;
		await userEvent.click(link);

		expect(onSelectResult).toHaveBeenCalledOnce();
	});
});
