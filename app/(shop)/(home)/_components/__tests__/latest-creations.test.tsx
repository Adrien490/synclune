import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

vi.mock("@/shared/components/animations", () => ({
	Fade: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	HandDrawnUnderline: () => <div data-testid="underline" />,
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		section: {
			title: { y: 20, duration: 0.5 },
			cta: { y: 10, delay: 0.1, duration: 0.4 },
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
}));

vi.mock("@/modules/products/components/cursor-glow", () => ({
	CursorGlow: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="cursor-glow">{children}</div>
	),
}));

const mockGetProducts = vi.fn();

vi.mock("@/modules/products/data/get-products", () => ({
	getProducts: (...args: unknown[]) => mockGetProducts(...args),
}));

vi.mock("@/modules/products/components/product-card", () => ({
	ProductCard: ({ product }: { product: { id: string }; [key: string]: unknown }) => (
		<div data-testid={`product-card-${product.id}`}>ProductCard</div>
	),
}));

import { LatestCreations } from "../latest-creations";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockProducts = [
	{ id: "p1", slug: "bracelet-lune", title: "Bracelet Lune" },
	{ id: "p2", slug: "collier-soleil", title: "Collier Soleil" },
	{ id: "p3", slug: "bague-etoile", title: "Bague Étoile" },
	{ id: "p4", slug: "boucles-nuage", title: "Boucles Nuage" },
];

const mockReturn = (products: typeof mockProducts) => ({
	products,
	pagination: { nextCursor: null, prevCursor: null, hasNextPage: false, hasPreviousPage: false },
	totalCount: products.length,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LatestCreations", () => {
	it("renders section with correct id and aria attributes", async () => {
		mockGetProducts.mockResolvedValue(mockReturn(mockProducts));
		render(await LatestCreations());

		const section = document.getElementById("latest-creations");
		expect(section).not.toBeNull();
		expect(section?.getAttribute("aria-labelledby")).toBe("latest-creations-title");
		expect(section?.getAttribute("aria-describedby")).toBe("latest-creations-subtitle");
	});

	it("renders h2 title 'Nouvelles créations'", async () => {
		mockGetProducts.mockResolvedValue(mockReturn(mockProducts));
		render(await LatestCreations());

		const heading = screen.getByRole("heading", { level: 2 });
		expect(heading).toBeInTheDocument();
		expect(heading.id).toBe("latest-creations-title");
		expect(heading.textContent).toContain("Nouvelles créations");
	});

	it("renders subtitle text", async () => {
		mockGetProducts.mockResolvedValue(mockReturn(mockProducts));
		render(await LatestCreations());

		const subtitle = document.getElementById("latest-creations-subtitle");
		expect(subtitle).not.toBeNull();
		expect(subtitle?.textContent).toContain("Tout juste sorties de l'atelier");
	});

	it("returns null when products array is empty", async () => {
		mockGetProducts.mockResolvedValue(mockReturn([]));
		const result = await LatestCreations();

		expect(result).toBeNull();
	});

	it("renders correct number of ProductCard components", async () => {
		mockGetProducts.mockResolvedValue(mockReturn(mockProducts));
		render(await LatestCreations());

		for (const product of mockProducts) {
			expect(screen.getByTestId(`product-card-${product.id}`)).toBeInTheDocument();
		}
	});

	it("CTA links to /produits?sortBy=created-descending", async () => {
		mockGetProducts.mockResolvedValue(mockReturn(mockProducts));
		render(await LatestCreations());

		const ctaLink = screen.getByText("Voir tous les nouveaux bijoux");
		expect(ctaLink.closest("a")).toHaveAttribute("href", "/produits?sortBy=created-descending");
	});

	it("CTA has sr-only description text", async () => {
		mockGetProducts.mockResolvedValue(mockReturn(mockProducts));
		render(await LatestCreations());

		const srOnly = screen.getByText(
			"Découvrir tous les bijoux récemment créés dans la boutique Synclune",
		);
		expect(srOnly).toBeInTheDocument();
		expect(srOnly.className).toContain("sr-only");
	});

	it("each product is wrapped in CursorGlow", async () => {
		mockGetProducts.mockResolvedValue(mockReturn(mockProducts));
		render(await LatestCreations());

		const cursorGlows = screen.getAllByTestId("cursor-glow");
		expect(cursorGlows).toHaveLength(mockProducts.length);
	});
});
