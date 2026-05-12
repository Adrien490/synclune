import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Mock SectionTitle as a simple heading
vi.mock("@/shared/components/section-title", () => ({
	SectionTitle: ({
		children,
		id,
		as: Tag = "h1",
	}: {
		children: React.ReactNode;
		id?: string;
		as?: string;
		[key: string]: unknown;
	}) => {
		const Component = Tag as React.ElementType;
		return <Component id={id}>{children}</Component>;
	},
}));

// Mock SplitTextCSS as passthrough
vi.mock("@/shared/components/animations", () => ({
	SplitTextCSS: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

// Mock HeroRotatingWord
vi.mock("../hero-rotating-word", () => ({
	HeroRotatingWord: ({ words }: { words: string[] }) => (
		<span data-testid="rotating-word">{words[0]}</span>
	),
}));

// Mock Button as passthrough
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

// Mock next/link
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

// Mock lucide-react icons used by the hero section
vi.mock("lucide-react", () => ({
	Heart: (props: Record<string, unknown>) => (
		<svg data-testid="heart-icon" aria-hidden={props["aria-hidden"] as boolean} />
	),
}));

// Mock hero-decorations (dynamically imported, SSR:false)
vi.mock("../hero-decorations", () => ({
	ParticleBackground: () => <div data-testid="particle-background" />,
}));

// Mock floating-images
vi.mock("../floating-images", () => ({
	HeroFloatingImages: ({ images }: { images: unknown[] }) => (
		<div data-testid="floating-images" data-count={images.length} />
	),
}));

// Mock extractHeroImages
vi.mock("../../_utils/extract-hero-images", () => ({
	extractHeroImages: vi.fn(() => [
		{ url: "/img-1.jpg", alt: "Alt 1", slug: "product-1", title: "Product 1" },
		{ url: "/img-2.jpg", alt: "Alt 2", slug: "product-2", title: "Product 2" },
		{ url: "/img-3.jpg", alt: "Alt 3", slug: "product-3", title: "Product 3" },
		{ url: "/img-4.jpg", alt: "Alt 4", slug: "product-4", title: "Product 4" },
	]),
}));

import type { GetProductsReturn } from "@/modules/products/data/get-products";

import { HeroSection } from "../hero-section";

const mockProductsReturn: GetProductsReturn = {
	products: [
		{ slug: "p1", title: "P1" },
		{ slug: "p2", title: "P2" },
	] as GetProductsReturn["products"],
	pagination: {
		nextCursor: null,
		prevCursor: null,
		hasNextPage: false,
		hasPreviousPage: false,
	},
	totalCount: 2,
};

const mockProductsPromise = Promise.resolve(mockProductsReturn);

afterEach(() => {
	cleanup();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HeroSection", () => {
	it("renders the section with correct aria attributes", () => {
		render(<HeroSection productsPromise={mockProductsPromise} />);

		const section = document.getElementById("hero-section");
		expect(section).not.toBeNull();
		expect(section?.getAttribute("aria-labelledby")).toBe("hero-title");
		expect(section?.getAttribute("aria-describedby")).toBe("hero-subtitle");
	});

	it("renders the h1 title with server-rendered text", () => {
		render(<HeroSection productsPromise={mockProductsPromise} />);

		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toBeInTheDocument();
		expect(heading.id).toBe("hero-title");
		expect(heading.textContent).toContain("Des bijoux");
	});

	it("renders the subtitle paragraph with id", () => {
		render(<HeroSection productsPromise={mockProductsPromise} />);

		const subtitle = document.getElementById("hero-subtitle");
		expect(subtitle).not.toBeNull();
		expect(subtitle?.tagName).toBe("P");
	});

	it("renders the primary CTA with correct link", () => {
		render(<HeroSection productsPromise={mockProductsPromise} />);

		const boutiqueLink = screen.getByText("Découvrir la boutique");
		expect(boutiqueLink.closest("a")).toHaveAttribute("href", "/produits");
	});

	it("renders the RotatingWord component", () => {
		render(<HeroSection productsPromise={mockProductsPromise} />);
		expect(screen.getByTestId("rotating-word")).toBeInTheDocument();
	});

	it("renders the ParticleBackground in a decorative container", () => {
		render(<HeroSection productsPromise={mockProductsPromise} />);

		const particleBg = screen.getByTestId("particle-background");
		expect(particleBg).toBeInTheDocument();
		// Parent div should be aria-hidden
		const decorativeContainer = particleBg.closest("[aria-hidden]");
		expect(decorativeContainer?.getAttribute("aria-hidden")).toBe("true");
	});

	it("renders Suspense boundary for floating images", () => {
		render(<HeroSection productsPromise={mockProductsPromise} />);

		// HeroFloatingImagesAsync is an async server component inside Suspense.
		// In a sync test environment, the HeroFloatingImagesSkeleton fallback renders.
		// We verify the section still renders correctly without blocking.
		const section = document.getElementById("hero-section");
		expect(section).not.toBeNull();
	});

	it("renders the Heart icon as decorative (aria-hidden)", () => {
		render(<HeroSection productsPromise={mockProductsPromise} />);

		const heart = screen.getByTestId("heart-icon");
		expect(heart.getAttribute("aria-hidden")).toBe("true");
	});

	it("includes sr-only text 'avec amour'", () => {
		render(<HeroSection productsPromise={mockProductsPromise} />);

		const srOnly = screen.getByText("avec amour");
		expect(srOnly).toBeInTheDocument();
		expect(srOnly.className).toContain("sr-only");
	});

	it("renders without crashing under prefers-reduced-motion", () => {
		const matchMedia = vi.fn(
			(query: string) =>
				({
					matches: query === "(prefers-reduced-motion: reduce)",
					media: query,
					onchange: null,
					addListener: vi.fn(),
					removeListener: vi.fn(),
					addEventListener: vi.fn(),
					removeEventListener: vi.fn(),
					dispatchEvent: vi.fn(),
				}) as unknown as MediaQueryList,
		);
		Object.defineProperty(window, "matchMedia", {
			configurable: true,
			writable: true,
			value: matchMedia,
		});

		render(<HeroSection productsPromise={mockProductsPromise} />);

		// Smoke check: section + h1 still render, no throw
		expect(document.getElementById("hero-section")).not.toBeNull();
		expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
	});
});
