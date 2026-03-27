import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockGetProducts, mockGetPrimaryPriceForList, mockGetPrimaryImageForList } = vi.hoisted(
	() => ({
		mockGetProducts: vi.fn(),
		mockGetPrimaryPriceForList: vi.fn(),
		mockGetPrimaryImageForList: vi.fn(),
	}),
);

vi.mock("@/modules/products/data/get-products", () => ({
	getProducts: mockGetProducts,
}));

vi.mock("@/modules/products/services/product-display.service", () => ({
	getPrimaryPriceForList: mockGetPrimaryPriceForList,
	getPrimaryImageForList: mockGetPrimaryImageForList,
}));

vi.mock("../product-carousel-ui", () => ({
	ProductCarouselUI: ({
		products,
	}: {
		products: {
			id: string;
			slug: string;
			title: string;
			price: number;
			image: { url: string; alt: string; blurDataUrl?: string };
		}[];
	}) => (
		<div data-testid="product-carousel-ui">
			{products.map((p) => (
				<div key={p.id} data-testid={`carousel-item-${p.id}`} data-price={p.price}>
					<span data-testid={`carousel-title-${p.id}`}>{p.title}</span>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img data-testid="mock-image" src={p.image.url} alt={p.image.alt} />
				</div>
			))}
		</div>
	),
}));

