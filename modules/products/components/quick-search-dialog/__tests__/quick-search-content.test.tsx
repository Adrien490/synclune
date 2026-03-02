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
			color: null,
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
			color: null,
			images: [{ url: "/img/collier.jpg", blurDataUrl: null, altText: "Collier" }],
		},
	],
};

function makeResults(overrides: Partial<QuickSearchResult> = {}): QuickSearchResult {
	return {
		products: [mockProduct, mockProduct2],
		suggestion: null,
		totalCount: 2,
		...overrides,
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

	it('shows "Voir les X resultats" button when totalCount > 1', () => {
		render(<QuickSearchContent results={makeResults({ totalCount: 5 })} {...defaultProps} />);

		expect(screen.getByRole("button", { name: /voir les 5 resultats/i })).toBeInTheDocument();
	});

	it('shows singular "Voir le resultat" when totalCount === 1', () => {
		render(
			<QuickSearchContent
				results={makeResults({ totalCount: 1, products: [mockProduct] })}
				{...defaultProps}
			/>,
		);

		expect(screen.getByRole("button", { name: /voir le resultat/i })).toBeInTheDocument();
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

		expect(screen.getByText(/aucun resultat pour/i)).toBeInTheDocument();
	});

	it("shows rate limited message", () => {
		render(
			<QuickSearchContent
				results={makeResults({ products: [], totalCount: 0, rateLimited: true })}
				{...defaultProps}
				query="test"
			/>,
		);

		expect(screen.getByText(/trop de requetes/i)).toBeInTheDocument();
	});

	it("shows error message when error flag is set", () => {
		render(
			<QuickSearchContent
				results={makeResults({ products: [], totalCount: 0, error: true })}
				{...defaultProps}
				query="zzzzz"
				collections={[]}
				productTypes={[]}
			/>,
		);

		expect(screen.getByText(/une erreur est survenue/i)).toBeInTheDocument();
		expect(screen.queryByText(/aucun resultat pour/i)).not.toBeInTheDocument();
	});

	it("does not show error message when rateLimited takes precedence", () => {
		render(
			<QuickSearchContent
				results={makeResults({ products: [], totalCount: 0, error: true, rateLimited: true })}
				{...defaultProps}
				query="test"
			/>,
		);

		expect(screen.getByText(/trop de requetes/i)).toBeInTheDocument();
		expect(screen.queryByText(/une erreur est survenue/i)).not.toBeInTheDocument();
	});

	it("shows spell suggestion", () => {
		render(
			<QuickSearchContent results={makeResults({ suggestion: "bagues" })} {...defaultProps} />,
		);

		expect(screen.getByText(/vouliez-vous dire/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /rechercher bagues/i })).toBeInTheDocument();
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
		expect(
			screen.getByRole("region", { name: /collections correspondantes/i }),
		).toBeInTheDocument();
	});

	it("shows matched categories section", () => {
		render(<QuickSearchContent results={makeResults()} {...defaultProps} />);

		// "bague" query matches "Bagues" product type via word-start
		expect(screen.getByRole("region", { name: /categories correspondantes/i })).toBeInTheDocument();
	});

	it("announces result count for screen readers", () => {
		render(<QuickSearchContent results={makeResults({ totalCount: 3 })} {...defaultProps} />);

		const status = screen.getByRole("status");
		expect(status).toHaveTextContent("3 resultats trouves.");
	});

	it("announces singular result for screen readers", () => {
		render(<QuickSearchContent results={makeResults({ totalCount: 1 })} {...defaultProps} />);

		const status = screen.getByRole("status");
		expect(status).toHaveTextContent("1 resultat trouve.");
	});

	it('calls onViewAllResults when "Voir les resultats" button clicked', async () => {
		const onViewAllResults = vi.fn();
		render(
			<QuickSearchContent
				results={makeResults()}
				{...defaultProps}
				onViewAllResults={onViewAllResults}
			/>,
		);

		const button = screen.getByRole("button", { name: /voir les 2 resultats/i });
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
