import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — seules les primitives Next le sont : c'est le rendu RÉEL des cartes
// (cadre polaroid, légende, squiggle) qu'on teste, comme `hero-section.test.tsx`.
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

// La grille appelle le fetcher agrégé (`"use cache"` + Prisma) — mocké comme
// dans `collection-chapters.test.tsx`. Défaut : aucune fourchette (la ligne
// prix s'omet), surchargé par test via `vi.mocked`.
vi.mock("@/modules/collections/data/get-collection-price-ranges", () => ({
	getCollectionPriceRanges: vi.fn(() => Promise.resolve({})),
}));

import { getCollectionPriceRanges } from "@/modules/collections/data/get-collection-price-ranges";
import type { GetCollectionsReturn } from "@/modules/collections/data/get-collections";
import { dataAccentForSlug } from "@/modules/products/components/catalog-accents.constants";

import {
	CollectionsCard,
	CollectionsCardSkeleton,
	LANDING_PRINT_COUNT,
	LANDING_PRINT_FRAME_CLASSES,
} from "../collections-card";
import {
	CollectionsGrid,
	CollectionsGridSkeleton,
	LANDING_COLLECTIONS_COUNT,
} from "../collections-grid";
import { CollectionsSection } from "../collections-section";

type CollectionItem = GetCollectionsReturn["collections"][number];

function makeCollection(overrides: Partial<CollectionItem> = {}): CollectionItem {
	return {
		id: "col-1",
		slug: "pokemon",
		name: "Pokémon",
		description: "Des bijoux inspirés de la première génération.",
		status: "PUBLIC",
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		products: [
			{
				isFeatured: true,
				product: {
					id: "prod-1",
					title: "Boucles Salamèche",
					skus: [
						{
							priceInclTax: 3200,
							images: [
								{
									url: "https://utfs.io/f/salameche.jpg",
									altText: "Boucles Salamèche",
									blurDataUrl: null,
								},
							],
						},
					],
				},
			},
		],
		_count: { products: 7 },
		...overrides,
	} as CollectionItem;
}

/**
 * N produits porteurs d'une image — c'est ce que la pile consomme. Le premier
 * est le produit VITRINE (`isFeatured`), comme le rend l'`orderBy` du select.
 */
function makePrintProducts(count: number): CollectionItem["products"] {
	return Array.from({ length: count }, (_, index) => ({
		isFeatured: index === 0,
		product: {
			id: `prod-${index + 1}`,
			title: `Pièce ${index + 1}`,
			skus: [
				{
					priceInclTax: 3200,
					images: [
						{ url: `https://utfs.io/f/piece-${index + 1}.jpg`, altText: null, blurDataUrl: null },
					],
				},
			],
		},
	})) as CollectionItem["products"];
}

/** Tous les cadres de tirage rendus — ils CONSOMMENT la constante exportée. */
function printFrames(): HTMLElement[] {
	const tokens = LANDING_PRINT_FRAME_CLASSES.split(" ");
	return Array.from(document.querySelectorAll("div")).filter((node) =>
		tokens.every((token) => node.classList.contains(token)),
	);
}

function makeReturn(collections: CollectionItem[]): Promise<GetCollectionsReturn> {
	return Promise.resolve({
		collections,
		pagination: {
			nextCursor: null,
			prevCursor: null,
			hasNextPage: false,
			hasPreviousPage: false,
		},
		totalCount: collections.length,
	} as GetCollectionsReturn);
}

afterEach(cleanup);

