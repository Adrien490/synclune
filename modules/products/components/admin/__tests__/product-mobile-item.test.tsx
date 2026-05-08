import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

// Flatten LongPressMenuLink to a plain anchor so we can assert href + aria-label
// without simulating touch events (covered exhaustively in the component's own
// test suite).
vi.mock("@/shared/components/long-press-menu-link", () => ({
	LongPressMenuLink: ({
		href,
		ariaLabel,
		children,
		className,
	}: {
		href: string;
		ariaLabel: string;
		children: React.ReactNode;
		className?: string;
	}) => (
		<a href={href} aria-label={ariaLabel} className={className}>
			{children}
		</a>
	),
}));

vi.mock("../../../hooks/use-product-actions", () => ({
	useProductActions: () => ({ sections: [] }),
}));

vi.mock("next/image", () => ({
	default: ({ src, alt, ...rest }: { src: string; alt: string; [key: string]: unknown }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} data-testid="product-image" {...rest} />
	),
}));

vi.mock("lucide-react", () => ({
	Package: () => <svg data-testid="icon-package" />,
}));

// Import après mocks
import { ProductStatus } from "@/app/generated/prisma/enums";
import { ProductMobileItem } from "../product-mobile-item";

// ============================================================================
// FIXTURES
// ============================================================================

const baseProduct = {
	id: "p-1",
	slug: "anneau-doré",
	title: "Anneau doré",
	status: ProductStatus.PUBLIC,
	type: { label: "Bagues" },
	skus: [
		{
			priceInclTax: 4500,
			inventory: 10,
			images: [
				{
					url: "https://cdn/img.jpg",
					thumbnailUrl: "https://cdn/img-thumb.jpg",
					blurDataUrl: "data:image/png;base64,xxx",
					isPrimary: true,
				},
			],
		},
		{
			priceInclTax: 5500,
			inventory: 5,
			images: [],
		},
	],
};

// ============================================================================
// TESTS
// ============================================================================

describe("ProductMobileItem", () => {
	afterEach(cleanup);

	it("rend le titre et le badge de statut", () => {
		render(<ProductMobileItem product={baseProduct} />);
		expect(screen.getByText("Anneau doré")).toBeInTheDocument();
		expect(screen.getByText("Public")).toBeInTheDocument();
	});

	it("affiche la fourchette de prix min-max et le stock total", () => {
		render(<ProductMobileItem product={baseProduct} />);
		expect(screen.getByText(/45,00\s*€\s*–\s*55,00\s*€/)).toBeInTheDocument();
		expect(screen.getByText("15 en stock")).toBeInTheDocument();
		expect(screen.getByText("2 variantes")).toBeInTheDocument();
		expect(screen.getByText("Bagues")).toBeInTheDocument();
	});

	it("rend l'image principale quand disponible", () => {
		render(<ProductMobileItem product={baseProduct} />);
		const img = screen.getByTestId("product-image") as HTMLImageElement;
		expect(img.src).toBe("https://cdn/img-thumb.jpg");
	});

	it("rend le placeholder Package si pas d'image principale", () => {
		const noImg = {
			...baseProduct,
			skus: baseProduct.skus.map((s) => ({ ...s, images: [] })),
		};
		render(<ProductMobileItem product={noImg} />);
		expect(screen.getByTestId("icon-package")).toBeInTheDocument();
		expect(screen.queryByTestId("product-image")).not.toBeInTheDocument();
	});

	it("navigue vers la page d'édition au tap (Link href)", () => {
		render(<ProductMobileItem product={baseProduct} />);
		const link = screen.getByLabelText("Produit Anneau doré");
		expect(link.tagName).toBe("A");
		expect(link).toHaveAttribute("href", "/admin/catalogue/produits/anneau-doré/modifier");
	});

	it("affiche un seul prix si min == max", () => {
		const samePrice = {
			...baseProduct,
			skus: [
				{ priceInclTax: 4500, inventory: 3, images: [] },
				{ priceInclTax: 4500, inventory: 2, images: [] },
			],
		};
		render(<ProductMobileItem product={samePrice} />);
		expect(screen.getByText(/^45,00\s*€$/)).toBeInTheDocument();
	});

	it("rend les 3 statuts (DRAFT/PUBLIC/ARCHIVED)", () => {
		const { rerender } = render(
			<ProductMobileItem product={{ ...baseProduct, status: ProductStatus.DRAFT }} />,
		);
		expect(screen.getByText("Brouillon")).toBeInTheDocument();

		rerender(<ProductMobileItem product={{ ...baseProduct, status: ProductStatus.ARCHIVED }} />);
		expect(screen.getByText("Archivé")).toBeInTheDocument();
	});
});
