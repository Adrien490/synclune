import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Module mocks — seuls les îlots client et les primitives Next sont mockés :
// c'est le rendu RÉEL de ProductCard (et de getProductCardData) qu'on teste.
// Tous les autres tests du module mockent la carte entière ; celui-ci est le
// premier à couvrir son DOM (audit ProductCard 2026-08-03).
// ---------------------------------------------------------------------------

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} />
	),
}));

vi.mock("next/link", () => ({
	default: ({ href, children, ...rest }: React.ComponentProps<"a"> & { href: string }) => (
		<a href={href} {...rest}>
			{children}
		</a>
	),
}));

vi.mock("@/modules/wishlist/components/wishlist-button", () => ({
	WishlistButton: ({ productId }: { productId: string }) => (
		<button data-testid="wishlist-button" data-product-id={productId} />
	),
}));

vi.mock("@/modules/cart/components/add-to-cart-card-button", () => ({
	AddToCartCardButton: ({ variant }: { variant?: "icon" | "mobile-full" }) => (
		<button data-testid="add-to-cart" data-variant={variant ?? "icon"} />
	),
}));

import { ProductCard } from "../product-card";
import type { ProductCarouselItem } from "@/modules/products/types/product.types";

// ---------------------------------------------------------------------------
// Fixtures — mêmes formes que product-display.service.test.ts
// ---------------------------------------------------------------------------

function createSku(overrides: Record<string, unknown> = {}) {
	return {
		id: "sku-1",
		isActive: true,
		isDefault: true,
		inventory: 10,
		priceInclTax: 2500,
		compareAtPrice: null,
		size: null,
		colors: [
			{
				colorId: "color-1",
				position: 0,
				color: { id: "color-1", slug: "gold", hex: "#FFD700", name: "Or" },
			},
		],
		materials: [
			{
				materialId: "material-1",
				position: 0,
				material: { id: "material-1", name: "Argent 925" },
			},
		],
		images: [
			{
				id: "img-1",
				url: "/image.jpg",
				thumbnailUrl: "/image-thumb.jpg",
				altText: null,
				isPrimary: true,
				mediaType: "IMAGE",
				blurDataUrl: null,
				width: null,
				height: null,
			},
		],
		...overrides,
	};
}

function createProduct(
	overrides: Record<string, unknown> = {},
	skus: unknown[] = [createSku()],
): ProductCarouselItem {
	return {
		id: "product-1",
		slug: "test-product",
		title: "Test Product",
		status: "PUBLIC",
		skus,
		type: { label: "Bague" },
		...overrides,
	} as unknown as ProductCarouselItem;
}

function getDescription(article: HTMLElement): string {
	const descId = article.getAttribute("aria-describedby");
	if (!descId) return "";
	return document.getElementById(descId)?.textContent ?? "";
}

