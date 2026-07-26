import { useEffect } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: vi.fn(),
	useHaptic: () => vi.fn(),
}));

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
	Check: (props: Record<string, unknown>) => <svg data-testid="icon-check" {...props} />,
	Loader2: (props: Record<string, unknown>) => <svg data-testid="icon-loader" {...props} />,
	MoreVertical: (props: Record<string, unknown>) => (
		<svg data-testid="icon-more-vertical" {...props} />
	),
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
					mediaType: "IMAGE" as const,
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
		expect(screen.getByText(/Public/)).toBeInTheDocument();
	});

	it("ne rend AUCUNE image quand le média principal est une vidéo sans poster", () => {
		// Une URL .mp4 passée à next/image produit une vignette cassée + une
		// transformation facturée pour rien -> on retombe sur l'icône de secours.
		const videoOnly = {
			...baseProduct,
			skus: [
				{
					priceInclTax: 4500,
					inventory: 10,
					images: [
						{
							url: "https://cdn/clip.mp4",
							thumbnailUrl: null,
							blurDataUrl: null,
							mediaType: "VIDEO" as const,
							isPrimary: true,
						},
					],
				},
			],
		};
		render(<ProductMobileItem product={videoOnly} />);
		expect(screen.queryByTestId("product-image")).not.toBeInTheDocument();
		expect(screen.getByTestId("icon-package")).toBeInTheDocument();
	});

	it("utilise le poster quand le média principal est une vidéo qui en a un", () => {
		const videoWithPoster = {
			...baseProduct,
			skus: [
				{
					priceInclTax: 4500,
					inventory: 10,
					images: [
						{
							url: "https://cdn/clip.mp4",
							thumbnailUrl: "https://cdn/clip-poster.jpg",
							blurDataUrl: null,
							mediaType: "VIDEO" as const,
							isPrimary: true,
						},
					],
				},
			],
		};
		render(<ProductMobileItem product={videoWithPoster} />);
		const img = screen.getByTestId("product-image") as HTMLImageElement;
		expect(img.src).toBe("https://cdn/clip-poster.jpg");
	});

	it("affiche la fourchette de prix min-max et le stock total", () => {
		render(<ProductMobileItem product={baseProduct} />);
		expect(screen.getByText(/45,00\s*€\s*–\s*55,00\s*€/)).toBeInTheDocument();
		expect(screen.getByLabelText("15 en stock")).toBeInTheDocument();
		expect(screen.getByText("2 variantes")).toBeInTheDocument();
		expect(screen.getByText("Bagues")).toBeInTheDocument();
	});

	it("affiche « Variante unique » quand le produit n'a que la variante principale", () => {
		const single = {
			...baseProduct,
			skus: [{ priceInclTax: 4500, inventory: 10, images: [] }],
		};
		render(<ProductMobileItem product={single} />);
		expect(screen.getByText("Variante unique")).toBeInTheDocument();
	});

	it("affiche « Variante unique » quand le produit n'a aucune variante", () => {
		const empty = { ...baseProduct, skus: [] };
		render(<ProductMobileItem product={empty} />);
		expect(screen.getByText("Variante unique")).toBeInTheDocument();
	});

	it("affiche le badge stock en variant destructive si rupture", () => {
		const outOfStock = {
			...baseProduct,
			skus: [{ priceInclTax: 4500, inventory: 0, images: [] }],
		};
		render(<ProductMobileItem product={outOfStock} />);
		expect(screen.getByLabelText("Stock épuisé")).toBeInTheDocument();
	});

	it("affiche le badge stock en variant warning si stock faible (≤ 3)", () => {
		const lowStock = {
			...baseProduct,
			skus: [{ priceInclTax: 4500, inventory: 2, images: [] }],
		};
		render(<ProductMobileItem product={lowStock} />);
		expect(screen.getByLabelText("Stock faible : 2 disponible(s)")).toBeInTheDocument();
	});

	it("propage viewTransitionName card + status badge", () => {
		render(<ProductMobileItem product={baseProduct} />);
		// LongPressMenuLink mock ne propage pas la prop, donc on vérifie le badge
		const badge = screen.getByText(/Public/);
		expect(badge).toHaveStyle({ viewTransitionName: "product-status-p-1" });
	});

	it("rend l'image principale quand disponible", () => {
		// `thumbnailUrl` est le poster d'une VIDÉO (cf. schema.prisma) et vaut
		// toujours NULL sur une IMAGE : une IMAGE se rend donc via son `url`.
		render(<ProductMobileItem product={baseProduct} />);
		const img = screen.getByTestId("product-image") as HTMLImageElement;
		expect(img.src).toBe("https://cdn/img.jpg");
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

	it("navigue vers la fiche détails au tap (Link href)", () => {
		render(<ProductMobileItem product={baseProduct} />);
		const link = screen.getByLabelText("Produit Anneau doré");
		expect(link.tagName).toBe("A");
		expect(link).toHaveAttribute("href", "/admin/catalogue/produits/anneau-doré");
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

	it("expose aria-roledescription=carte produit pour annonces SR", () => {
		const { container } = render(<ProductMobileItem product={baseProduct} />);
		expect(container.querySelector('[aria-roledescription="carte produit"]')).toBeInTheDocument();
	});

	it("rend les 3 statuts (DRAFT/PUBLIC/ARCHIVED)", () => {
		const { rerender } = render(
			<ProductMobileItem product={{ ...baseProduct, status: ProductStatus.DRAFT }} />,
		);
		expect(screen.getByText(/Brouillon/)).toBeInTheDocument();

		rerender(<ProductMobileItem product={{ ...baseProduct, status: ProductStatus.ARCHIVED }} />);
		expect(screen.getByText(/Archivé/)).toBeInTheDocument();
	});
});
