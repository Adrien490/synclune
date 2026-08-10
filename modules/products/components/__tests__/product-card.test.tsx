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
		position: 0,
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

			expect(screen.getByText("Bague")).toBeInTheDocument();
			expect(screen.getByText("Argent 925")).toBeInTheDocument();
			// altText null → le service génère « titre - matière »
			expect(screen.getByAltText("Test Product - Argent 925")).toBeInTheDocument();
		});

		it("retombe sur « Création » sans type produit", () => {
			render(<ProductCard product={createProduct({ type: null })} index={0} />);

			expect(screen.getByText("Création")).toBeInTheDocument();
		});

		/**
		 * L'eyebrow disait « Bague · fait main ». Retiré le 2026-08-05 : toute la
		 * boutique est faite main, donc dans une grille la mention ne discrimine rien
		 * — elle se répétait 12 fois sur la ligne la plus contrainte de la carte, et
		 * autant pour un lecteur d'écran. `catalog-heading.tsx` la porte une fois.
		 */
		it("ne répète PAS « fait main » sur chaque carte", () => {
			const { container } = render(<ProductCard product={createProduct()} index={0} />);

			expect(container.textContent).not.toMatch(/fait main/i);
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
				createSku({ id: "sku-2", inventory: 1, position: 1 }),
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

		/**
		 * @regression default-sku-sold-out — audit ProductCard 2026-08-08.
		 * Le défaut épuisé primait sur une sœur en stock : la carte affichait
		 * le prix d'une variante inachetable et liait vers sa PDP, sans autre
		 * signal que la pastille barrée.
		 */
		it("défaut épuisé : le prix et l'URL suivent la variante sœur en stock", () => {
			const soldOutDefault = createSku({ id: "sku-1", inventory: 0, priceInclTax: 2500 });
			const inStockSibling = createSku({
				id: "sku-2",
				position: 1,
				inventory: 10,
				priceInclTax: 3200,
				colors: [
					{
						colorId: "color-2",
						position: 0,
						color: { id: "color-2", slug: "rose", hex: "#FFC0CB", name: "Rose" },
					},
				],
			});
			render(
				<ProductCard product={createProduct({}, [soldOutDefault, inStockSibling])} index={0} />,
			);

			// Prix de la sœur en stock, pas du défaut épuisé (25,00)
			expect(screen.getByText(/32,00/)).toBeInTheDocument();
			expect(screen.queryByText(/25,00/)).not.toBeInTheDocument();
			// L'URL suit TOUJOURS le SKU affiché : préselection de la variante en stock
			const link = screen.getByRole("link", { name: "Test Product" });
			expect(link.getAttribute("href")).toContain("color=rose");
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

	describe("promotion (retrait Omnibus 2026-08-08)", () => {
		it("ne rend NI prix barré NI pastille -X% même avec compareAtPrice en base", () => {
			// Art. L. 112-1-1 : annoncer une remise exige le prix plancher 30 j,
			// que rien ne trace en base — l'affichage est retiré jusqu'au lot A2.
			const product = createProduct({}, [createSku({ priceInclTax: 2000, compareAtPrice: 3000 })]);
			const { container } = render(<ProductCard product={product} index={0} />);

			expect(container.querySelector(".line-through")).toBeNull();
			expect(screen.queryByText(/-\d+%/)).toBeNull();
			expect(getDescription(screen.getByRole("article"))).not.toContain("Promotion");
		});
	});

	describe("pastilles couleur", () => {
		it("rend une liste explicite (role=list) dès 2 couleurs", () => {
			const secondColorSku = createSku({
				id: "sku-2",
				position: 1,
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

		/**
		 * Repli desktop (2026-08-08) : les pastilles ne s'affichent au repos que sur
		 * tactile, un texte prend leur place sur pointeur fin. Le détail du gating
		 * est verrouillé par `product-card-color-swatches.regression.test.tsx` ;
		 * ici on vérifie seulement que la carte le monte.
		 */
		it("monte le repli textuel « Disponible en N coloris »", () => {
			const secondColorSku = createSku({
				id: "sku-2",
				position: 1,
				colors: [
					{
						colorId: "color-2",
						position: 0,
						color: { id: "color-2", slug: "rose", hex: "#FFC0CB", name: "Rose" },
					},
				],
			});
			render(<ProductCard product={createProduct({}, [createSku(), secondColorSku])} index={0} />);

			expect(screen.getByText("Disponible en 2 coloris")).toBeInTheDocument();
		});
	});

	describe("wishlist", () => {
		it("transmet l'id produit au bouton favoris", () => {
			render(<ProductCard product={createProduct()} index={0} />);

			expect(screen.getByTestId("wishlist-button")).toHaveAttribute("data-product-id", "product-1");
		});
	});

	// -------------------------------------------------------------------------
	// Garde-fous de l'audit UI/UX du 2026-08-05. Chacun verrouille un défaut
	// REPRODUIT, pas une préférence de style.
	// -------------------------------------------------------------------------
	describe("@regression product-card-audit-2026-08-05", () => {
		/**
		 * Le badge est en `z-20`, le lien étiré en `after:z-10`, et
		 * la zone média (relative sans z-index) ne crée pas de contexte
		 * d'empilement qui les isolerait : sans `pointer-events-none`, le badge
		 * découpait ~100 × 20 px de zone morte au clic sur l'élément le plus cliqué
		 * de la boutique. Règle générale des calques décoratifs superposés à une
		 * zone cliquable : `pointer-events: none`, non négociable.
		 */
		it("les badges de stock n'interceptent pas le clic du lien étiré", () => {
			const { container } = render(
				<ProductCard product={createProduct({}, [createSku({ inventory: 0 })])} index={0} />,
			);

			const badge = container.querySelector('[data-slot="badge"]');
			expect(badge).not.toBeNull();
			expect(badge).toHaveClass("pointer-events-none");
		});

		/**
		 * `opacity-0` n'empêche PAS le chargement `loading="lazy"` : il se déclenche à
		 * l'intersection du viewport. La photo secondaire n'étant révélée que par
		 * `can-hover:group-hover`, chaque carte téléchargeait sur tactile une image
		 * structurellement inaffichable (~0,5–0,8 Mo par grille de 12, plus une
		 * transformation Vercel facturée par source). En `display: none` l'élément n'a
		 * pas de boîte, n'intersecte jamais, et n'est jamais requis.
		 */
		it("la photo secondaire est en display:none hors des pointeurs fins", () => {
			const skuWithTwoImages = createSku({
				images: [
					{
						id: "img-1",
						url: "/image.jpg",
						thumbnailUrl: "/image-thumb.jpg",
						altText: null,
						mediaType: "IMAGE",
						blurDataUrl: null,
						width: null,
						height: null,
					},
					{
						id: "img-2",
						url: "/image-2.jpg",
						thumbnailUrl: "/image-2-thumb.jpg",
						altText: null,
						mediaType: "IMAGE",
						blurDataUrl: null,
						width: null,
						height: null,
					},
				],
			});
			const { container } = render(
				<ProductCard product={createProduct({}, [skuWithTwoImages])} index={0} />,
			);

			// `next/image` est mocké en <img> nu (className perdu) : c'est le conteneur
			// rendu par ProductCard elle-même qui porte le gate, et qu'on assert.
			const secondary = container.querySelector('img[src="/image-2.jpg"]');
			expect(secondary).not.toBeNull();

			const gate = secondary?.parentElement;
			expect(gate).toHaveClass("hidden");
			expect(gate).toHaveClass("can-hover:block");
		});

		/**
		 * Le badge seul est un signal trop faible à la vitesse de scan d'une grille.
		 * ⚠️ Le voile est en `bg-card` et NON une désaturation : la couleur est
		 * l'argument de ces bijoux, un `grayscale` serait le contre-pied du brief.
		 */
		it("voile de rupture rendu si et seulement si le produit est épuisé", () => {
			const veil = "span.bg-card\\/45";

			const epuise = render(
				<ProductCard product={createProduct({}, [createSku({ inventory: 0 })])} index={0} />,
			);
			const rendered = epuise.container.querySelector(veil);
			expect(rendered).not.toBeNull();
			// Ne doit jamais capter le clic du lien étiré.
			expect(rendered).toHaveClass("pointer-events-none");
			cleanup();

			const enStock = render(<ProductCard product={createProduct()} index={0} />);
			expect(enStock.container.querySelector(veil)).toBeNull();
		});
	});
});
