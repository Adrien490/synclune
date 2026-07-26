import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks (mirror latest-creations.test.tsx conventions)
// ---------------------------------------------------------------------------

vi.mock("@/shared/components/animations", () => ({
	Fade: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	HandDrawnUnderline: () => <div data-testid="underline" />,
	HandDrawnAccent: ({ variant }: { variant?: string }) => (
		<div data-testid="hand-drawn-accent" data-variant={variant} />
	),
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		section: {
			title: { y: 20, duration: 0.5 },
			subtitle: { y: 10, delay: 0.1, duration: 0.6 },
			cta: { y: 10, delay: 0.1, duration: 0.4 },
			underline: { delay: 0.15 },
		},
	},
}));

vi.mock("@/shared/components/section-title", () => ({
	SectionTitle: ({
		children,
		id,
	}: {
		children: React.ReactNode;
		id?: string;
		[key: string]: unknown;
	}) => <h2 id={id}>{children}</h2>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
		...props
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		[key: string]: unknown;
	}) => (asChild ? <>{children}</> : <button {...(props as object)}>{children}</button>),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		[key: string]: unknown;
	}) => (
		<a href={href} {...(props as object)}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/constants/spacing", () => ({
	SECTION_SPACING: { section: "py-16" },
	CONTAINER_CLASS: "container",
}));

vi.mock("@/modules/products/components/cursor-glow", () => ({
	CursorGlow: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="cursor-glow">{children}</div>
	),
}));

vi.mock("@/modules/products/data/get-products", () => ({}));

vi.mock("@/modules/products/components/product-card", () => ({
	ProductCard: ({
		product,
		index,
		sectionId,
		disablePreload,
	}: {
		product: { id: string };
		index?: number;
		sectionId?: string;
		disablePreload?: boolean;
		[key: string]: unknown;
	}) => (
		<div
			data-testid={`product-card-${product.id}`}
			data-index={index}
			data-section-id={sectionId}
			data-disable-preload={disablePreload ? "true" : "false"}
		>
			ProductCard
		</div>
	),
}));

import type { GetProductsReturn } from "@/modules/products/data/get-products";

import { BestRatedCreations, BEST_RATED_MIN_PRODUCTS } from "../best-rated-creations";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

type MockProduct = {
	id: string;
	slug: string;
	title: string;
	reviewStats: { averageRating: number; totalCount: number } | null;
};

const product = (id: string, totalCount: number, averageRating = 4.6): MockProduct => ({
	id,
	slug: `slug-${id}`,
	title: `Création ${id}`,
	reviewStats: { averageRating, totalCount },
});

const makePromise = (products: MockProduct[]) =>
	Promise.resolve({
		products,
		pagination: { nextCursor: null, prevCursor: null, hasNextPage: false, hasPreviousPage: false },
		totalCount: products.length,
	}) as unknown as Promise<GetProductsReturn>;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BestRatedCreations", () => {
	it("renders section with correct id and aria attributes when enough rated products", async () => {
		render(
			await BestRatedCreations({
				productsPromise: makePromise([product("p1", 3), product("p2", 5), product("p3", 2)]),
			}),
		);

		const section = document.getElementById("best-rated-creations");
		expect(section).not.toBeNull();
		expect(section?.getAttribute("aria-labelledby")).toBe("best-rated-creations-title");
		expect(section?.getAttribute("aria-describedby")).toBe("best-rated-creations-subtitle");
		expect(section?.style.viewTransitionName).toBe("best-rated-creations");
	});

	it("renders h2 title 'Les mieux notées'", async () => {
		render(
			await BestRatedCreations({
				productsPromise: makePromise([product("p1", 3), product("p2", 5)]),
			}),
		);

		const heading = screen.getByRole("heading", { level: 2 });
		expect(heading.id).toBe("best-rated-creations-title");
		expect(heading.textContent).toContain("Les mieux notées");
	});

	it("renders one ProductCard per rated product", async () => {
		const products = [product("p1", 3), product("p2", 5), product("p3", 2), product("p4", 1)];
		render(await BestRatedCreations({ productsPromise: makePromise(products) }));

		for (const p of products) {
			expect(screen.getByTestId(`product-card-${p.id}`)).toBeInTheDocument();
		}
	});

	it("filters out products with no reviews (totalCount === 0)", async () => {
		render(
			await BestRatedCreations({
				productsPromise: makePromise([
					product("rated-a", 4),
					product("rated-b", 2),
					product("unrated", 0),
				]),
			}),
		);

		expect(screen.getByTestId("product-card-rated-a")).toBeInTheDocument();
		expect(screen.getByTestId("product-card-rated-b")).toBeInTheDocument();
		expect(screen.queryByTestId("product-card-unrated")).not.toBeInTheDocument();
	});

	it("self-hides (returns null) when no products", async () => {
		const result = await BestRatedCreations({ productsPromise: makePromise([]) });
		expect(result).toBeNull();
	});

	it("self-hides when fewer than BEST_RATED_MIN_PRODUCTS rated products", async () => {
		// One rated + several unrated → below the threshold once filtered.
		const result = await BestRatedCreations({
			productsPromise: makePromise([product("p1", 5), product("p2", 0), product("p3", 0)]),
		});
		expect(BEST_RATED_MIN_PRODUCTS).toBeGreaterThan(1);
		expect(result).toBeNull();
	});

	it("CTA links to /produits?sortBy=rating-descending", async () => {
		render(
			await BestRatedCreations({
				productsPromise: makePromise([product("p1", 3), product("p2", 5)]),
			}),
		);

		// Deux instances : slot header desktop (lg) + CTA mobile sous la grille.
		const ctas = screen.getAllByText("Toutes les mieux notées");
		expect(ctas.length).toBeGreaterThanOrEqual(1);
		for (const cta of ctas) {
			expect(cta.closest("a")).toHaveAttribute("href", "/produits?sortBy=rating-descending");
		}
	});

	it("renders cards below the fold: every ProductCard is lazy (disablePreload) with sectionId='best-rated'", async () => {
		const products = [product("p1", 3), product("p2", 5), product("p3", 2)];
		render(await BestRatedCreations({ productsPromise: makePromise(products) }));

		products.forEach((p, i) => {
			const card = screen.getByTestId(`product-card-${p.id}`);
			expect(card.getAttribute("data-disable-preload")).toBe("true");
			expect(card.getAttribute("data-section-id")).toBe("best-rated");
			expect(card.getAttribute("data-index")).toBe(String(i));
		});
	});

	it("each product is wrapped in CursorGlow", async () => {
		const products = [product("p1", 3), product("p2", 5)];
		render(await BestRatedCreations({ productsPromise: makePromise(products) }));

		expect(screen.getAllByTestId("cursor-glow")).toHaveLength(products.length);
	});
});
