import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";

// Hoisted mocks
const { mockUseReducedMotion, mockScrollTo, mockSelectedScrollSnap, mockOn, mockOff } = vi.hoisted(
	() => ({
		mockUseReducedMotion: vi.fn(() => false),
		mockScrollTo: vi.fn(),
		mockSelectedScrollSnap: vi.fn(() => 0),
		mockOn: vi.fn(),
		mockOff: vi.fn(),
	}),
);

vi.mock("motion/react", () => ({
	useReducedMotion: mockUseReducedMotion,
}));

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

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
}));

vi.mock("embla-carousel-autoplay", () => ({
	default: () => ({ name: "autoplay" }),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/modules/products/constants/carousel.constants", () => ({
	PRODUCT_CAROUSEL_CONFIG: {
		PRODUCTS_COUNT: 5,
		AUTOPLAY_DELAY: 5000,
		MAX_ALT_TEXT_LENGTH: 120,
	},
}));

// Mock Carousel components — simplified pass-through rendering
vi.mock("@/shared/components/ui/carousel", () => ({
	Carousel: ({
		children,
		setApi,
	}: {
		children: React.ReactNode;
		setApi?: (api: unknown) => void;
		[key: string]: unknown;
	}) => {
		// Use useEffect to provide the mock api after initial render, avoiding infinite loop
		const React = require("react");
		React.useEffect(() => {
			if (setApi) {
				setApi({
					on: mockOn,
					off: mockOff,
					selectedScrollSnap: mockSelectedScrollSnap,
					scrollTo: mockScrollTo,
				});
			}
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, []);
		return <div data-testid="carousel">{children}</div>;
	},
	CarouselContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="carousel-content">{children}</div>
	),
	CarouselItem: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="carousel-item">{children}</div>
	),
	CarouselPrevious: ({
		"aria-label": ariaLabel,
		...props
	}: {
		"aria-label"?: string;
		[key: string]: unknown;
	}) => (
		<button aria-label={ariaLabel} {...props}>
			Prev
		</button>
	),
	CarouselNext: ({
		"aria-label": ariaLabel,
		...props
	}: {
		"aria-label"?: string;
		[key: string]: unknown;
	}) => (
		<button aria-label={ariaLabel} {...props}>
			Next
		</button>
	),
}));

vi.mock("@/shared/components/ui/tooltip", () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	TooltipTrigger: (props: RenderPropMockProps) => renderPropMock("div", props),
	TooltipContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="tooltip-content">{children}</div>
	),
}));

import { ProductCarouselUI } from "../product-carousel-ui";