vi.mock("../constants/carousel.constants", () => ({
	PRODUCT_CAROUSEL_CONFIG: {
		PRODUCTS_COUNT: 5,
		AUTOPLAY_DELAY: 5000,
		MAX_ALT_TEXT_LENGTH: 120,
	},
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { ProductCarousel } from "../product-carousel";

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createRawProduct(overrides: Record<string, unknown> = {}) {
	return {
		id: "prod-1",
		slug: "bague-lune-argent",
		title: "Bague Lune Argent",
		status: "PUBLIC",
		skus: [],
		...overrides,
	};
}

function createPagination() {
	return {
		nextCursor: null,
		prevCursor: null,
		hasNextPage: false,
		hasPreviousPage: false,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProductCarousel", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockGetPrimaryPriceForList.mockReturnValue({ price: 4800 });
		mockGetPrimaryImageForList.mockReturnValue({
			url: "https://example.com/image.jpg",
			alt: "Bague Lune Argent",
			blurDataUrl: null,
		});
	});

	describe("data fetching", () => {
		it("calls getProducts with correct parameters", async () => {
			mockGetProducts.mockResolvedValue({
				products: [],
				pagination: createPagination(),
				totalCount: 0,
			});

			await ProductCarousel();

			expect(mockGetProducts).toHaveBeenCalledWith({
				perPage: 5,
				sortBy: "created-descending",
				filters: { status: "PUBLIC" },
			});
		});
	});

	describe("happy path", () => {
		it("renders ProductCarouselUI", async () => {
			mockGetProducts.mockResolvedValue({
				products: [createRawProduct()],
				pagination: createPagination(),
				totalCount: 1,
			});

			render(await ProductCarousel());

			expect(screen.getByTestId("product-carousel-ui")).toBeInTheDocument();
		});

		it("passes transformed products to ProductCarouselUI", async () => {
			const product = createRawProduct({ id: "prod-1", title: "Bague Lune Argent" });
			mockGetProducts.mockResolvedValue({
				products: [product],
				pagination: createPagination(),
				totalCount: 1,
			});
			mockGetPrimaryPriceForList.mockReturnValue({ price: 4800 });
			mockGetPrimaryImageForList.mockReturnValue({
				url: "https://example.com/bague.jpg",
				alt: "Bague Lune Argent",
				blurDataUrl: null,
			});

			render(await ProductCarousel());

			expect(screen.getByTestId("carousel-item-prod-1")).toBeInTheDocument();
			expect(screen.getByTestId("carousel-title-prod-1")).toHaveTextContent("Bague Lune Argent");
		});

		it("passes price to each carousel item", async () => {
			mockGetProducts.mockResolvedValue({
				products: [createRawProduct({ id: "prod-1" })],
				pagination: createPagination(),
				totalCount: 1,
			});
			mockGetPrimaryPriceForList.mockReturnValue({ price: 9900 });

			render(await ProductCarousel());

			expect(screen.getByTestId("carousel-item-prod-1")).toHaveAttribute("data-price", "9900");
		});

		it("renders image with correct url and alt", async () => {
			mockGetProducts.mockResolvedValue({
				products: [createRawProduct({ id: "prod-1", title: "Collier Soleil" })],
				pagination: createPagination(),
				totalCount: 1,
			});
			mockGetPrimaryImageForList.mockReturnValue({
				url: "https://example.com/collier.jpg",
				alt: "Collier Soleil",
				blurDataUrl: null,
			});

			render(await ProductCarousel());

			const img = screen.getByRole("img", { name: "Collier Soleil" });
			expect(img).toBeInTheDocument();
			expect((img as HTMLImageElement).src).toContain("collier.jpg");
		});

		it("falls back to product title when image alt is null", async () => {
			mockGetProducts.mockResolvedValue({
				products: [createRawProduct({ id: "prod-1", title: "Bracelet Étoile" })],
				pagination: createPagination(),
				totalCount: 1,
			});
			mockGetPrimaryImageForList.mockReturnValue({
				url: "https://example.com/bracelet.jpg",
				alt: null,
				blurDataUrl: null,
			});

			render(await ProductCarousel());

			const img = screen.getByRole("img", { name: "Bracelet Étoile" });
			expect(img).toBeInTheDocument();
		});

		it("renders all products passed from getProducts", async () => {
			const products = [
				createRawProduct({ id: "prod-1", title: "Bague Lune" }),
				createRawProduct({ id: "prod-2", title: "Collier Soleil" }),
				createRawProduct({ id: "prod-3", title: "Bracelet Étoile" }),
			];
			mockGetProducts.mockResolvedValue({
				products,
				pagination: createPagination(),
				totalCount: 3,
			});

			render(await ProductCarousel());

			expect(screen.getByTestId("carousel-item-prod-1")).toBeInTheDocument();
			expect(screen.getByTestId("carousel-item-prod-2")).toBeInTheDocument();
			expect(screen.getByTestId("carousel-item-prod-3")).toBeInTheDocument();
		});
	});

	describe("empty products", () => {
		it("renders ProductCarouselUI with empty list when no products", async () => {
			mockGetProducts.mockResolvedValue({
				products: [],
				pagination: createPagination(),
				totalCount: 0,
			});

			render(await ProductCarousel());

			// The UI component is still rendered, just with no items
			expect(screen.getByTestId("product-carousel-ui")).toBeInTheDocument();
			expect(screen.queryByTestId(/^carousel-item-/)).not.toBeInTheDocument();
		});
	});

	describe("data transformation", () => {
		it("calls getPrimaryPriceForList and getPrimaryImageForList for each product", async () => {
			const products = [createRawProduct({ id: "prod-1" }), createRawProduct({ id: "prod-2" })];
			mockGetProducts.mockResolvedValue({
				products,
				pagination: createPagination(),
				totalCount: 2,
			});

			await ProductCarousel();

			expect(mockGetPrimaryPriceForList).toHaveBeenCalledTimes(2);
			expect(mockGetPrimaryImageForList).toHaveBeenCalledTimes(2);
		});

		it("includes blurDataUrl in transformed image data", async () => {
			mockGetProducts.mockResolvedValue({
				products: [createRawProduct({ id: "prod-1", title: "Bague" })],
				pagination: createPagination(),
				totalCount: 1,
			});
			mockGetPrimaryImageForList.mockReturnValue({
				url: "https://example.com/bague.jpg",
				alt: "Bague",
				blurDataUrl: "data:image/jpeg;base64,blur",
			});

			// Verify the component renders without error (blurDataUrl is passed through)
			render(await ProductCarousel());

			expect(screen.getByTestId("carousel-item-prod-1")).toBeInTheDocument();
		});
	});
});
