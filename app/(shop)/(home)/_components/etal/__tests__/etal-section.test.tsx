import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — seuls les îlots client et les primitives Next le sont : c'est le
// rendu RÉEL de l'étal (bloc titre, cellules, ProductCard) qu'on teste, comme
// dans `product-card.test.tsx`.
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

// `data-in-wishlist` est exposé exprès : c'est la SEULE façon d'observer la prop
// que l'étal ne passait pas (audit UI/UX 2026-08-04, P1). `useWishlistToggle`
// n'a pas d'autre source de vérité que cette valeur initiale.
vi.mock("@/modules/wishlist/components/wishlist-button", () => ({
	WishlistButton: ({ isInWishlist }: { isInWishlist: boolean }) => (
		<button data-testid="wishlist-button" data-in-wishlist={isInWishlist} />
	),
}));

vi.mock("@/modules/cart/components/add-to-cart-card-button", () => ({
	AddToCartCardButton: () => <button data-testid="add-to-cart" />,
}));

// `RefreshButton` (branche d'erreur) appelle `useRouter` : hors app router monté,
// il lève « invariant expected app router to be mounted ».
vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const { mockGetWishlistProductIds } = vi.hoisted(() => ({
	mockGetWishlistProductIds: vi.fn(async () => new Set<string>()),
}));

vi.mock("@/modules/wishlist/data/get-wishlist-product-ids", () => ({
	getWishlistProductIds: mockGetWishlistProductIds,
}));

import type { ProductCarouselItem } from "@/modules/products/types/product.types";
import type { GetProductsReturn } from "@/modules/products/data/get-products";

import { EtalGrid, ETAL_PRODUCTS_COUNT } from "../etal-grid";
import { EtalHeading } from "../etal-heading";

// ---------------------------------------------------------------------------
// Fixtures
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
		colors: [],
		materials: [
			{ materialId: "m-1", position: 0, material: { id: "m-1", name: "Perles naturelles" } },
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
		slug: "bague-lune",
		title: "Bague Lune",
		status: "PUBLIC",
		skus,
		type: { label: "Bagues" },
		...overrides,
	} as unknown as ProductCarouselItem;
}

function productsResult(products: ProductCarouselItem[]): Promise<GetProductsReturn> {
	return Promise.resolve({
		products,
		pagination: {
			nextCursor: null,
			prevCursor: null,
			hasNextPage: false,
			hasPreviousPage: false,
		},
		totalCount: products.length,
	} as unknown as GetProductsReturn);
}

/** Texte normalisé : Intl fr-FR sépare les milliers par une espace fine insécable. */
function normalize(text: string): string {
	return text.replace(/[  ]/g, " ");
}

afterEach(() => {
	cleanup();
	mockGetWishlistProductIds.mockReset();
	mockGetWishlistProductIds.mockResolvedValue(new Set<string>());
});

// ---------------------------------------------------------------------------
// Bloc titre
// ---------------------------------------------------------------------------

