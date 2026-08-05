import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/shared/components/animations/tap", () => ({
	Tap: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => <div className={className} />,
	SkeletonGroup: ({ children, label }: { children: React.ReactNode; label?: string }) => (
		<div aria-label={label}>{children}</div>
	),
	SkeletonText: ({ lines }: { lines?: number }) => <div data-lines={lines} />,
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (n: number) => `${(n / 100).toFixed(2)} €`,
}));

vi.mock("@/modules/products/constants/search-synonyms", () => ({
	SEARCH_SYNONYMS: new Map(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/shared/utils/view-transition", () => ({
	withViewTransition: (cb: () => void) => cb(),
}));

// ─── Import after mocks ──────────────────────────────────────────────────────

import { SearchResultItem, SearchResultsSkeleton } from "../search-result-item";
import type { QuickSearchProduct } from "@/modules/products/data/quick-search-products";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<QuickSearchProduct> = {}): QuickSearchProduct {
	return {
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
				images: [{ url: "/img/bague.jpg", blurDataUrl: null, altText: "Bague Lune" }],
			},
		],
		...overrides,
	};
}

afterEach(() => {
	cleanup();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("SearchResultItem", () => {
	let onSelect: ReturnType<typeof vi.fn<() => void>>;

	beforeEach(() => {
		onSelect = vi.fn();
	});

	it("renders a link to the product page", () => {
		const { container } = render(
			<SearchResultItem product={makeProduct()} query="bague" onSelect={onSelect} />,
		);
		expect(container.querySelector("a")).toHaveAttribute("href", "/creations/bague-lune");
	});

	it("link is out of the Tab order (combobox option, reached via arrow keys)", () => {
		const { container } = render(
			<SearchResultItem product={makeProduct()} query="bague" onSelect={onSelect} />,
		);
		expect(container.querySelector("a")).toHaveAttribute("tabindex", "-1");
	});

	it("renders the product title", () => {
		const { container } = render(
			<SearchResultItem product={makeProduct()} query="bague" onSelect={onSelect} />,
		);
		// Title may be split by <mark> highlight elements — check combined text content
		const titleEl = container.querySelector("p.truncate");
		expect(titleEl?.textContent).toMatch(/bague lune/i);
	});

	it("renders the price formatted in euros", () => {
		render(<SearchResultItem product={makeProduct()} query="bague" onSelect={onSelect} />);
		expect(screen.getByText("45.00 €")).toBeInTheDocument();
	});

	it("calls onSelect when the link is clicked", async () => {
		const { container } = render(
			<SearchResultItem product={makeProduct()} query="bague" onSelect={onSelect} />,
		);
		await userEvent.click(container.querySelector("a")!);
		expect(onSelect).toHaveBeenCalledOnce();
	});

	it("renders the product image when available", () => {
		const { container } = render(
			<SearchResultItem product={makeProduct()} query="bague" onSelect={onSelect} />,
		);
		const img = container.querySelector("img");
		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute("src", "/img/bague.jpg");
		expect(img).toHaveAttribute("alt", "Bague Lune");
	});

	it("renders an empty div placeholder when no image", () => {
		const product = makeProduct({
			skus: [
				{
					priceInclTax: 4500,
					compareAtPrice: null,
					inventory: 3,
					isDefault: true,
					colors: [],
					images: [],
				},
			],
		});
		const { container } = render(
			<SearchResultItem product={product} query="bague" onSelect={onSelect} />,
		);
		expect(container.querySelector("img")).not.toBeInTheDocument();
	});

	it("returns null when product has no SKUs", () => {
		const product = makeProduct({ skus: [] });
		const { container } = render(
			<SearchResultItem product={product} query="bague" onSelect={onSelect} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("shows out of stock badge when all SKUs have inventory <= 0", () => {
		const product = makeProduct({
			skus: [
				{
					priceInclTax: 4500,
					compareAtPrice: null,
					inventory: 0,
					isDefault: true,
					colors: [],
					images: [],
				},
			],
		});
		render(<SearchResultItem product={product} query="bague" onSelect={onSelect} />);
		expect(screen.getByText("Rupture")).toBeInTheDocument();
	});

	it("does not show out of stock badge when at least one SKU has inventory > 0", () => {
		render(<SearchResultItem product={makeProduct()} query="bague" onSelect={onSelect} />);
		expect(screen.queryByText("Rupture")).not.toBeInTheDocument();
	});

	it("shows compareAtPrice and discount percentage when present and higher than price", () => {
		const product = makeProduct({
			skus: [
				{
					priceInclTax: 3000,
					compareAtPrice: 4500,
					inventory: 2,
					isDefault: true,
					colors: [],
					images: [],
				},
			],
		});
		const { container } = render(
			<SearchResultItem product={product} query="" onSelect={onSelect} />,
		);
		// The compare-at price (strikethrough)
		expect(container.querySelector(".line-through")?.textContent).toBe("45.00 €");
		// The discount badge contains "-", a number, and "%" in separate nodes
		const discountBadge = container.querySelector(".bg-destructive\\/10");
		expect(discountBadge).toBeInTheDocument();
		expect(discountBadge?.textContent).toMatch(/^-\d+%$/);
	});

	it("does not show compareAtPrice when it is not higher than price", () => {
		const product = makeProduct({
			skus: [
				{
					priceInclTax: 4500,
					compareAtPrice: 4500,
					inventory: 2,
					isDefault: true,
					colors: [],
					images: [],
				},
			],
		});
		const { container } = render(
			<SearchResultItem product={product} query="" onSelect={onSelect} />,
		);
		expect(container.querySelector(".line-through")).not.toBeInTheDocument();
	});

	it("renders color swatches for each unique color", () => {
		const product = makeProduct({
			skus: [
				{
					priceInclTax: 4500,
					compareAtPrice: null,
					inventory: 2,
					isDefault: true,
					colors: [
						{ colorId: "or", position: 0, color: { slug: "or", name: "Or", hex: "#FFD700" } },
					],
					images: [],
				},
				{
					priceInclTax: 4500,
					compareAtPrice: null,
					inventory: 2,
					isDefault: false,
					colors: [
						{
							colorId: "argent",
							position: 0,
							color: { slug: "argent", name: "Argent", hex: "#C0C0C0" },
						},
					],
					images: [],
				},
			],
		});
		render(<SearchResultItem product={product} query="" onSelect={onSelect} />);
		expect(screen.getByText("Or, Argent")).toBeInTheDocument();
	});

	/**
	 * La barre de teinte est DÉCORATIVE. Elle a porté `role="img"` +
	 * `aria-label="Couleurs : …"` jusqu'à l'audit du 2026-08-05 : étant le PREMIER
	 * enfant du lien depuis le redesign du même jour, son libellé ouvrait le nom
	 * accessible de l'option — « Couleurs : Or, Argent, Bague Lune, 45,00 € ». Le
	 * titre, seul discriminant entre deux résultats, arrivait en 3ᵉ position.
	 */
	it("la barre de teinte ne participe PAS au nom accessible de l'option", () => {
		const product = makeProduct({
			skus: [
				{
					priceInclTax: 4500,
					compareAtPrice: null,
					inventory: 2,
					isDefault: true,
					colors: [
						{ colorId: "or", position: 0, color: { slug: "or", name: "Or", hex: "#FFD700" } },
					],
					images: [],
				},
			],
		});
		render(<SearchResultItem product={product} query="" onSelect={onSelect} />);

		expect(screen.queryByRole("img")).not.toBeInTheDocument();
		// Le titre ouvre l'annonce ; les teintes suivent, depuis la ligne de prix.
		const option = screen.getByRole("option");
		expect(option.textContent.startsWith("Bague Lune")).toBe(true);
		expect(option.textContent).toContain("Or");
	});

	/**
	 * Le compteur « +N » a disparu avec les pastilles de 8 px (direction
	 * « C — Le nuancier », 2026-08-05) : il comptait un reste qui n'est plus caché
	 * nulle part. La barre de teinte ne porte que les 3 premières couleurs, mais
	 * la ligne de prix les NOMME toutes — et c'est elle, depuis l'audit du même
	 * jour, qui porte le seul énoncé lisible par un lecteur d'écran.
	 */
	it("nomme TOUTES les teintes au-delà des 3 portées par la barre", () => {
		const colors = [
			{ slug: "or", name: "Or", hex: "#FFD700" },
			{ slug: "argent", name: "Argent", hex: "#C0C0C0" },
			{ slug: "rose", name: "Rose", hex: "#FFC0CB" },
			{ slug: "noir", name: "Noir", hex: "#000000" },
		];
		const product = makeProduct({
			skus: colors.map((color, i) => ({
				priceInclTax: 4500,
				compareAtPrice: null,
				inventory: 2,
				isDefault: i === 0,
				colors: [{ colorId: color.slug, position: 0, color }],
				images: [],
			})),
		});
		render(<SearchResultItem product={product} query="" onSelect={onSelect} />);

		expect(screen.getByText("Or, Argent, Rose, Noir")).toBeInTheDocument();
		expect(screen.queryByText("+1")).not.toBeInTheDocument();
	});

	it("deduplicates colors with the same slug", () => {
		const product = makeProduct({
			skus: [
				{
					priceInclTax: 4500,
					compareAtPrice: null,
					inventory: 2,
					isDefault: true,
					colors: [
						{ colorId: "or", position: 0, color: { slug: "or", name: "Or", hex: "#FFD700" } },
					],
					images: [],
				},
				{
					priceInclTax: 4500,
					compareAtPrice: null,
					inventory: 2,
					isDefault: false,
					colors: [
						{ colorId: "or", position: 0, color: { slug: "or", name: "Or", hex: "#FFD700" } },
					],
					images: [],
				},
			],
		});
		render(<SearchResultItem product={product} query="" onSelect={onSelect} />);
		// Une seule teinte unique → la ligne de prix n'en nomme qu'une.
		expect(screen.getByText("Or")).toBeInTheDocument();
	});

	it("does not render color swatches group when no colors", () => {
		render(<SearchResultItem product={makeProduct()} query="" onSelect={onSelect} />);
		expect(document.querySelector("[data-slot='tint-bar']")).toBeNull();
	});

	it("highlights matching query text in the title", () => {
		const { container } = render(
			<SearchResultItem product={makeProduct()} query="Bague" onSelect={onSelect} />,
		);
		const marks = container.querySelectorAll("mark");
		expect(marks.length).toBeGreaterThanOrEqual(1);
	});

	it("uses the non-default first SKU when no default SKU exists", () => {
		const product = makeProduct({
			skus: [
				{
					priceInclTax: 9900,
					compareAtPrice: null,
					inventory: 1,
					isDefault: false,
					colors: [],
					images: [],
				},
			],
		});
		render(<SearchResultItem product={product} query="" onSelect={onSelect} />);
		expect(screen.getByText("99.00 €")).toBeInTheDocument();
	});
});

// ─── SearchResultsSkeleton ────────────────────────────────────────────────────

describe("SearchResultsSkeleton", () => {
	it("renders the skeleton loading container", () => {
		render(<SearchResultsSkeleton />);
		expect(screen.getByLabelText(/chargement des résultats/i)).toBeInTheDocument();
	});

	it("renders 4 skeleton rows (SKELETON_ROWS = 4)", () => {
		const { container } = render(<SearchResultsSkeleton />);
		// Each row has a flex container
		const rows = container.querySelectorAll(".flex.items-center.gap-3");
		expect(rows).toHaveLength(4);
	});
});
