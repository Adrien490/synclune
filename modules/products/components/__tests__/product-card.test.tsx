import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks
const { mockGetProductCardData } = vi.hoisted(() => ({
	mockGetProductCardData: vi.fn(),
}));

// Mock next/image
vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		fill: _fill,
		...props
	}: {
		src: string;
		alt: string;
		fill?: boolean;
		[key: string]: unknown;
		// eslint-disable-next-line @next/next/no-img-element
	}) => <img src={src} alt={alt} {...props} />,
}));

// Mock next/link
vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
		"aria-label": ariaLabel,
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
		"aria-label"?: string;
	}) => (
		<a href={href} className={className} aria-label={ariaLabel}>
			{children}
		</a>
	),
}));

// Mock getProductCardData so we control its output per test
vi.mock("@/modules/products/services/product-display.service", () => ({
	getProductCardData: mockGetProductCardData,
}));

// Mock WishlistButton — not under test
vi.mock("@/modules/wishlist/components/wishlist-button", () => ({
	WishlistButton: () => <button aria-label="Ajouter aux favoris" />,
}));

// Mock AddToCartCardButton — not under test
vi.mock("@/modules/cart/components/add-to-cart-card-button", () => ({
	AddToCartCardButton: () => <button>Ajouter</button>,
}));

// Mock ProductPrice — renders a simple price display
vi.mock("../product-price", () => ({
	ProductPrice: ({ price, compareAtPrice }: { price: number; compareAtPrice?: number | null }) => (
		<div data-testid="product-price">
			<span>{(price / 100).toFixed(2)} €</span>
			{compareAtPrice && compareAtPrice > price && (
				<span data-testid="compare-price">{(compareAtPrice / 100).toFixed(2)} €</span>
			)}
		</div>
	),
}));

// Mock Badge
vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({
		children,
		variant,
		className,
		"aria-hidden": ariaHidden,
	}: {
		children: React.ReactNode;
		variant?: string;
		className?: string;
		"aria-hidden"?: boolean | "true" | "false";
	}) => (
		<span data-testid={`badge-${variant}`} aria-hidden={ariaHidden} className={className}>
			{children}
		</span>
	),
}));

// Mock StarIcon — simple span for testing
vi.mock("@/shared/components/icons/star-icon", () => ({
	StarIcon: () => <span data-testid="star-icon" />,
}));

// Mock cn
vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Mock IMAGE_SIZES and PRODUCT_TEXTS constants
vi.mock("@/modules/products/constants/product-texts.constants", () => ({
	IMAGE_SIZES: {
		PRODUCT_CARD: "100vw",
	},
	PRODUCT_TEXTS: {
		IMAGES: {
			DEFAULT_ALT: (title: string, productType?: string) =>
				productType ? `${productType} ${title}` : title,
		},
	},
	MAX_COLOR_SWATCHES: 5,
	ABOVE_FOLD_THRESHOLD: 4,
}));

import { ProductCard } from "../product-card";
import type { Product } from "@/modules/products/types/product.types";

afterEach(cleanup);

// ─── Fixtures ──────────────────────────────────────────────────────────────

function createProduct(overrides: Partial<Product> = {}): Product {
	return {
		id: "prod-1",
		slug: "bague-lune-argent",
		title: "Bague Lune Argent",
		status: "PUBLIC",
		type: { id: "type-1", label: "Bague", slug: "ring" },
		skus: [],
		collections: [],
		reviewStats: null,
		createdAt: new Date("2025-01-01"),
		...overrides,
	} as unknown as Product;
}

