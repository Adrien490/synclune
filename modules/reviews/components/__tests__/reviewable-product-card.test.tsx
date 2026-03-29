import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string; fill?: boolean }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} />
	),
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("lucide-react", () => ({
	ExternalLink: () => <svg data-testid="icon-external-link" />,
	Star: () => <svg data-testid="icon-star" />,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		children,
	}: {
		children: React.ReactNode;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => <div>{children}</div>,
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="responsive-dialog-content">{children}</div>
	),
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	ResponsiveDialogTrigger: ({
		children,
		asChild,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
	}) =>
		asChild ? (
			<div data-testid="dialog-trigger">{children}</div>
		) : (
			<div data-testid="dialog-trigger">{children}</div>
		),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		size,
		className,
	}: {
		children: React.ReactNode;
		size?: string;
		className?: string;
	}) => (
		<button data-size={size} className={className}>
			{children}
		</button>
	),
}));

vi.mock("../create-review-form", () => ({
	CreateReviewForm: ({ productId }: { productId: string }) => (
		<div data-testid="create-review-form" data-product-id={productId} />
	),
}));

import { ReviewableProductCard } from "../reviewable-product-card";
import type { ReviewableProduct } from "@/modules/reviews/types/review.types";

// ============================================================================
// HELPERS
// ============================================================================

function createProduct(overrides: Partial<ReviewableProduct> = {}): ReviewableProduct {
	return {
		productId: "prod-1",
		productTitle: "Bague argent",
		productSlug: "bague-argent",
		productImage: {
			url: "https://example.com/image.jpg",
			blurDataUrl: null,
			altText: "Bague argent",
		},
		orderItemId: "order-item-1",
		orderedAt: new Date("2026-01-01"),
		deliveredAt: new Date("2026-01-10"),
		...overrides,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewableProductCard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders as an article with aria-labelledby", () => {
		render(<ReviewableProductCard product={createProduct()} />);
		const article = screen.getByRole("article");
		expect(article).toBeInTheDocument();
		expect(article.getAttribute("aria-labelledby")).toContain("reviewable-product-prod-1");
	});

	it("renders product title as a link", () => {
		render(<ReviewableProductCard product={createProduct()} />);
		const link = screen.getByRole("link", { name: /Bague argent/ });
		expect(link).toHaveAttribute("href", "/creations/bague-argent");
	});

	it("renders product image when available", () => {
		render(<ReviewableProductCard product={createProduct()} />);
		expect(screen.getByRole("img", { name: "Bague argent" })).toBeInTheDocument();
	});

	it("renders star icon placeholder when no product image", () => {
		render(<ReviewableProductCard product={createProduct({ productImage: null })} />);
		const starIcons = screen.getAllByTestId("icon-star");
		expect(starIcons.length).toBeGreaterThan(0);
	});

	it("renders delivery date", () => {
		render(
			<ReviewableProductCard product={createProduct({ deliveredAt: new Date("2026-01-10") })} />,
		);
		expect(screen.getByText(/Livré le/)).toBeInTheDocument();
	});

	it("shows 'Non disponible' when deliveredAt is null", () => {
		render(<ReviewableProductCard product={createProduct({ deliveredAt: null })} />);
		expect(screen.getByText(/Non disponible/)).toBeInTheDocument();
	});

	it("renders 'Laisser un avis' button", () => {
		render(<ReviewableProductCard product={createProduct()} />);
		expect(screen.getByText("Laisser un avis")).toBeInTheDocument();
	});

	it("renders 'Donner mon avis' dialog title", () => {
		render(<ReviewableProductCard product={createProduct()} />);
		expect(screen.getByText("Donner mon avis")).toBeInTheDocument();
	});
});
