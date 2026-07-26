import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks
const { mockGetProductCardData } = vi.hoisted(() => ({
	mockGetProductCardData: vi.fn(),
}));

// Mock next/image — expose preload + loading + fetchPriority via data-attributes (Next 16 multi-LCP pattern)
vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		fill: _fill,
		preload,
		loading,
		fetchPriority,
		placeholder: _placeholder,
		blurDataURL: _blurDataURL,
		quality: _quality,
		sizes,
		className,
		style,
	}: {
		src: string;
		alt: string;
		fill?: boolean;
		preload?: boolean;
		loading?: string;
		fetchPriority?: string;
		placeholder?: string;
		blurDataURL?: string;
		quality?: number;
		sizes?: string;
		className?: string;
		style?: React.CSSProperties;
	}) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src={src}
			alt={alt}
			className={className}
			data-sizes={sizes}
			data-preload={preload === undefined ? undefined : String(preload)}
			data-loading={loading}
			data-fetch-priority={fetchPriority}
			data-vt={style?.viewTransitionName}
		/>
	),
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
		STOCK: {
			COMING_SOON: "Bientôt disponible",
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
		defaultSku: {
			id: "sku-1",
			isActive: true,
			isDefault: true,
			inventory: 10,
			priceInclTax: 4800,
			compareAtPrice: null,
			color: null,
			material: null,
			size: null,
		},
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
			// role="img" is preferred over "meter" for static rating displays nested in a Link
			// (the Link's aria-label already announces the score; meter would be redundant noise)
			const rating = screen.getByRole("img", { name: /Note : 4,3 sur 5, 12 avis/ });
			expect(rating).toBeInTheDocument();
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
			expect(screen.queryByRole("img", { name: /Note/ })).toBeNull();
		});

		it("does not render rating when reviewStats is null", () => {
			mockGetProductCardData.mockReturnValue(createCardData());
			render(
				<ProductCard
					product={createProduct({ reviewStats: null } as unknown as Partial<Product>)}
				/>,
			);
			expect(screen.queryByRole("img", { name: /Note/ })).toBeNull();
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
			const list = screen.getByRole("list", { name: /variantes disponibles/i });
			expect(list).toBeInTheDocument();
		});

		it("does not render color swatches for a single color", () => {
			mockGetProductCardData.mockReturnValue(
				createCardData({
					colors: [{ slug: "argent", hex: "#C0C0C0", name: "Argent", inStock: true }],
				}),
			);
			render(<ProductCard product={createProduct()} />);
			expect(screen.queryByRole("list", { name: /variantes disponibles/i })).toBeNull();
		});

		it("does not render color swatches when no colors are present", () => {
			mockGetProductCardData.mockReturnValue(createCardData({ colors: [] }));
			render(<ProductCard product={createProduct()} />);
			expect(screen.queryByRole("list", { name: /variantes disponibles/i })).toBeNull();
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

		it("article has touch-manipulation for iOS tap latency (WCAG mobile)", () => {
			mockGetProductCardData.mockReturnValue(createCardData());
			const { container } = render(<ProductCard product={createProduct()} />);
			const article = container.querySelector("article");
			expect(article?.className).toContain("touch-manipulation");
		});

		it("article is labelled by the product title", () => {
			mockGetProductCardData.mockReturnValue(createCardData());
			render(<ProductCard product={createProduct()} />);
			// The title h3 has an id used by aria-labelledby on the article
			const heading = screen.getByRole("heading", { name: "Bague Lune Argent" });
			expect(heading).toBeInTheDocument();
		});

		it("aria-describedby points to an sr-only element containing badge descriptions", () => {
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
			const { container } = render(<ProductCard product={createProduct()} />);
			const article = container.querySelector("article");
			const descId = article?.getAttribute("aria-describedby");
			expect(descId).toBeTruthy();
			const srSpan = container.querySelector(`#${descId}`);
			expect(srSpan).not.toBeNull();
			expect(srSpan?.className).toContain("sr-only");
			expect(srSpan?.textContent).toMatch(/Stock limité/);
		});
	});

	describe("noActiveSku (coming soon) state", () => {
		it("shows 'Bientôt disponible' badge when defaultSku is null", () => {
			mockGetProductCardData.mockReturnValue(
				createCardData({
					defaultSku: null,
					stockInfo: {
						status: "out_of_stock",
						totalInventory: 0,
						availableSkus: 0,
						message: "Rupture de stock",
					},
					hasValidSku: false,
				}),
			);
			render(<ProductCard product={createProduct()} />);
			const matches = screen.getAllByText("Bientôt disponible");
			expect(matches.length).toBeGreaterThanOrEqual(1);
			expect(screen.queryByText("Rupture de stock")).toBeNull();
		});

		it("hides the price when defaultSku is null", () => {
			mockGetProductCardData.mockReturnValue(
				createCardData({
					defaultSku: null,
					price: 0,
					stockInfo: {
						status: "out_of_stock",
						totalInventory: 0,
						availableSkus: 0,
						message: "Rupture de stock",
					},
					hasValidSku: false,
				}),
			);
			render(<ProductCard product={createProduct()} />);
			expect(screen.queryByTestId("product-price")).toBeNull();
		});

		it("hides discount badge when defaultSku is null even with compareAtPrice", () => {
			mockGetProductCardData.mockReturnValue(
				createCardData({
					defaultSku: null,
					price: 3600,
					compareAtPrice: 4800,
					stockInfo: {
						status: "out_of_stock",
						totalInventory: 0,
						availableSkus: 0,
						message: "Rupture de stock",
					},
					hasValidSku: false,
				}),
			);
			render(<ProductCard product={createProduct()} />);
			expect(screen.queryByTestId("badge-destructive")).toBeNull();
		});
	});

	describe("rating link to reviews section", () => {
		it("wraps the rating in a link pointing to #reviews", () => {
			mockGetProductCardData.mockReturnValue(createCardData());
			render(
				<ProductCard
					product={createProduct({
						reviewStats: { averageRating: 4.3, totalCount: 12 },
					} as unknown as Partial<Product>)}
				/>,
			);
			const link = screen.getByLabelText(/Lire les 12 avis/);
			expect(link).toBeInTheDocument();
			expect(link.getAttribute("href")).toBe("/creations/bague-lune-argent#reviews");
		});

		it("rating link aria-label includes the formatted average rating", () => {
			mockGetProductCardData.mockReturnValue(createCardData());
			render(
				<ProductCard
					product={createProduct({
						reviewStats: { averageRating: 4.3, totalCount: 12 },
					} as unknown as Partial<Product>)}
				/>,
			);
			const link = screen.getByRole("link", {
				name: "Lire les 12 avis (note moyenne : 4,3 sur 5)",
			});
			expect(link).toBeInTheDocument();
		});
	});

	describe("title clamp", () => {
		it("applies line-clamp-2 to the h3 to keep grid alignment for long titles", () => {
			mockGetProductCardData.mockReturnValue(createCardData());
			render(
				<ProductCard
					product={createProduct({
						title: "Bracelet jonc gravé prénom personnalisé en argent 925 avec finition rhodiée",
					})}
				/>,
			);
			const heading = screen.getByRole("heading", { level: 3 });
			expect(heading.className).toContain("line-clamp-2");
		});
	});

	describe("secondary image (hover effect)", () => {
		it("renders the secondary image with empty alt (decorative, WCAG H67)", () => {
			mockGetProductCardData.mockReturnValue(
				createCardData({
					secondaryImage: {
						id: "img-2",
						url: "https://example.com/secondary.jpg",
						alt: "Vue alternative",
						mediaType: "IMAGE",
					},
				}),
			);
			const { container } = render(<ProductCard product={createProduct()} />);
			const secondary = container.querySelector("img[src*='secondary.jpg']");
			expect(secondary).not.toBeNull();
			expect(secondary?.getAttribute("alt")).toBe("");
		});

		it("does not render a secondary image when none is provided", () => {
			mockGetProductCardData.mockReturnValue(createCardData({ secondaryImage: null }));
			const { container } = render(<ProductCard product={createProduct()} />);
			const images = container.querySelectorAll("img");
			expect(images.length).toBe(1);
		});
	});

	describe("viewTransitionName alignment with Gallery PDP", () => {
		// Card→PDP morph requires identical viewTransitionName on both sides.
		// Gallery PDP uses `product-${product.id}` (gallery.tsx:436) — sectionId must NOT be scoped here.
		it("emits product-${id} regardless of sectionId (matches Gallery PDP contract)", () => {
			mockGetProductCardData.mockReturnValue(createCardData());
			const { container } = render(<ProductCard product={createProduct()} sectionId="related" />);
			const primary = container.querySelector("img[src*='image.jpg']");
			expect(primary?.getAttribute("data-vt")).toBe("product-prod-1");
		});

		it("emits product-${id} when sectionId is omitted", () => {
			mockGetProductCardData.mockReturnValue(createCardData());
			const { container } = render(<ProductCard product={createProduct()} />);
			const primary = container.querySelector("img[src*='image.jpg']");
			expect(primary?.getAttribute("data-vt")).toBe("product-prod-1");
		});
	});

	describe("eager loading policy (Next 16 multi-LCP pattern)", () => {
		it("LCP candidate (index=0): preload=true + eager + fetchPriority=high", () => {
			mockGetProductCardData.mockReturnValue(createCardData());
			const { container } = render(<ProductCard product={createProduct()} index={0} />);
			const img = container.querySelector("img[src*='image.jpg']");
			expect(img).toHaveAttribute("data-preload", "true");
			expect(img).toHaveAttribute("data-loading", "eager");
			expect(img).toHaveAttribute("data-fetch-priority", "high");
		});

		// `fetchPriority="high"` est reserve a l'UNIQUE candidat LCP (index 0).
		// L'accorder aux 4 cartes above-fold faisait se disputer la bande passante
		// 4G a 4 images et retardait celle qui EST le LCP (parite collection-image-item).
		it("above-fold non-LCP (index=1-3): preload=false + eager + fetchPriority=auto (spares 4G bandwidth for the LCP image)", () => {
			mockGetProductCardData.mockReturnValue(createCardData());
			const { container } = render(<ProductCard product={createProduct()} index={2} />);
			const img = container.querySelector("img[src*='image.jpg']");
			expect(img).toHaveAttribute("data-preload", "false");
			expect(img).toHaveAttribute("data-loading", "eager");
			expect(img).toHaveAttribute("data-fetch-priority", "auto");
		});

		it("emits exactly one high-priority image across a full above-fold row", () => {
			mockGetProductCardData.mockReturnValue(createCardData());
			const { container } = render(
				<>
					{[0, 1, 2, 3].map((i) => (
						<ProductCard key={i} product={createProduct()} index={i} />
					))}
				</>,
			);
			const highs = container.querySelectorAll("img[src*='image.jpg'][data-fetch-priority='high']");
			expect(highs).toHaveLength(1);
		});

		it("below-fold (index>=4): preload=false + lazy + fetchPriority=auto", () => {
			mockGetProductCardData.mockReturnValue(createCardData());
			const { container } = render(<ProductCard product={createProduct()} index={4} />);
			const img = container.querySelector("img[src*='image.jpg']");
			expect(img).toHaveAttribute("data-preload", "false");
			expect(img).toHaveAttribute("data-loading", "lazy");
			expect(img).toHaveAttribute("data-fetch-priority", "auto");
		});

		it("disablePreload overrides index=0 (no preload, lazy, auto)", () => {
			mockGetProductCardData.mockReturnValue(createCardData());
			const { container } = render(
				<ProductCard product={createProduct()} index={0} disablePreload />,
			);
			const img = container.querySelector("img[src*='image.jpg']");
			expect(img).toHaveAttribute("data-preload", "false");
			expect(img).toHaveAttribute("data-loading", "lazy");
			expect(img).toHaveAttribute("data-fetch-priority", "auto");
		});
	});
});
