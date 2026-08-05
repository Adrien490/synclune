import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — seules les primitives Next le sont : c'est le rendu RÉEL des cartes
// (cadre polaroid, légende, squiggle) qu'on teste, comme `etal-section.test.tsx`.
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

import { CollectionsCard } from "../collections-card";
import {
	CollectionsGrid,
	CollectionsGridSkeleton,
	LANDING_COLLECTIONS_COUNT,
} from "../collections-grid";

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

	it("montre une promesse (« Photos à venir ») quand aucun SKU actif ne porte d'image", () => {
		const collection = makeCollection({ products: [] });

		render(<CollectionsCard collection={collection} index={0} />);

		expect(screen.getByText("Photos à venir")).toBeInTheDocument();
		expect(document.querySelector("img")).toBeNull();
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
		render(<CollectionsCard collection={makeCollection()} index={0} />);

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
		render(<CollectionsCard collection={makeCollection()} index={0} priceRange={{ min: 4990 }} />);
		expect(screen.getByText(/49,90\s*€/)).toBeInTheDocument();

		cleanup();

		render(<CollectionsCard collection={makeCollection()} index={0} priceRange={{ min: 5000 }} />);
		expect(screen.getByText(/50,00\s*€/)).toBeInTheDocument();
	});

	it("omet la ligne prix sans fourchette (compteur sans SKU actif), carte rendue quand même", () => {
		render(<CollectionsCard collection={makeCollection()} index={0} />);

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