afterEach(() => {
	cleanup();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProductCard — rendu réel", () => {
	describe("câblage ARIA", () => {
		it("relie l'article à son titre via aria-labelledby (avec sectionId)", () => {
			render(<ProductCard product={createProduct()} index={0} sectionId="catalog" />);

			const article = screen.getByRole("article");
			const labelId = article.getAttribute("aria-labelledby");
			expect(labelId).toBe("product-title-catalog-product-1");

			const heading = document.getElementById(labelId!);
			expect(heading).not.toBeNull();
			expect(heading!.textContent).toBe("Test Product");
		});

		it("n'a pas d'aria-describedby quand aucun badge n'est affiché", () => {
			render(<ProductCard product={createProduct()} index={0} />);

			expect(screen.getByRole("article")).not.toHaveAttribute("aria-describedby");
		});
	});

	describe("lien produit (stretched link)", () => {
		it("pointe vers la PDP avec le titre comme nom accessible", () => {
			render(<ProductCard product={createProduct()} index={0} />);

			const link = screen.getByRole("link", { name: "Test Product" });
			expect(link).toHaveAttribute("href", "/creations/test-product");
		});
	});

	describe("légende", () => {
		it("affiche l'eyebrow type produit, la matière et un alt descriptif", () => {
			render(<ProductCard product={createProduct()} index={0} />);

			expect(screen.getByText("Bague · fait main")).toBeInTheDocument();
			expect(screen.getByText("Argent 925")).toBeInTheDocument();
			// altText null → le service génère « titre - matière »
			expect(screen.getByAltText("Test Product - Argent 925")).toBeInTheDocument();
		});

		it("retombe sur « Fait main » sans type produit", () => {
			render(<ProductCard product={createProduct({ type: null })} index={0} />);

			expect(screen.getByText("Fait main")).toBeInTheDocument();
		});
	});

	describe("états de stock", () => {
		it("rupture totale : badge « Rupture de stock », aucun CTA panier, description SR", () => {
			const product = createProduct({}, [createSku({ inventory: 0 })]);
			render(<ProductCard product={product} index={0} />);

			expect(screen.getAllByText("Rupture de stock").length).toBeGreaterThan(0);
			expect(screen.queryAllByTestId("add-to-cart")).toHaveLength(0);
			expect(getDescription(screen.getByRole("article"))).toContain("Rupture de stock");
		});

		it("urgence : badge et texte SR basés sur le SKU AFFICHÉ, pas l'agrégat", () => {
			// SKU affiché à 2, l'autre variante à 1 : l'agrégat (3) mentirait
			const product = createProduct({}, [
				createSku({ id: "sku-1", inventory: 2 }),
				createSku({ id: "sku-2", inventory: 1, isDefault: false }),
			]);
			render(<ProductCard product={product} index={0} />);

			expect(screen.getByText("Plus que 2 !")).toBeInTheDocument();
			expect(getDescription(screen.getByRole("article"))).toContain(
				"plus que 2 exemplaires disponibles",
			);
		});

		it("produit sans variante : badge « Bientôt disponible », ni prix ni CTA", () => {
			const product = createProduct({}, []);
			render(<ProductCard product={product} index={0} />);

			// Présent deux fois : badge visuel (aria-hidden) + description sr-only
			expect(screen.getAllByText("Bientôt disponible").length).toBeGreaterThan(0);
			expect(screen.queryAllByTestId("add-to-cart")).toHaveLength(0);
			// Pas de SKU → pas de prix (le 0,00 € par défaut ne doit jamais s'afficher)
			expect(screen.queryByText(/0,00/)).not.toBeInTheDocument();
		});

		it("en stock : les deux CTA panier (desktop + mobile) sont rendus", () => {
			render(<ProductCard product={createProduct()} index={0} />);

			const ctas = screen.getAllByTestId("add-to-cart");
			expect(ctas.map((c) => c.getAttribute("data-variant")).sort()).toEqual([
				"icon",
				"mobile-full",
			]);
		});
	});

	describe("promotion", () => {
		it("annonce la remise en SR et rend la pastille -X% aria-hidden", () => {
			const product = createProduct({}, [createSku({ priceInclTax: 2000, compareAtPrice: 3000 })]);
			render(<ProductCard product={product} index={0} />);

			expect(getDescription(screen.getByRole("article"))).toContain("Promotion : -33%");

			const pill = screen.getByText("-33%");
			expect(pill).toHaveAttribute("aria-hidden", "true");
		});
	});

	describe("pastilles couleur", () => {
		it("rend une liste explicite (role=list) dès 2 couleurs", () => {
			const secondColorSku = createSku({
				id: "sku-2",
				isDefault: false,
				colors: [
					{
						colorId: "color-2",
						position: 0,
						color: { id: "color-2", slug: "rose", hex: "#FFC0CB", name: "Rose" },
					},
				],
			});
			const product = createProduct({}, [createSku(), secondColorSku]);
			render(<ProductCard product={product} index={0} />);

			const list = screen.getByRole("list", {
				name: "2 variantes disponibles pour Test Product",
			});
			expect(within(list).getAllByRole("link")).toHaveLength(2);
		});
	});

	describe("wishlist", () => {
		it("transmet l'id produit au bouton favoris", () => {
			render(<ProductCard product={createProduct()} index={0} />);

			expect(screen.getByTestId("wishlist-button")).toHaveAttribute("data-product-id", "product-1");
		});
	});
});
