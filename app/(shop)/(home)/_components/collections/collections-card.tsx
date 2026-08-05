import Image from "next/image";
import Link from "next/link";
import { FlowerIcon } from "@phosphor-icons/react/ssr";

import { COLLECTION_TEXTS } from "@/modules/collections/constants/collection-texts.constants";
import type { GetCollectionsReturn } from "@/modules/collections/data/get-collections";
import { extractCollectionImages } from "@/modules/collections/utils/collection-images.utils";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import { dataAccentForSlug } from "@/modules/products/components/catalog-accents.constants";
import {
	CARD_SURFACE_FOCUS,
	CARD_SURFACE_HOVER,
	CARD_SURFACE_POLAROID,
} from "@/shared/components/card-surface.constants";
import { SquiggleUnderline } from "@/shared/components/squiggle-underline";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";

/**
 * Fenêtre média de la carte — CARRÉE, pas `aspect-4/5` : le carré est le
 * format des collections partout ailleurs (tirages du carnet des séries,
 * cartes du méga-menu), quand le 4/5 est celui des bijoux. Sur une page où les
 * deux familles cohabitent, le ratio est ce qui dit « ceci est une porte
 * d'entrée, pas une pièce à acheter ».
 *
 * Partagée carte/squelette : une valeur recopiée des deux côtés est exactement
 * la dérive que `collection-skeleton-parity` a déjà attrapée sur le carnet.
 */
const CARD_MEDIA_CLASSES = "aspect-square rounded-sm";

/**
 * Pose statique alternée (même arbitrage que les cartes du méga-menu : une
 * POSE n'est pas un mouvement, donc pas de `motion-safe:`). Classes
 * LITTÉRALES, jamais interpolées.
 */
const CARD_TILT = ["-rotate-[0.8deg]", "rotate-[0.7deg]"] as const;

/**
 * Largeurs réelles de la carte dans la grille de la section
 * (`grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4`, conteneur `max-w-6xl`),
 * MOINS la marge blanche du cadre (`p-2`/`p-2.5`) :
 *
 * | viewport    | col. | carte              | média        |
 * | ----------- | ---- | ------------------ | ------------ |
 * | < 1024      | 2    | (vw − 48…72) / 2   | ~45vw        |
 * | 1024 → 1151 | 4    | (vw − 64 − 72) / 4 | ~21vw        |
 * | ≥ 1152      | 4    | (1152 − 136) / 4   | **234px**    |
 *
 * Queue en px fixe et non en `vw` : au-delà de `max-w-6xl` la carte ne grandit
 * plus (même méthode que `COLLECTION_IMAGE_SIZES_CARD`).
 */
const CARD_IMAGE_SIZES = "(max-width: 1023px) 46vw, (max-width: 1151px) 21vw, 250px";

interface CollectionsCardProps {
	collection: GetCollectionsReturn["collections"][number];
	/** Index dans la grille — pilote l'alternance du tilt. */
	index: number;
	/**
	 * Plancher de prix, calculé sur TOUS les produits publiés — cf.
	 * `data/get-collection-price-ranges.ts`. Ne jamais le dériver du payload de
	 * la liste, qui ne porte que 4 produits. `min` SEUL, comme sur le chapitre :
	 * la carte n'affiche qu'un « À partir de », et la landing n'émet aucun
	 * JSON-LD (l'`ItemList` de `/` appartient à l'étal) — pas d'`AggregateOffer`
	 * à nourrir d'un `max`.
	 */
	priceRange?: { min: number };
}

/**
 * Carte collection de la section « Choisis ton univers » (landing).
 *
 * @description
 * Même enveloppe que les cartes de l'étal (`CARD_SURFACE_POLAROID` + hover +
 * focus) et même anatomie de légende que `EtalAllCreationsCard` (eyebrow,
 * titre display souligné au survol) : la section prolonge l'étal. Mais son
 * ENCRE est celle du carnet des séries (harmonisation 2026-08-05) : la carte
 * porte `data-accent={dataAccentForSlug(slug)}` — le même hash que la bande de
 * `/collections` et le rail de la page fille, donc le clic ne change pas de
 * couleur en route — et cette encre teinte le squiggle et rien d'autre
 * (contrat des accents : surfaces et traits, jamais le texte ; le ruban a été
 * retiré le 2026-08-05, densité rose en série sur la grille). Le fond
 * reste `bg-card` : la salle colorée (`--section-band`) est le langage bande,
 * pas carte. S'y ajoute le from-price du chapitre (« À partir de X € »).
 * Ce qui distingue la carte d'un bijou reste dit par le média carré
 * (cf. `CARD_MEDIA_CLASSES`) et par l'eyebrow, qui porte le COMPTEUR
 * (« N créations ») — l'information d'orientation que la carte existe pour
 * donner.
 *
 * Stretched link (parité ProductCard/CollectionChapter) : le `<Link>`
 * n'entoure que le titre — la boîte de focus reste à la mesure du texte — et
 * son `::after` z-10 couvre la carte entière. `SquiggleUnderline` se dessine
 * sur `group-hover` ET `group-focus-within` (WCAG 2.4.7, verrouillé par
 * `hover-focus-parity.regression.test.ts`).
 *
 * La photo est DÉCORATIVE (`alt=""`) : la carte s'annonce par son
 * `aria-labelledby`, comme les tirages du carnet des séries. Le premier tirage
 * de `extractCollectionImages` est déjà « le produit mis en avant, sinon le
 * plus récent » (orderBy du select SSOT `GET_COLLECTIONS_SELECT`).
 */