describe("CollectionsGrid", () => {
	it("rend une carte-lien par collection, nommée par le titre, avec le compteur en eyebrow", async () => {
		render(
			<ul>
				{await CollectionsGrid({
					collectionsPromise: makeReturn([
						makeCollection(),
						makeCollection({ id: "col-2", slug: "van-gogh", name: "Van Gogh" }),
					]),
				})}
			</ul>,
		);

		const cards = screen.getAllByRole("article");
		expect(cards).toHaveLength(2);

		// Le lien porte le NOM de la collection (2.5.3 : jamais un sélecteur
		// anonyme) et pointe vers sa page.
		expect(screen.getByRole("link", { name: "Pokémon" })).toHaveAttribute(
			"href",
			"/collections/pokemon",
		);
		expect(screen.getByRole("link", { name: "Van Gogh" })).toHaveAttribute(
			"href",
			"/collections/van-gogh",
		);

		// L'eyebrow d'orientation : « 7 créations », vocabulaire atelier.
		expect(screen.getAllByText("7 créations")).toHaveLength(2);
	});

	it("rend la photo en décoratif (alt vide) — la carte s'annonce par son titre", async () => {
		render(
			<ul>
				{await CollectionsGrid({
					collectionsPromise: makeReturn([makeCollection()]),
				})}
			</ul>,
		);

		const img = document.querySelector("img");
		expect(img).toHaveAttribute("src", "https://utfs.io/f/salameche.jpg");
		expect(img).toHaveAttribute("alt", "");
	});

	it("empile TROIS tirages : une carte collection montre un ENSEMBLE, pas un objet", () => {
		// Le payload en porte 4 (plafond dur du `take`, partagé avec le bento du
		// méga-menu) ; la pile en rend 3. Avant l'arbitrage du 2026-08-06 la carte
		// n'en lisait qu'UN — elle était alors indiscernable d'une carte produit
		// dont on aurait retiré le prix.
		render(<CollectionsCard collection={makeCollection({ products: makePrintProducts(4) })} />);

		const images = Array.from(document.querySelectorAll("img"));
		expect(images).toHaveLength(LANDING_PRINT_COUNT);

		// L'ORDRE vient du payload, jamais d'un tri par date ni d'un tirage au
		// sort : le premier tirage est le produit vitrine (`isFeatured`), le seul
		// levier éditorial dont la carte dispose.
		expect(images.map((image) => image.getAttribute("src"))).toEqual([
			"https://utfs.io/f/piece-1.jpg",
			"https://utfs.io/f/piece-2.jpg",
			"https://utfs.io/f/piece-3.jpg",
		]);

		// Tous décoratifs : trois `alt` produiraient trois descriptions de bijoux
		// avant d'atteindre le nom de la collection.
		expect(images.every((image) => image.getAttribute("alt") === "")).toBe(true);
	});

	it("rend moins de tirages quand la série en a moins, sans cadre vide de remplissage", () => {
		render(<CollectionsCard collection={makeCollection({ products: makePrintProducts(2) })} />);

		expect(document.querySelectorAll("img")).toHaveLength(2);
		expect(printFrames()).toHaveLength(2);
	});

	it("quitte la géométrie de la carte produit : ni marge polaroid ni tilt d'enveloppe", () => {
		render(<CollectionsCard collection={makeCollection({ products: makePrintProducts(3) })} />);

		// `CARD_SURFACE_POLAROID` pose `pb-0` (la légende colle au cadre) et
		// `CARD_TILT` une rotation d'enveloppe par index. Les deux sont descendus
		// sur les TIRAGES : les empiler aurait donné du papier sur du papier, et
		// gardé à la carte la silhouette dont la doctrine veut la séparer.
		const card = screen.getByRole("article");
		expect(card.className).not.toContain("pb-0");
		expect(card.className).not.toMatch(/-?rotate-\[0\.\d+deg\]/);

		// Les tirages, eux, sont bien de guingois.
		expect(printFrames().some((frame) => frame.className.includes("rotate"))).toBe(true);
	});

	it("redresse les tirages au survol ET au focus clavier, la règle de focus jamais derrière can-hover", () => {
		render(<CollectionsCard collection={makeCollection({ products: makePrintProducts(3) })} />);

		for (const frame of printFrames()) {
			expect(frame.className).toContain("can-hover:group-hover:rotate-0");
			expect(frame.className).toContain("group-focus-within:rotate-0");
			// WCAG 2.4.7 : gater la RÉVÉLATION derrière `can-hover:` la rendrait
			// inatteignable au clavier sur tactile — on ne gate que le masquage.
			expect(frame.className).not.toContain("can-hover:group-focus-within");
		}
	});

	it("garde la pose de repos HORS de motion-safe — sinon la pile rend plate sous reduced-motion", () => {
		render(<CollectionsCard collection={makeCollection({ products: makePrintProducts(3) })} />);

		// @regression collection-card-rest-pose-not-motion-gated
		// Audit du 2026-08-06, trouvé au rendu : les trois rotations étaient
		// derrière `motion-safe:`, donc sous `prefers-reduced-motion: reduce`
		// `getComputedStyle(cadre).rotate` valait `none` — la pile rendait plate et
		// régulière, c'est-à-dire la silhouette S3 « la bande filante » que le § 5
		// de la doctrine a REJETÉE (risque déclaré : « la tiédeur », le mode
		// d'échec que CLAUDE.md interdit). Une POSE n'est pas un mouvement : c'est
		// déjà la règle écrite sur `CARD_TILT`, qui ne porte pas `motion-safe:`.
		const restPoses = printFrames().map((frame) =>
			frame.className.split(" ").filter((token) => /(^|:)-?rotate-(?!0\b)/.test(token)),
		);

		expect(restPoses.every((poses) => poses.length > 0)).toBe(true);
		for (const poses of restPoses) {
			for (const pose of poses) {
				expect(pose).not.toContain("motion-safe:");
			}
		}

		// Le GESTE, lui, reste gaté sur les deux branches : sans ça, un focus
		// clavier sous reduced-motion mettrait la pile à plat d'un seul coup.
		for (const frame of printFrames()) {
			expect(frame.className).toContain("motion-safe:can-hover:group-hover:rotate-0");
			expect(frame.className).toContain("motion-safe:group-focus-within:rotate-0");
		}
	});

	it("peint le papier des tirages à l'accent de la série, au lieu de le laisser blanc", () => {
		render(<CollectionsCard collection={makeCollection({ products: makePrintProducts(3) })} />);

		// Audit du 2026-08-06 : l'accent ne touchait QUE le squiggle — 2,5px de
		// trait à 1,58:1 sur blanc, ~0,45 % de la surface, et d'une longueur qui
		// suivait celle du nom (38,5px pour « Fêtes »). Le § 6 de la doctrine veut
		// que la grille de collections soit la surface où la polychromie se lit le
		// mieux ; c'était celle où elle se lisait le moins.
		for (const frame of printFrames()) {
			expect(frame.className).toContain("bg-(--section-wash)");
			expect(frame.className).not.toContain("bg-card");
		}
	});

	it("ne montre que DEUX tirages sous sm, où la carte n'a que 120 à 155px utiles", () => {
		render(<CollectionsCard collection={makeCollection({ products: makePrintProducts(3) })} />);

		// Le § 5 a disqualifié la silhouette S3 en écrivant qu'à « 55px de côté un
		// bijou n'est plus une pièce mais une pastille de couleur » — la pile
		// rendait 44px sous `sm`, donc SOUS ce seuil, sur le viewport dominant.
		// Masquer le 3ᵉ cadre finance les 56px du palier de base ; le plancher
		// doctrinal est 2 visuels, pas 3.
		const frames = printFrames();
		expect(frames).toHaveLength(3);
		expect(frames[0]?.className).not.toContain("max-sm:hidden");
		expect(frames[1]?.className).not.toContain("max-sm:hidden");
		expect(frames[2]?.className).toContain("max-sm:hidden");
	});

	it("montre une promesse (« Photos à venir ») quand aucun SKU actif ne porte d'image", () => {
		const collection = makeCollection({ products: [] });

		render(<CollectionsCard collection={collection} />);

		const promise = screen.getByText("Photos à venir");
		expect(promise).toBeInTheDocument();
		expect(document.querySelector("img")).toBeNull();

		// Langage d'état vide harmonisé (2026-08-06) : le wash teinté par le
		// `data-accent` de la carte — même promesse que la carte du méga-menu,
		// plus le `bg-muted` gris d'avant. Le puits est passé au wash FORT (18 %)
		// le jour où le cadre a été teinté à 10 % : deux fois la même valeur
		// aurait donné un aplat uniforme, là où la branche nominale garde un
		// rapport cadre → fenêtre (la fenêtre y est la photo).
		expect(promise.parentElement?.className).toContain("bg-(--section-wash-strong)");
	});

	it("porte l'encre de sa série : data-accent du MÊME hash que /collections et la page fille", async () => {
		render(
			<ul>
				{await CollectionsGrid({
					collectionsPromise: makeReturn([
						makeCollection(),
						makeCollection({ id: "col-2", slug: "van-gogh", name: "Van Gogh" }),
					]),
				})}
			</ul>,
		);

		const cards = screen.getAllByRole("article");
		expect(cards[0]).toHaveAttribute("data-accent", dataAccentForSlug("pokemon"));
		expect(cards[1]).toHaveAttribute("data-accent", dataAccentForSlug("van-gogh"));
	});

	it("ne scotche PLUS de ruban (retrait 2026-08-05) : l'encre de la série ne teinte que le squiggle", () => {
		render(<CollectionsCard collection={makeCollection()} />);

		// Le ruban était le seul élément à porter --section-accent en style
		// inline. Sa répétition sur chaque carte de la grille saturait la
		// landing de rose — ne pas le re-poser par item (cf. masking-tape.tsx).
		const tinted = Array.from(document.querySelectorAll("span")).find((s) =>
			s.style.backgroundColor.includes("var(--section-accent)"),
		);
		expect(tinted).toBeUndefined();
	});

	it("demande UNE fourchette agrégée pour toutes les cartes et rend le plancher", async () => {
		vi.mocked(getCollectionPriceRanges).mockResolvedValueOnce({
			"col-1": { min: 3200, max: 4800, offerCount: 3 },
		});

		render(
			<ul>
				{await CollectionsGrid({
					collectionsPromise: makeReturn([makeCollection()]),
				})}
			</ul>,
		);

		expect(getCollectionPriceRanges).toHaveBeenCalledWith(["col-1"]);
		expect(screen.getByText("À partir de")).toBeInTheDocument();
		expect(screen.getByText(/32,00\s*€/)).toBeInTheDocument();
		// `min` seul s'affiche — le `max` ne promet pas une fourchette qu'on ne rend pas.
		expect(screen.queryByText(/48,00/)).toBeNull();
	});

	/**
	 * @regression collection-from-price-two-decimals
	 *
	 * Transposée du chapitre (`collection-chapter.test.tsx`) : le from-price se
	 * rend à DEUX décimales, jamais en `{ compact: true }` (« 49,9 € » pour 4990
	 * centimes, « 50 € » pour 5000 — le registre du dashboard, pas d'un prix de
	 * vitrine).
	 */
	it("rend le from-price à deux décimales, montant rond compris", () => {
		render(<CollectionsCard collection={makeCollection()} priceRange={{ min: 4990 }} />);
		expect(screen.getByText(/49,90\s*€/)).toBeInTheDocument();

		cleanup();

		render(<CollectionsCard collection={makeCollection()} priceRange={{ min: 5000 }} />);
		expect(screen.getByText(/50,00\s*€/)).toBeInTheDocument();
	});

	it("omet la ligne prix sans fourchette (compteur sans SKU actif), carte rendue quand même", () => {
		render(<CollectionsCard collection={makeCollection()} />);

		expect(screen.queryByText("À partir de")).toBeNull();
		expect(screen.getByRole("article")).toBeInTheDocument();
	});

	it("branche vide : la note d'atelier remplace la grille, sans aucun lien", async () => {
		render(
			<ul>
				{await CollectionsGrid({
					collectionsPromise: makeReturn([]),
				})}
			</ul>,
		);

		expect(screen.getByText(/s'assemblent sur l'établi/)).toBeInTheDocument();
		expect(screen.queryByRole("link")).toBeNull();
		expect(screen.queryByRole("article")).toBeNull();
	});
});