afterEach(cleanup);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeProduct(id: string, overrides = {}) {
	return {
		id,
		slug: `produit-${id}`,
		title: `Produit ${id}`,
		price: 4800,
		image: {
			url: `https://example.com/image-${id}.jpg`,
			alt: `Image produit ${id}`,
		},
		...overrides,
	};
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ProductCarouselUI", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockUseReducedMotion.mockReturnValue(false);
		mockSelectedScrollSnap.mockReturnValue(0);
	});

	describe("empty state", () => {
		it("renders empty state message when products array is empty", () => {
			render(<ProductCarouselUI products={[]} />);

			expect(screen.getByText("Aucun produit disponible pour le moment")).toBeInTheDocument();
		});

		it("does not render the carousel when products array is empty", () => {
			render(<ProductCarouselUI products={[]} />);

			expect(screen.queryByTestId("carousel")).not.toBeInTheDocument();
		});

		it("renders a decorative icon in empty state", () => {
			const { container } = render(<ProductCarouselUI products={[]} />);

			const icon = container.querySelector('[aria-hidden="true"]');
			expect(icon).toBeInTheDocument();
		});
	});

	describe("with products", () => {
		it("renders the carousel region with proper accessibility attributes", () => {
			render(<ProductCarouselUI products={[makeProduct("1")]} />);

			const region = screen.getByRole("region", { name: "Carrousel de produits vedettes" });
			expect(region).toBeInTheDocument();
			expect(region).toHaveAttribute("aria-roledescription", "carrousel");
		});

		it("renders all product items", () => {
			const products = [makeProduct("1"), makeProduct("2"), makeProduct("3")];
			render(<ProductCarouselUI products={products} />);

			expect(screen.getAllByTestId("carousel-item")).toHaveLength(3);
		});

		it("renders product titles as headings", () => {
			const products = [makeProduct("1"), makeProduct("2")];
			render(<ProductCarouselUI products={products} />);

			expect(screen.getByRole("heading", { name: "Produit 1" })).toBeInTheDocument();
			expect(screen.getByRole("heading", { name: "Produit 2" })).toBeInTheDocument();
		});

		it("renders prices formatted to 2 decimal places in euros", () => {
			render(<ProductCarouselUI products={[makeProduct("1", { price: 4800 })]} />);

			// Price appears in both the slide overlay and tooltip content
			// (formatEuro : virgule française + espace insécable Intl avant €)
			const priceElements = screen.getAllByText(/48,00\s?€/);
			expect(priceElements.length).toBeGreaterThanOrEqual(1);
		});

		it("renders product images with alt text", () => {
			render(<ProductCarouselUI products={[makeProduct("1")]} />);

			expect(screen.getByRole("img", { name: "Image produit 1" })).toBeInTheDocument();
		});

		it("renders links to the correct product pages", () => {
			render(<ProductCarouselUI products={[makeProduct("1")]} />);

			const link = screen.getByRole("link");
			expect(link).toHaveAttribute("href", "/creations/produit-1");
		});

		it("renders navigation buttons with aria-labels", () => {
			render(<ProductCarouselUI products={[makeProduct("1")]} />);

			expect(screen.getByRole("button", { name: "Produit précédent" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Produit suivant" })).toBeInTheDocument();
		});

		it("renders dot navigation buttons for each product", () => {
			const products = [makeProduct("1"), makeProduct("2"), makeProduct("3")];
			render(<ProductCarouselUI products={products} />);

			expect(
				screen.getByRole("button", { name: "Aller au produit 1: Produit 1" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Aller au produit 2: Produit 2" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Aller au produit 3: Produit 3" }),
			).toBeInTheDocument();
		});

		it("has an aria-live region announcing current slide", () => {
			const { container } = render(
				<ProductCarouselUI products={[makeProduct("1"), makeProduct("2")]} />,
			);

			const liveRegion = container.querySelector('[aria-live="polite"]');
			expect(liveRegion).toBeInTheDocument();
			expect(liveRegion).toHaveAttribute("aria-atomic", "true");
		});

		it("marks the first dot as aria-current on initial render", () => {
			render(<ProductCarouselUI products={[makeProduct("1"), makeProduct("2")]} />);

			const firstDot = screen.getByRole("button", { name: "Aller au produit 1: Produit 1" });
			expect(firstDot).toHaveAttribute("aria-current", "true");
		});

		it("does not mark non-active dots as aria-current", () => {
			render(<ProductCarouselUI products={[makeProduct("1"), makeProduct("2")]} />);

			const secondDot = screen.getByRole("button", { name: "Aller au produit 2: Produit 2" });
			expect(secondDot).not.toHaveAttribute("aria-current");
		});

		it("renders product images with blur placeholder when blurDataUrl is provided", () => {
			const products = [
				makeProduct("1", { image: { url: "/img.jpg", alt: "Alt", blurDataUrl: "data:..." } }),
			];
			render(<ProductCarouselUI products={products} />);

			const img = screen.getByRole("img", { name: "Alt" });
			expect(img).toHaveAttribute("placeholder", "blur");
		});

		it("renders without blur placeholder when blurDataUrl is not provided", () => {
			render(<ProductCarouselUI products={[makeProduct("1")]} />);

			const img = screen.getByRole("img", { name: "Image produit 1" });
			expect(img).toHaveAttribute("placeholder", "empty");
		});
	});

	describe("reduced motion", () => {
		it("respects prefers-reduced-motion by using empty plugins array", () => {
			mockUseReducedMotion.mockReturnValue(true);

			// Just verify it renders without errors — autoplay plugin list is determined by hook
			render(<ProductCarouselUI products={[makeProduct("1")]} />);

			expect(screen.getByTestId("carousel")).toBeInTheDocument();
		});
	});

	describe("dot navigation interaction", () => {
		it("calls api.scrollTo when a dot button is clicked", () => {
			const products = [makeProduct("1"), makeProduct("2"), makeProduct("3")];
			render(<ProductCarouselUI products={products} />);

			const secondDot = screen.getByRole("button", { name: "Aller au produit 2: Produit 2" });
			fireEvent.click(secondDot);

			expect(mockScrollTo).toHaveBeenCalledWith(1);
		});

		it("calls api.scrollTo with index 0 when first dot is clicked", () => {
			const products = [makeProduct("1"), makeProduct("2")];
			render(<ProductCarouselUI products={products} />);

			const firstDot = screen.getByRole("button", { name: "Aller au produit 1: Produit 1" });
			fireEvent.click(firstDot);

			expect(mockScrollTo).toHaveBeenCalledWith(0);
		});
	});

	describe("carousel region accessibility", () => {
		it("carousel region has tabIndex=0 for keyboard navigation", () => {
			render(<ProductCarouselUI products={[makeProduct("1")]} />);

			const region = screen.getByRole("region", { name: "Carrousel de produits vedettes" });
			expect(region).toHaveAttribute("tabindex", "0");
		});
	});
});