export function CollectionsCard({ collection, index, priceRange }: CollectionsCardProps) {
	const image = extractCollectionImages(collection.products)[0];
	const count = collection._count.products;
	const titleId = `landing-collection-${collection.slug}`;

	return (
		<article
			aria-labelledby={titleId}
			data-accent={dataAccentForSlug(collection.slug)}
			className={cn(
				CARD_SURFACE_POLAROID,
				CARD_SURFACE_HOVER,
				CARD_SURFACE_FOCUS,
				CARD_TILT[index % CARD_TILT.length],
				"motion-safe:can-hover:hover:-translate-y-1 flex flex-col",
			)}
		>
			<div className={cn(CARD_MEDIA_CLASSES, "relative overflow-hidden")}>
				{image ? (
					<Image
						src={image.url}
						alt=""
						fill
						sizes={CARD_IMAGE_SIZES}
						className="object-cover"
						// Section sous la ligne de flottaison : `lazy` (défaut), aucun
						// `preload` — le chemin critique appartient à l'étal.
						quality={IMAGE_QUALITY.THUMBNAIL}
						placeholder={image.blurDataUrl ? "blur" : "empty"}
						blurDataURL={image.blurDataUrl ?? undefined}
					/>
				) : (
					// Collection dont aucun SKU actif ne porte de média IMAGE : une
					// promesse plutôt qu'un carré gris muet (même arbitrage que la carte
					// du méga-menu).
					<div className="bg-muted flex size-full flex-col items-center justify-center gap-1.5">
						<FlowerIcon aria-hidden="true" className="text-muted-foreground size-6" />
						<span className="text-muted-foreground text-xs">Photos à venir</span>
					</div>
				)}
			</div>

			{/* Légende — mêmes gouttières que les cartes de l'étal, pour que les deux
			    grilles de la page respirent pareil. */}
			<div className="flex flex-col gap-1.5 px-1.5 pt-2.5 pb-3 sm:px-2 sm:pt-3 sm:pb-4">
				<span className="text-2xs text-muted-foreground font-semibold tracking-widest uppercase">
					{count > 0 ? COLLECTION_TEXTS.PRODUCT_COUNT(count) : COLLECTION_TEXTS.PRODUCT_COUNT_EMPTY}
				</span>

				<Link
					href={`/collections/${collection.slug}`}
					className="focus-ring block w-fit max-w-full after:absolute after:inset-0 after:z-10 focus-visible:rounded-sm"
				>
					<span className="relative block">
						<span
							id={titleId}
							className="font-display text-foreground line-clamp-2 text-base sm:text-lg"
						>
							{collection.name}
						</span>
						{/* `w-full` : le défaut `w-20` ne couvrirait qu'une partie du nom —
						    même correctif que ProductCard et EtalAllCreationsCard. L'encre
						    suit la série : la carte porte son propre `data-accent`, donc
						    `--section-accent` se résout ici, pas sur une section ancêtre. */}
						<SquiggleUnderline className="w-full" stroke="var(--section-accent)" />
					</span>
				</Link>

				{/* From-price — même ligne que le chapitre. `formatEuro` NU, jamais
				    `{ compact: true }` (« 49,9 € », régression connue). Conditionnel :
				    des produits publiés sans SKU actif donnent un compteur sans
				    fourchette — même mismatch assumé que sur /collections. */}
				{priceRange && (
					<p className="text-foreground text-sm font-medium tabular-nums">
						<span className="text-muted-foreground font-normal">
							{COLLECTION_TEXTS.PRICING.FROM_LABEL}{" "}
						</span>
						{formatEuro(priceRange.min)}
					</p>
				)}
			</div>
		</article>
	);
}

/**
 * Squelette de `CollectionsCard` — mêmes cadre, ratio et gouttières (anti-CLS,
 * même méthode que `ProductCardSkeleton`) : média via `CARD_MEDIA_CLASSES`
 * partagée, puis eyebrow (`text-2xs` → h-3), titre sur UNE ligne réservée
 * (`text-base` → h-6, `sm:text-lg` → sm:h-7) — les noms de collection sont
 * courts, une ligne est le cas dominant ; `line-clamp-2` sur la carte réelle
 * absorbe l'exception — et la ligne prix (`text-sm` × line-height 1.25rem →
 * h-5, méthode `CHAPTER_TEXT_RESERVES.price` ; le cas dominant est fourchette
 * présente).
 */
export function CollectionsCardSkeleton({ index }: { index: number }) {
	return (
		<div
			aria-hidden="true"
			className={cn(CARD_SURFACE_POLAROID, CARD_TILT[index % CARD_TILT.length], "flex flex-col")}
		>
			<div className={cn(CARD_MEDIA_CLASSES, "bg-muted motion-safe:animate-pulse")} />
			<div className="flex flex-col gap-1.5 px-1.5 pt-2.5 pb-3 sm:px-2 sm:pt-3 sm:pb-4">
				<div className="bg-muted h-3 w-20 rounded motion-safe:animate-pulse" />
				<div className="bg-muted h-6 w-28 rounded motion-safe:animate-pulse sm:h-7" />
				<div className="bg-muted h-5 w-24 rounded motion-safe:animate-pulse" />
			</div>
		</div>
	);
}