describe("CollectionsSection — coquille", () => {
	// Promesse muette : la grille (composant async) reste suspendue, seul le
	// squelette se rend — c'est la coquille qu'on teste, pas les cartes.
	function renderShell() {
		return render(<CollectionsSection collectionsPromise={new Promise(() => {})} />);
	}

	it("porte l'ancre #collections et AUCUN scroll-mt (la barre est compensée globalement)", () => {
		renderShell();

		const section = document.querySelector("section");
		expect(section).toHaveAttribute("id", "collections");

		// ⚠️ Ce test exigeait l'INVERSE jusqu'au 2026-08-06
		// (`scroll-mt-[calc(var(--navbar-height-static)+1.5rem)]`, « le pattern
		// atelier/FAQ »). Il verrouillait un DOUBLE comptage : la barre fixe est déjà
		// compensée une fois pour tout le document par
		// `html { scroll-padding-top: var(--navbar-height) }` (`app/globals.css`), et
		// scroll-padding + scroll-margin s'ADDITIONNENT.
		//
		// Mesuré à 1280 avant correction : `/#collections` atterrissait avec 104 px de
		// blanc sous la navbar et son `h2` à 168 px ; après, 0 px et 64 px — soit
		// exactement le `pt-12 lg:pt-16` de la section, qui EST l'air voulu.
		// `#hero` n'a jamais porté de `scroll-mt` et atterrit juste : c'est la preuve
		// que le réglage global suffit.
		expect(section?.className).not.toContain("scroll-mt");
	});

	it("parité de la grammaire d'arrivée : bloc titre en enter-inview, rail dessiné à l'ARRIVÉE", () => {
		renderShell();

		// Constat n° 6 de l'audit 2026-08-06 : cette section était la seule au
		// rail inerte (`animated={false}`) et au bloc titre sans entrée.
		const title = screen.getByRole("heading", { level: 2, name: "Choisis ton univers" });
		expect(title.closest(".enter-inview")).not.toBeNull();
		expect(document.querySelector("path.hand-draw-inview")).not.toBeNull();
	});
});