function createCardData(overrides: Partial<ReturnType<typeof mockGetProductCardData>> = {}) {
	return {
		defaultSku: null,
		price: 4800,
		compareAtPrice: null,
		stockInfo: {
			status: "in_stock" as const,
			totalInventory: 10,
			availableSkus: 1,
			message: "En stock",
		},
		primaryImage: {
			id: "img-1",
			url: "https://example.com/image.jpg",
			alt: "Bague Lune Argent",
			mediaType: "IMAGE" as const,
		},
		secondaryImage: null,
		colors: [],
		hasValidSku: true,
		...overrides,
	};
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("ProductCard", () => {
	it("renders the product title", () => {
		mockGetProductCardData.mockReturnValue(createCardData());
		render(<ProductCard product={createProduct()} />);
		expect(screen.getByText("Bague Lune Argent")).toBeInTheDocument();
	});

	it("links title to the correct product page URL", () => {
		mockGetProductCardData.mockReturnValue(createCardData());
		render(<ProductCard product={createProduct()} />);
		// The title link wraps the h3 heading; find the anchor by its href
		const link = screen.getByRole("link", { name: "Bague Lune Argent" });
		expect(link.getAttribute("href")).toBe("/creations/bague-lune-argent");
	});

	it("renders the product price via ProductPrice", () => {
		mockGetProductCardData.mockReturnValue(createCardData({ price: 4800 }));
		render(<ProductCard product={createProduct()} />);
		expect(screen.getByTestId("product-price")).toBeInTheDocument();
		expect(screen.getByTestId("product-price").textContent).toContain("48.00");
	});

	it("renders the product image with alt text", () => {
		mockGetProductCardData.mockReturnValue(
			createCardData({
				primaryImage: {
					id: "img-1",
					url: "https://example.com/bague.jpg",
					alt: "Bague Lune Argent",
					mediaType: "IMAGE",
				},
			}),
		);
		render(<ProductCard product={createProduct()} />);
		const img = screen.getByRole("img", { name: "Bague Lune Argent" });
		expect(img).toBeInTheDocument();
		expect((img as HTMLImageElement).src).toContain("bague.jpg");
	});

	describe("out-of-stock badge", () => {
		it("shows out-of-stock badge when product is out of stock", () => {
			mockGetProductCardData.mockReturnValue(
				createCardData({
					stockInfo: {
						status: "out_of_stock",
						totalInventory: 0,
						availableSkus: 0,
						message: "Rupture de stock",
					},
				}),
			);
			render(<ProductCard product={createProduct()} />);
			// Text appears twice: once in a sr-only accessibility span, once in the visible badge
			const matches = screen.getAllByText("Rupture de stock");
			expect(matches.length).toBeGreaterThanOrEqual(1);
			// The visual badge carries data-testid="badge-secondary"
			expect(screen.getByTestId("badge-secondary")).toBeInTheDocument();
		});

		it("does not show out-of-stock badge when product is in stock", () => {
			mockGetProductCardData.mockReturnValue(createCardData());
			render(<ProductCard product={createProduct()} />);
			expect(screen.queryByText("Rupture de stock")).toBeNull();
		});
	});

	describe("low stock badge", () => {
		it("shows low-stock urgency badge when stock is limited", () => {
			mockGetProductCardData.mockReturnValue(
				createCardData({
					stockInfo: {
						status: "low_stock",
						totalInventory: 2,
						availableSkus: 1,
						message: "Plus que 2 !",
					},
				}),
			);
			render(<ProductCard product={createProduct()} />);
			expect(screen.getByText("Plus que 2 !")).toBeInTheDocument();
		});
	});

	describe("discount badge", () => {
		it("shows discount percentage badge when product is on sale", () => {
			mockGetProductCardData.mockReturnValue(
				createCardData({
					price: 3600,
					compareAtPrice: 4800,
					stockInfo: {
						status: "in_stock",
						totalInventory: 5,
						availableSkus: 1,
						message: "En stock",
					},
				}),
			);
			render(<ProductCard product={createProduct()} />);
			// discount = round(1 - 3600/4800) * 100 = round(25) = 25%
			expect(screen.getByText("-25%")).toBeInTheDocument();
		});

		it("does not show discount badge when there is no compareAtPrice", () => {
			mockGetProductCardData.mockReturnValue(createCardData({ price: 4800, compareAtPrice: null }));
			render(<ProductCard product={createProduct()} />);
			expect(screen.queryByTestId("badge-destructive")).toBeNull();
		});

		it("does not show discount badge when compareAtPrice equals price", () => {
			mockGetProductCardData.mockReturnValue(createCardData({ price: 4800, compareAtPrice: 4800 }));
			render(<ProductCard product={createProduct()} />);
			expect(screen.queryByTestId("badge-destructive")).toBeNull();
		});

		it("does not show discount badge when product is out of stock", () => {
			mockGetProductCardData.mockReturnValue(
				createCardData({
					price: 3600,
					compareAtPrice: 4800,
					stockInfo: {
						status: "out_of_stock",
						totalInventory: 0,
						availableSkus: 0,
						message: "Rupture de stock",
					},
				}),
			);
			render(<ProductCard product={createProduct()} />);
			// Stock badge takes priority: discount badge must not appear
			expect(screen.queryByTestId("badge-destructive")).toBeNull();
		});
	});

	describe("rating display", () => {
		it("renders star rating when product has reviews", () => {
			mockGetProductCardData.mockReturnValue(createCardData());
			render(
				<ProductCard
					product={createProduct({
						reviewStats: { averageRating: 4.3, totalCount: 12 },
					} as unknown as Partial<Product>)}
				/>,
			);
			const meter = screen.getByRole("meter");
			expect(meter).toBeInTheDocument();
			expect(meter).toHaveAttribute("aria-valuenow", "4.3");
			expect(screen.getByText("(12)")).toBeInTheDocument();
		});

		it("does not render rating when product has no reviews", () => {
			mockGetProductCardData.mockReturnValue(createCardData());
			render(
				<ProductCard
					product={createProduct({
						reviewStats: { averageRating: 0, totalCount: 0 },
					} as unknown as Partial<Product>)}
				/>,
			);
			expect(screen.queryByRole("meter")).toBeNull();
		});

		it("does not render rating when reviewStats is null", () => {
			mockGetProductCardData.mockReturnValue(createCardData());
			render(
				<ProductCard
					product={createProduct({ reviewStats: null } as unknown as Partial<Product>)}
				/>,
			);
			expect(screen.queryByRole("meter")).toBeNull();
		});
	});

	describe("color swatches", () => {
		it("renders color swatch list when multiple colors are available", () => {
			mockGetProductCardData.mockReturnValue(
				createCardData({
					colors: [
						{ slug: "argent", hex: "#C0C0C0", name: "Argent", inStock: true },
						{ slug: "or", hex: "#FFD700", name: "Or", inStock: true },
					],
				}),
			);
			render(<ProductCard product={createProduct()} />);
			const list = screen.getByRole("list", { name: /couleurs disponibles/i });
			expect(list).toBeInTheDocument();
		});

		it("does not render color swatches for a single color", () => {
			mockGetProductCardData.mockReturnValue(
				createCardData({
					colors: [{ slug: "argent", hex: "#C0C0C0", name: "Argent", inStock: true }],
				}),
			);
			render(<ProductCard product={createProduct()} />);
			expect(screen.queryByRole("list", { name: /couleurs disponibles/i })).toBeNull();
		});

		it("does not render color swatches when no colors are present", () => {
			mockGetProductCardData.mockReturnValue(createCardData({ colors: [] }));
			render(<ProductCard product={createProduct()} />);
			expect(screen.queryByRole("list", { name: /couleurs disponibles/i })).toBeNull();
		});

		it("color swatch links point to the product page with ?color= query param", () => {
			mockGetProductCardData.mockReturnValue(
				createCardData({
					colors: [
						{ slug: "argent", hex: "#C0C0C0", name: "Argent", inStock: true },
						{ slug: "or", hex: "#FFD700", name: "Or", inStock: true },
					],
				}),
			);
			render(<ProductCard product={createProduct()} />);
			// Color swatch links use aria-label (title attribute removed per audit A1)
			const argentLink = screen.getByLabelText(/Bague Lune Argent en Argent/);
			expect(argentLink.getAttribute("href")).toBe("/creations/bague-lune-argent?color=argent");
			const orLink = screen.getByLabelText(/Bague Lune Argent en Or/);
			expect(orLink.getAttribute("href")).toBe("/creations/bague-lune-argent?color=or");
		});
	});

	describe("article landmark", () => {
		it("renders an article element", () => {
			mockGetProductCardData.mockReturnValue(createCardData());
			const { container } = render(<ProductCard product={createProduct()} />);
			const article = container.querySelector("article");
			expect(article).not.toBeNull();
		});

		it("article is labelled by the product title", () => {
			mockGetProductCardData.mockReturnValue(createCardData());
			render(<ProductCard product={createProduct()} />);
			// The title h3 has an id used by aria-labelledby on the article
			const heading = screen.getByRole("heading", { name: "Bague Lune Argent" });
			expect(heading).toBeInTheDocument();
		});
	});
});
