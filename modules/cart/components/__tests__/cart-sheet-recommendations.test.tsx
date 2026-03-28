import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRecommendations } = vi.hoisted(() => ({
	mockRecommendations: {
		value: [] as Array<{
			id: string;
			title: string;
			slug: string;
			skus: Array<{
				priceInclTax: number;
				images: Array<{ url: string; thumbnailUrl: string | null; altText: string | null }>;
			}>;
		}>,
	},
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/modules/products/data/get-related-products", () => ({
	getRelatedProducts: async () => mockRecommendations.value,
}));

vi.mock("@/shared/components/scroll-fade", () => ({
	default: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="scroll-fade" className={className}>
			{children}
		</div>
	),
}));

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} />
	),
}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		"aria-label": ariaLabel,
	}: {
		href: string;
		children: React.ReactNode;
		"aria-label"?: string;
	}) => (
		<a href={href} aria-label={ariaLabel}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (cents: number) => `${(cents / 100).toFixed(2)} €`,
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CartSheetRecommendations } from "../cart-sheet-recommendations";

// ============================================================================
// HELPERS
// ============================================================================

function createProduct(id: string, title: string, price: number) {
	return {
		id,
		title,
		slug: title.toLowerCase().replace(/ /g, "-"),
		skus: [
			{
				priceInclTax: price,
				images: [{ url: `/img/${id}.jpg`, thumbnailUrl: null, altText: null }],
			},
		],
	};
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("CartSheetRecommendations", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRecommendations.value = [];
	});

	it("renders null when no recommendations", async () => {
		mockRecommendations.value = [];
		const jsx = await CartSheetRecommendations();
		expect(jsx).toBeNull();
	});

	it("renders section with heading when recommendations exist", async () => {
		mockRecommendations.value = [createProduct("p1", "Bague étoile", 4900)];
		const jsx = await CartSheetRecommendations();
		const { container } = render(jsx!);
		expect(container.querySelector("section")).toBeInTheDocument();
		expect(screen.getByText("Vous pourriez aimer")).toBeInTheDocument();
	});

	it("renders a link per recommendation", async () => {
		mockRecommendations.value = [
			createProduct("p1", "Bague étoile", 4900),
			createProduct("p2", "Collier lune", 7900),
		];
		const jsx = await CartSheetRecommendations();
		const { container } = render(jsx!);
		const links = container.querySelectorAll("a");
		expect(links).toHaveLength(2);
	});

	it("renders product title", async () => {
		mockRecommendations.value = [createProduct("p1", "Bague soleil", 5900)];
		const jsx = await CartSheetRecommendations();
		render(jsx!);
		expect(screen.getByText("Bague soleil")).toBeInTheDocument();
	});

	it("renders price when available", async () => {
		mockRecommendations.value = [createProduct("p1", "Bague", 4900)];
		const jsx = await CartSheetRecommendations();
		render(jsx!);
		expect(screen.getByText("49.00 €")).toBeInTheDocument();
	});

	it("renders correct href for product link", async () => {
		mockRecommendations.value = [createProduct("p1", "Bague etoile", 5000)];
		const jsx = await CartSheetRecommendations();
		const { container } = render(jsx!);
		const link = container.querySelector("a");
		expect(link).toHaveAttribute("href", "/creations/bague-etoile");
	});

	it("shows 'N/A' when product has no image", async () => {
		mockRecommendations.value = [
			{
				id: "p1",
				title: "Bague sans image",
				slug: "bague-sans-image",
				skus: [{ priceInclTax: 3000, images: [] }],
			},
		];
		const jsx = await CartSheetRecommendations();
		render(jsx!);
		expect(screen.getByText("N/A")).toBeInTheDocument();
	});
});