describe("CollectionsGridSkeleton", () => {
	it("réserve autant de cellules que la grille nominale, toutes muettes pour l'AT", () => {
		render(
			<ul>
				<CollectionsGridSkeleton />
			</ul>,
		);

		const cells = document.querySelectorAll("li");
		expect(cells).toHaveLength(LANDING_COLLECTIONS_COUNT);
		expect(document.querySelectorAll('[aria-hidden="true"]')).toHaveLength(
			LANDING_COLLECTIONS_COUNT,
		);
	});

	it("réserve autant de tirages que la carte pleine, au MÊME cadre — il consomme, il ne recopie pas", () => {
		render(<CollectionsCard collection={makeCollection({ products: makePrintProducts(4) })} />);
		const realFrames = printFrames().length;
		expect(realFrames).toBe(LANDING_PRINT_COUNT);

		cleanup();
		render(<CollectionsCardSkeleton />);

		// Le squelette du carnet des séries avait réservé 112px pour ~202px de
		// contenu — ~90px de saut par bande au swap du <Suspense>. Le correctif
		// n'est pas un nombre plus juste, c'est un CONTRAT : la géométrie est
		// exportée du composant réel et le squelette la consomme. Ce test échoue
		// si un littéral recopié y est réintroduit.
		expect(printFrames()).toHaveLength(realFrames);
	});

	it("réserve la ligne prix dans chaque cellule (parité anti-CLS avec la carte réelle)", () => {
		render(
			<ul>
				<CollectionsGridSkeleton />
			</ul>,
		);

		// `text-sm` × line-height 1.25rem → h-5, la méthode CHAPTER_TEXT_RESERVES.
		const priceReserves = document.querySelectorAll("li .h-5");
		expect(priceReserves).toHaveLength(LANDING_COLLECTIONS_COUNT);
	});
});
