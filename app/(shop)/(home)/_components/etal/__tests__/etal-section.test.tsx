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

import { STOREFRONT_EYEBROW } from "@/shared/components/storefront-heading";

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
	it("rend un h1 unique qui porte le mot d'accent surligné", () => {
		render(<EtalHeading id="etal-title" />);

		const headings = screen.getAllByRole("heading", { level: 1 });
		expect(headings).toHaveLength(1);

		const h1 = screen.getByRole("heading", { level: 1 });
		expect(h1).toHaveAttribute("id", "etal-title");
		expect(h1.textContent).toBe("Des bijoux colorés, faits un par un");

		// Direction B « Le surligneur » (2026-08-05, ex-`.text-gradient-multicolor`) :
		// la couleur du mot vit dans un trait de pinceau DERRIÈRE l'encre, pas dans
		// le glyphe. Le trait est décoratif (`aria-hidden`) et l'encre reste
		// `--foreground` : le texte du h1 ne doit dépendre de lui ni pour la lecture
		// (textContent intact ci-dessus) ni pour l'accessibilité.
		const accent = h1.querySelector("[data-slot='brush-highlight']");
		expect(accent).not.toBeNull();
		expect(accent!.textContent).toBe("colorés");
		expect(accent!.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
	});

	it("le trait du surligneur garde sa période de dash 3 (« 1 2 »), pas le « 1 » de hand-draw-load", () => {
		render(<EtalHeading id="etal-title" />);

		const path = screen
			.getByRole("heading", { level: 1 })
			.querySelector("[data-slot='brush-highlight'] svg path");
		expect(path).not.toBeNull();

		// Défaut attrapé : `.hand-draw-load` pose `stroke-dasharray: 1` (période 2,
		// « 1 1 » implicite). Sur ce tracé à `pathLength={1}` et dashoffset 1, le
		// dash SUIVANT commence exactement en fin de tracé et son cap arrondi peint
		// un POINT parasite (rayon ~8 px, trait épais) pendant tout le délai de
		// 480 ms. La période 3 (« 1 2 ») ne laisse rien de visible à l'offset 1,
		// avec une course 1 → 0 identique. L'override est INLINE — c'est ce qui le
		// fait gagner sur la classe, et c'est ce que ce test verrouille : un
		// refactor qui le déplacerait dans une classe utilitaire perdrait
		// l'arbitrage de spécificité sans qu'aucun autre filet ne le voie.
		expect(path).toHaveClass("hand-draw-load");
		expect((path as SVGPathElement).style.strokeDasharray).toBe("1 2");
	});

	it("affiche l'eyebrow situé, et NE paraphe PAS le bloc titre", () => {
		const { container } = render(<EtalHeading id="etal-title" />);

		expect(screen.getByText(/L'atelier de Léane · Nantes/)).toBeInTheDocument();

		// …et c'est bien la SSOT partagée qui le rend, pas une copie de la même
		// chaîne : la home avait son littéral, les six autres routes prenaient le
		// défaut de `StorefrontHeading`. Un test qui ne vérifie que le TEXTE laisse
		// les deux copies diverger dès qu'on reformule le sur-titre d'un seul côté.
		expect(screen.getByText(STOREFRONT_EYEBROW)).toBeInTheDocument();

		// Le storefront ne signe qu'une fois par page, dans le pied de page. Avec
		// ce paraphe-ci, la home en portait TROIS (bloc titre, carton de fin de
		// grille, pied de page). Le « quelqu'un derrière » est porté par le chapô
		// à la première personne, vérifié plus bas.
		expect(screen.queryByText("— Léane")).not.toBeInTheDocument();
		expect(container.querySelector(".font-cursive")).toBeNull();
	});

	it("n'a qu'UNE copie du chapô, ses compléments desktop masqués sous sm", () => {
		const { container } = render(<EtalHeading id="etal-title" />);

		// Le chapô existait en DEUX paragraphes quasi identiques : deux endroits où
		// corriger une coquille, et rien pour signaler qu'ils avaient divergé.
		const chapo = Array.from(container.querySelectorAll("p")).filter((paragraph) =>
			paragraph.textContent.includes("Je peins et j'assemble"),
		);
		expect(chapo).toHaveLength(1);

		// `display: none` retire aussi de l'arbre d'accessibilité : pas de
		// double lecture par un lecteur d'écran.
		const desktopOnly = Array.from(chapo[0]!.querySelectorAll("span"));
		expect(desktopOnly).not.toHaveLength(0);
		for (const complement of desktopOnly) {
			expect(complement.className).toContain("hidden");
			expect(complement.className).toContain("sm:inline");
		}

		// Ce que lit un mobile = la phrase privée de ses compléments. On l'assemble
		// plutôt que de la ré-écrire en dur : une copie de plus dans un test est une
		// copie de plus à garder en phase, c'est le défaut qu'on vient de retirer.
		const mobileCopy = Array.from(chapo[0]!.childNodes)
			.filter((node) => node.nodeType === Node.TEXT_NODE)
			.map((node) => node.textContent)
			.join("");
		expect(normalize(mobileCopy)).toBe(
			"Je peins et j'assemble chaque pièce à la main. Aucune n'est identique à une autre.",
		);

		// ⚠️ Ce que la coupe mobile GARDE est le sujet du test, pas un détail de
		// formulation. Avant le 2026-08-05 elle gardait « à Nantes » et jetait
		// l'unicité — or l'eyebrow juste au-dessus dit déjà « · Nantes ». Le premier
		// écran répétait donc le lieu et taisait le seul motif d'acheter tout de suite.
		expect(normalize(mobileCopy)).toContain("Aucune n'est identique");
		expect(normalize(mobileCopy)).not.toContain("Nantes");
		// …et le lieu reste dit UNE fois, par l'eyebrow.
		expect(normalize(container.textContent)).toContain("L'atelier de Léane · Nantes");

		// La copie ne vouvoie pas (CLAUDE.md § Voix — celle sauvegardée dans
		// docs/atelier-story.md vouvoie, elle a été réécrite).
		expect(normalize(container.textContent)).not.toMatch(/\bvous\b|\bvotre\b|\bvos\b/i);
	});

	it("rend les quatre touches de pinceau de marque, décoratives", () => {
		const { container } = render(<EtalHeading id="etal-title" />);

		// `HandDrawnRail` (SSOT du geste, `shared/components/storefront-heading`) :
		// l'ancien rail dupliquait les 4 classes bg-* en littéral — la home pouvait
		// diverger d'un changement de palette sans qu'aucun test ne le voie.
		const rail = container.querySelector('[aria-hidden="true"]');
		expect(rail).not.toBeNull();
		const paths = rail!.querySelectorAll("svg path");
		expect(paths).toHaveLength(4);

		const classes = Array.from(paths).map((stroke) => stroke.getAttribute("class") ?? "");
		expect(classes[0]).toContain("stroke-primary");
		expect(classes[1]).toContain("stroke-brand-lavender");
		expect(classes[2]).toContain("stroke-brand-mint");
		expect(classes[3]).toContain("stroke-brand-sun");

		// Le dessin au montage fait partie du geste (repli reduced-motion dans
		// entrance.css : touches déjà sèches).
		for (const cls of classes) expect(cls).toContain("hand-draw-load");
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
		// URL nue : le tri par défaut n'a pas à être répété dans l'URL, et la version
		// paramétrée se canonicalisait vers celle-ci.
		expect(screen.getByRole("link", { name: /Voir toutes les créations/ })).toHaveAttribute(
			"href",
			"/produits",
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