describe("EtalHeading — le bloc titre est la première cellule de la grille", () => {
	it("rend un h1 unique qui porte le mot d'accent dégradé", () => {
		render(<EtalHeading id="etal-title" />);

		const headings = screen.getAllByRole("heading", { level: 1 });
		expect(headings).toHaveLength(1);

		const h1 = screen.getByRole("heading", { level: 1 });
		expect(h1).toHaveAttribute("id", "etal-title");
		expect(h1.textContent).toBe("Des bijoux colorés, faits un par un");

		// Le mot dégradé passe par l'utility SSOT (tokens --gradient-hero-*),
		// jamais par une couleur littérale : c'est elle qui porte les bascules
		// `forced-colors` et `prefers-contrast: more`.
		const accent = h1.querySelector(".text-gradient-multicolor");
		expect(accent).not.toBeNull();
		expect(accent!.textContent).toBe("colorés");
	});

	it("affiche l'eyebrow situé et la signature manuscrite", () => {
		render(<EtalHeading id="etal-title" />);

		expect(screen.getByText(/L'atelier de Léane · Nantes/)).toBeInTheDocument();

		const signature = screen.getByText("— Léane");
		// Sacramento est décorative : ni graisse ni italique (mono-poids).
		expect(signature.className).toContain("font-cursive");
		expect(signature.className).not.toMatch(/font-(bold|semibold)|italic/);
	});

	it("garde la copie mobile ET desktop dans le DOM, une seule visible à la fois", () => {
		const { container } = render(<EtalHeading id="etal-title" />);

		const desktop = screen.getByText(/dans mon atelier à Nantes/);
		const mobile = screen.getByText(/à la main, à Nantes\./);

		// `display: none` retire aussi de l'arbre d'accessibilité : pas de
		// double lecture par un lecteur d'écran.
		expect(desktop.className).toContain("hidden");
		expect(desktop.className).toContain("sm:block");
		expect(mobile.className).toContain("sm:hidden");

		// Aucune des deux ne vouvoie (CLAUDE.md § Voix — la copie sauvegardée
		// dans docs/atelier-story.md vouvoie, elle a été réécrite).
		expect(normalize(container.textContent)).not.toMatch(/\bvous\b|\bvotre\b|\bvos\b/i);
	});

	it("rend le rail de 4 couleurs de marque, décoratif", () => {
		const { container } = render(<EtalHeading id="etal-title" />);

		const rail = container.querySelector('[aria-hidden="true"]');
		expect(rail).not.toBeNull();
		expect(rail!.children).toHaveLength(4);

		const classes = Array.from(rail!.children).map((segment) => segment.className);
		expect(classes[0]).toContain("bg-primary");
		expect(classes[1]).toContain("bg-brand-lavender");
		expect(classes[2]).toContain("bg-brand-mint");
		expect(classes[3]).toContain("bg-brand-sun");
	});

	it("comble le saut h1 → h3 avec un h2 masqué, APRÈS le h1 dans l'ordre DOM", () => {
		render(<EtalHeading id="etal-title" />);

		const h2 = screen.getByRole("heading", { level: 2 });
		expect(h2.className).toContain("sr-only");

		// Un h2 rendu AVANT le h1 serait une hiérarchie inversée, pas comblée.
		const h1 = screen.getByRole("heading", { level: 1 });
		expect(h1.compareDocumentPosition(h2) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it("borne la mesure du titre entre md et lg, et la relâche à lg", () => {
		render(<EtalHeading id="etal-title" />);

		// Entre 48rem et ~54rem, le clamp est collé à son plancher pendant que la
		// cellule passe en pleine largeur : sans borne, le titre tient sur une
		// seule ligne de 35 caractères et perd sa silhouette en deux lignes.
		const h1 = screen.getByRole("heading", { level: 1 });
		expect(h1.className).toContain("md:max-w-[20ch]");
		expect(h1.className).toContain("lg:max-w-none");
	});
});

// ---------------------------------------------------------------------------
// États durs de la grille
// ---------------------------------------------------------------------------

describe("EtalGrid — états durs", () => {
	it("zéro création publiée : la grille cède la place à une carte de contact", async () => {
		render(await EtalGrid({ productsPromise: productsResult([]) }));

		expect(screen.getByText("L'atelier remplit ses étagères")).toBeInTheDocument();

		const contact = screen.getByRole("link", { name: /Écrire à Léane/ });
		expect(contact).toHaveAttribute("href", expect.stringMatching(/^mailto:/));

		// Ni carte produit, ni cellule « tout voir » : il n'y a plus d'étal.
		expect(screen.queryByRole("article")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: /Voir toutes les créations/ }),
		).not.toBeInTheDocument();
	});

	it("hydrate l'état favori de chaque carte depuis le cookie", async () => {
		mockGetWishlistProductIds.mockResolvedValue(new Set(["liked"]));

		const products = [
			createProduct({ id: "liked", slug: "aime", title: "Déjà en favori" }),
			createProduct({ id: "plain", slug: "neutre", title: "Pas en favori" }),
		];

		render(await EtalGrid({ productsPromise: productsResult(products) }));

		const [liked, plain] = screen.getAllByTestId("wishlist-button");

		// Sans cette hydratation, les deux cœurs sont vides ET un clic sur le
		// premier RETIRE le bijou des favoris (toggleWishlistItem : « présent →
		// retire ») sous une UI optimiste qui promet l'inverse.
		expect(liked).toHaveAttribute("data-in-wishlist", "true");
		expect(plain).toHaveAttribute("data-in-wishlist", "false");
	});

	it("lecture en échec : un réessai, PAS l'état vide", async () => {
		const failed = Promise.resolve({
			products: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
			totalCount: 0,
			error: "Failed to fetch products",
		} as unknown as GetProductsReturn);

		render(await EtalGrid({ productsPromise: failed }));

		expect(screen.getByText(/n'ont pas pu être chargées/)).toBeInTheDocument();
		// Annoncer « L'atelier remplit ses étagères » pour une panne présente un
		// incident comme un catalogue vide, sans moyen de réessayer.
		expect(screen.queryByText("L'atelier remplit ses étagères")).not.toBeInTheDocument();
	});

	it("la cellule catalogue est un aplat des 4 accents, pas un cadre vide", async () => {
		const { container } = render(
			await EtalGrid({ productsPromise: productsResult([createProduct()]) }),
		);

		const link = screen.getByRole("link", { name: /Voir toutes les créations/ });
		const card = link.closest(".group");
		expect(card).not.toBeNull();

		const aplat = card!.querySelector('[aria-hidden="true"]');
		expect(aplat).not.toBeNull();
		expect(aplat!.className).toContain("aspect-4/5");
		expect(Array.from(aplat!.children).map((band) => band.className)).toEqual([
			expect.stringContaining("bg-primary"),
			expect.stringContaining("bg-brand-lavender"),
			expect.stringContaining("bg-brand-mint"),
			expect.stringContaining("bg-brand-sun"),
		]);

		// Le nom INTERNE de la direction de design ne fuit pas dans la copie.
		expect(container.textContent).not.toMatch(/l'étal/i);
	});

	it("une seule création : la cellule « tout voir » reste, la carte de contact non", async () => {
		render(await EtalGrid({ productsPromise: productsResult([createProduct()]) }));

		expect(screen.getAllByRole("article")).toHaveLength(1);
		expect(screen.getByRole("link", { name: /Voir toutes les créations/ })).toHaveAttribute(
			"href",
			"/produits?sortBy=created-descending",
		);
		expect(screen.queryByText("L'atelier remplit ses étagères")).not.toBeInTheDocument();
	});

	it("catalogue plein : ETAL_PRODUCTS_COUNT cartes + la cellule « tout voir »", async () => {
		const products = Array.from({ length: ETAL_PRODUCTS_COUNT }, (_, index) =>
			createProduct({ id: `product-${index}`, slug: `slug-${index}`, title: `Bijou ${index}` }),
		);

		const { container } = render(await EtalGrid({ productsPromise: productsResult(products) }));

		expect(screen.getAllByRole("article")).toHaveLength(ETAL_PRODUCTS_COUNT);
		// 5 créations + 1 cellule « tout voir » = 6 cellules, soit exactement
		// 2 rangées pleines en lg (titre = 2 colonnes), 3 en md, 3 sous md.
		expect(container.children).toHaveLength(ETAL_PRODUCTS_COUNT + 1);
	});

	it("contenu laid : titre long, prix à quatre chiffres, promo ET dernière pièce ensemble", async () => {
		const longTitle = "Chaîne de cheveux bohème en perles de verre filé multicolores";
		expect(longTitle.length).toBeGreaterThanOrEqual(60);

		const product = createProduct({ id: "ugly", slug: "chaine", title: longTitle }, [
			createSku({ inventory: 1, priceInclTax: 124900, compareAtPrice: 192150 }),
		]);

		render(await EtalGrid({ productsPromise: productsResult([product]) }));

		const article = screen.getByRole("article");
		const text = normalize(article.textContent);

		// Le titre n'est pas tronqué dans le DOM (le clamp est visuel).
		expect(within(article).getByRole("heading", { level: 3 })).toHaveTextContent(longTitle);
		// Prix à quatre chiffres + remise : les deux coexistent sur la légende.
		expect(text).toMatch(/1 249,00/);
		expect(text).toMatch(/-3[0-9] ?%/);
		// …en même temps que le badge d'urgence stock.
		expect(text).toMatch(/Plus que 1/);
	});

	it("rupture de stock : la carte reste dans la grille, sans CTA panier", async () => {
		const product = createProduct({ id: "sold-out", slug: "epuise", title: "Bague Fleur" }, [
			createSku({ inventory: 0 }),
		]);

		render(await EtalGrid({ productsPromise: productsResult([product]) }));

		const article = screen.getByRole("article");
		// « Rupture de stock » est rendu deux fois : le badge visuel et la
		// description sr-only reliée par aria-describedby.
		expect(within(article).getAllByText("Rupture de stock").length).toBeGreaterThan(0);
		expect(screen.queryByTestId("add-to-cart")).not.toBeInTheDocument();
	});
});
