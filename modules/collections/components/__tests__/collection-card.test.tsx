import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

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

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: vi.fn((cents: number, _opts?: unknown) => `${(cents / 100).toFixed(2)} €`),
}));

vi.mock("../collection-images-grid", () => ({
	CollectionImagesGrid: ({
		collectionName,
		images,
	}: {
		images: unknown[];
		collectionName: string;
		isAboveFold?: boolean;
	}) => (
		<div data-testid="collection-images-grid" data-collection={collectionName}>
			{images.length} images
		</div>
	),
}));

vi.mock("@/modules/collections/constants/image-sizes.constants", () => ({
	ABOVE_FOLD_THRESHOLD: 4,
}));

vi.mock("lucide-react", () => ({
	Gem: ({ className }: { className?: string }) => (
		<svg data-testid="gem-icon" className={className} />
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CollectionCard } from "../collection-card";
import type { CollectionImage } from "../../types/collection.types";

// ============================================================================
// TEST HELPERS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

const mockImages: CollectionImage[] = [
	{ url: "https://example.com/img1.jpg", alt: "Image 1" },
	{ url: "https://example.com/img2.jpg", alt: "Image 2" },
];

function renderCard(overrides: Partial<React.ComponentProps<typeof CollectionCard>> = {}) {
	const props = {
		slug: "bagues-artisanales",
		name: "Bagues Artisanales",
		...overrides,
	};
	return render(<CollectionCard {...props} />);
}

// ============================================================================
// TESTS
// ============================================================================

describe("CollectionCard", () => {
	it("renders the collection name as heading", () => {
		renderCard();
		expect(screen.getByRole("heading", { name: "Bagues Artisanales" })).toBeInTheDocument();
	});

	it("renders a link to the collection page", () => {
		renderCard();
		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", "/collections/bagues-artisanales");
	});

	it("renders the images grid when images are provided", () => {
		renderCard({ images: mockImages });
		expect(screen.getByTestId("collection-images-grid")).toBeInTheDocument();
		expect(screen.getByTestId("collection-images-grid")).toHaveAttribute(
			"data-collection",
			"Bagues Artisanales",
		);
	});

	it("renders the gem placeholder when no images are provided", () => {
		renderCard({ images: [] });
		expect(screen.getByTestId("gem-icon")).toBeInTheDocument();
		expect(screen.getByText("Bientôt disponible")).toBeInTheDocument();
	});

	it("renders product count when provided and greater than zero", () => {
		renderCard({ productCount: 12 });
		expect(screen.getByText("12 articles")).toBeInTheDocument();
	});

	it("renders singular 'article' when product count is 1", () => {
		renderCard({ productCount: 1 });
		expect(screen.getByText("1 article")).toBeInTheDocument();
	});

	it("does not render product count when productCount is 0", () => {
		renderCard({ productCount: 0 });
		expect(screen.queryByText(/article/)).toBeNull();
	});

	it("renders description text", () => {
		renderCard({ description: "Bijoux faits à la main" });
		expect(screen.getByText("Bijoux faits à la main")).toBeInTheDocument();
	});

	it("renders price range when min and max differ", () => {
		renderCard({ priceRange: { min: 2000, max: 5000 } });
		expect(screen.getByText(/20\.00 €.*50\.00 €/)).toBeInTheDocument();
	});

	it("renders single price when min equals max", () => {
		renderCard({ priceRange: { min: 3000, max: 3000 } });
		expect(screen.getByText("30.00 €")).toBeInTheDocument();
	});

	it("renders h2 heading when headingLevel is 'h2'", () => {
		renderCard({ headingLevel: "h2" });
		expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
	});

	it("uses h3 as the default heading level", () => {
		renderCard();
		expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
	});

	it("wraps content in an article element", () => {
		const { container } = renderCard();
		expect(container.querySelector("article")).not.toBeNull();
	});

	describe("stretched-link pattern (P1.4)", () => {
		it("link aria-label matches the collection name (clean SR announcement)", () => {
			renderCard();
			const link = screen.getByRole("link", { name: "Bagues Artisanales" });
			expect(link).toBeInTheDocument();
			expect(link.getAttribute("href")).toBe("/collections/bagues-artisanales");
		});

		it("link has after:inset-0 + after:z-10 classes to cover the whole article", () => {
			renderCard();
			const link = screen.getByRole("link", { name: "Bagues Artisanales" });
			expect(link.className).toMatch(/after:inset-0/);
			expect(link.className).toMatch(/after:z-10/);
		});

		it("link has focus-ring utility applied (centralized focus style)", () => {
			renderCard();
			const link = screen.getByRole("link", { name: "Bagues Artisanales" });
			expect(link.className).toMatch(/focus-ring/);
		});
	});

	describe("title attribute (P1.6)", () => {
		it("sets title attribute on heading for tooltip on truncation", () => {
			renderCard({ name: "Collection Noël 2026 Édition Limitée" });
			const heading = screen.getByRole("heading");
			expect(heading.getAttribute("title")).toBe("Collection Noël 2026 Édition Limitée");
		});
	});

	describe("heading levels", () => {
		it("renders h4 heading when headingLevel is 'h4'", () => {
			renderCard({ headingLevel: "h4" });
			expect(screen.getByRole("heading", { level: 4 })).toBeInTheDocument();
		});
	});

	describe("productCount prominence (P2.2)", () => {
		it("renders productCount with text-sm font-medium (promoted from text-xs muted)", () => {
			renderCard({ productCount: 42 });
			const count = screen.getByText("42 articles");
			expect(count.className).toMatch(/text-sm/);
			expect(count.className).toMatch(/font-medium/);
		});
	});

	describe("description visibility (P3.3)", () => {
		it("description uses hidden sm:block (desktop-only)", () => {
			renderCard({ description: "Bijoux faits à la main" });
			const desc = screen.getByText("Bijoux faits à la main");
			expect(desc.className).toMatch(/hidden/);
			expect(desc.className).toMatch(/sm:block/);
		});
	});
});
