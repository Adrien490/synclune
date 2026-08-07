import Image from "next/image";
import Link from "next/link";

import {
	ABOVE_FOLD_THRESHOLD,
	COLLECTION_CHAPTER_PRINT_COUNT,
	COLLECTION_CHAPTER_PRINT_SIZES,
} from "@/modules/collections/constants/image-sizes.constants";
import { COLLECTION_TEXTS } from "@/modules/collections/constants/collection-texts.constants";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import { dataAccentForSlug } from "@/modules/products/components/catalog-accents.constants";
import { HandDrawnUnderline } from "@/shared/components/animations/hand-drawn-accent";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";
import type { CollectionImage } from "../types/collection.types";

/**
 * UNE seule qualité pour les trois tirages.
 *
 * Ils demandent tous les MÊMES largeurs (`COLLECTION_CHAPTER_PRINT_SIZES`) : le
 * tirage 0 à q80 et ses voisins à q65 faisaient facturer deux jeux de variantes
 * `/_next/image` pour un rendu identique — 3 images × jusqu'à 20 bandes. Le
 * plafond réel est 180px (`size-45`), le domaine des vignettes.
 */
const CHAPTER_PRINT_QUALITY = IMAGE_QUALITY.THUMBNAIL;

/**
 * Conteneur interne de la bande — MIROIR EXACT dans
 * `collection-chapters-skeleton.tsx` via cet export (verrouillé par
 * `collection-skeleton-parity.regression.test.ts`) : deux littéraux séparés
 * avaient divergé du temps de la grille, le squelette dessinait une autre page.
 *
 * ⚠️ Les deux colonnes n'arrivent qu'à `lg`, et pas à `sm`. La piste `auto` se
 * dimensionne sur le max-content des tirages (384px à `sm`, 540px à `lg`) et la
 * piste `1fr` prend le reste : à 640px de viewport il ne restait que **168px**
 * pour un titre de 2rem et une description de 15px (`640 − 48 − 40 − 384`). En
 * empilé jusqu'à 1024px, la colonne texte vaut 592px à 640, 720px à 768, puis
 * 380px une fois en deux colonnes — et `max-w-[38ch]` redevient atteignable.
 *
 * `minmax(0,1fr)` et non `1fr` : sans le `min-width: 0`, un nom de collection
 * insécable élargirait la colonne texte et pousserait les tirages hors bande.
 */
export const CHAPTER_CONTAINER_CLASSES =
	"mx-auto grid max-w-6xl grid-cols-1 items-center gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10 lg:px-8 lg:py-12";

/** Cadre papier d'un tirage — bordure blanche + ombre papier (partagé skeleton). */
export const CHAPTER_PRINT_FRAME_CLASSES =
	"bg-card relative flex-none rounded-sm p-1.5 pb-4 shadow-paper sm:p-2 sm:pb-5";

/** Fenêtre photo d'un tirage — largeurs FIXES, cf. `COLLECTION_CHAPTER_PRINT_SIZES`. */
export const CHAPTER_PRINT_MEDIA_CLASSES =
	"relative size-24 overflow-hidden rounded-[3px] sm:size-30 lg:size-45";

/**
 * Chevauchement des tirages — 24px à tous les paliers.
 *
 * Constante et non littéral : l'ancien `-ml-3 lg:-ml-4` était RECOPIÉ dans le
 * squelette, exactement la dérive que le test de parité prétend interdire. La
 * valeur unique corrige au passage un débord horizontal à 320px (3 cadres de
 * 108px chevauchés de 12px = 300px pour 288px utiles).
 */
export const CHAPTER_PRINT_OVERLAP_CLASSES = "-ml-6";

/**
 * Bande de tirages — sous le texte jusqu'à `lg`, colonne de droite au-delà.
 *
 * Partagée par les deux branches (avec et sans photo) ET par le squelette : les
 * trois doivent produire la même empreinte, sinon la hauteur de bande dépend de
 * l'état des données.
 */
export const CHAPTER_PRINT_STRIP_CLASSES =
	"flex items-center justify-start pt-1 lg:justify-end lg:pt-0";

/**
 * Empilement des bandes — consommé par `collection-chapters.tsx` ET le squelette.
 *
 * Le séparateur n'est pas décoratif : `accentForSlug` n'a que 4 seaux et aucune
 * anti-collision, donc deux collections voisines tirant le même accent forment
 * sinon une seule bande continue (ΔE 0 entre elles).
 */
export const CHAPTER_STACK_CLASSES = "divide-border flex flex-col divide-y";

/**
 * Réserves verticales de la colonne texte — SSOT consommée par le squelette.
 *
 * Chaque valeur est le PRODUIT `font-size × line-height` de l'élément réel, pas
 * un nombre choisi à l'œil ; `collection-skeleton-parity.regression.test.ts`
 * refait le calcul depuis la source, donc changer `leading-[1.1]` sans
 * recalculer ici échoue. Le squelette réservait 112px pour ~202px de réel
 * (description sur 4 lignes annoncée sur 1, trait de 16px non réservé, `gap-3`
 * contre des marges) : ~90px de décalage par bande au swap du `<Suspense>`.
 */
export const CHAPTER_TEXT_RESERVES = {
	/** `text-2xs` → line-height 0.875rem (globals.css). */
	eyebrow: "h-3.5",
	/** 1.75 / 2 / 2.5rem × `leading-[1.1]`. */
	title: "mt-2 h-[1.925rem] sm:h-[2.2rem] lg:h-[2.75rem]",
	/** Boîte NATIVE de `HandDrawnUnderline` : viewBox 120 × 20. */
	underline: "-mt-1 -mb-1 h-5 w-30",
	/**
	 * DEUX lignes réservées, et le `<p>` réel porte le même `min-h` : une
	 * description d'une seule ligne occupe donc la place de deux, et le cas
	 * courant (description + prix présents) ne décale plus rien.
	 * 2 × 0.875rem × 1.625 (`text-sm leading-relaxed`), puis 2 × 0.9375rem × 1.625.
	 */
	description: "mt-3 min-h-[2.84375rem] sm:min-h-[3.046875rem]",
	/** `text-sm` → line-height 1.25rem. */
	price: "mt-2.5 h-5",
} as const;

/**
 * Rotations de repos des trois tirages (gatées `motion-safe` : sous
 * `prefers-reduced-motion` les tirages sont droits d'emblée, et le redressement
 * n'anime rien). Le tirage du milieu passe au-dessus (`z-[2]`) — sous le
 * stretched link (`::after` z-10), qui reste la seule cible de clic.
 */
export const CHAPTER_PRINT_ROTATIONS = [
	"motion-safe:-rotate-3",
	"motion-safe:rotate-2 z-[2]",
	"motion-safe:-rotate-[1.5deg]",
] as const;

interface CollectionChapterProps {
	slug: string;
	name: string;
	/** Tirages de la bande (au plus 4 en donnée, 3 rendus). */
	images?: CollectionImage[];
	/** Index dans le carnet — pilote le budget `eager` (chapitres above-fold). */
	index?: number;
	/** Niveau de heading pour hierarchie a11y (defaut: h2). */
	headingLevel?: "h2" | "h3" | "h4";
	/** Nombre de produits dans la collection. */
	productCount?: number;
	/** Description courte de la collection. */
	description?: string | null;
	/**
	 * Plancher de prix, calculé sur TOUS les produits publiés — cf.
	 * `data/get-collection-price-ranges.ts`. Ne jamais le dériver du payload de
	 * la liste, qui ne porte que 4 produits.
	 *
	 * ⚠️ `min` SEUL : la bande n'affiche qu'un « À partir de ». Le `max` de
	 * `CollectionPriceRange` sert au `AggregateOffer` du JSON-LD, chez
	 * l'assembleur — le déclarer ici promettrait une fourchette qu'on ne rend pas.
	 */
	priceRange?: { min: number };
}

/**
 * Bande de collection — « Le carnet des séries » (redesign 2026-08-05, artifact
 * 4ᵉ passe ; remplace la carte « Planche-contact » sur `/collections`).
 *
 * Doctrine de la carte collection : elle doit montrer un ENSEMBLE. C'est la
 *   surface la PLUS conforme des trois (6/7, § 11) : 3 tirages, les deux
 *   nombres, une description, et une géométrie qui n'emprunte rien au polaroid.
 *   Sa silhouette (« la pile décalée ») est la S2 du § 5 — retenue ICI et pas
 *   ailleurs parce que le chevauchement demande de la place : il ne tient pas
 *   sous ~90 px, donc pas dans le méga-menu.
 *
 * @description
 * `/collections` n'est plus une grille de cartes : chaque série est un CHAPITRE
 * pleine largeur qui possède sa couleur. L'encre vient de `dataAccentForSlug`
 * — le MÊME hash que le rail de la page fille (`accentForSlug`), donc le clic
 * ne change plus de couleur en route (P2 de l'audit). `data-accent` expose
 * `--section-accent`/`--section-band` (cf. `app/styles/section-accents.css`) :
 * le fond de la bande et le trait sous le titre (`HandDrawnUnderline`, dessiné
 * au SCROLL) en dérivent tous les deux. Conformément au
 * contrat des accents (`catalog-accents.constants.ts`), ils ne portent que des
 * SURFACES et des traits — jamais l'encre du texte.
 *
 * ⚠️ Le fond est `--section-band` et non `--section-soft` : ce dernier vaut 5 %
 * d'alpha, soit ΔE OKLab ≈ 0,008 sur `--background` — imperceptible, alors que
 * la prémisse du redesign est que chaque série possède sa couleur. Il reste en
 * place pour ses autres consommateurs, qui teintent des CONTRÔLES, pas des
 * salles.
 *
 * Pattern stretched-link (parité carte) : `<article relative>`, `<Link>` autour
 * du titre avec `::after` z-10 qui couvre la bande entière. Les tirages sont
 * sous ce calque (`z-[2]` max).
 *
 * ⚠️ Le trait dessiné est FRÈRE du lien, pas son enfant, et il garde sa
 * géométrie NATIVE (aucun `width`/`height`). Les deux vont ensemble : le
 * viewBox est `0 0 120 20`, donc tout couple de ratio ≠ 6:1 letterboxe le
 * tracé (`preserveAspectRatio` valant `xMidYMid meet` par défaut) — `210×16`
 * le rendait sur 93px décalés de 59px vers la droite — et un SVG de 210px dans
 * un `<Link w-fit>` élargissait la boîte de focus à 210px autour d'un titre de
 * ~100px.
 *
 * Les tirages sont DÉCORATIFS (`alt=""`, pas de `role="group"`) — même
 * arbitrage que le bento de l'ancienne carte (audit 2026-08-04) : la bande
 * s'annonce par son `aria-labelledby`, les bijoux ne sont atteignables que sur
 * la page de la collection. Au survol (`can-hover`) comme au focus clavier
 * (`focus-within`, PAS derrière `can-hover:`), les tirages se redressent —
 * 300 ms ease-out, la transition de `CARD_SURFACE_POLAROID` réutilisée.
 * Tactile : pas de cue supplémentaire, arbitrage rendu le 2026-08-05.
 */
export function CollectionChapter({
	slug,
	name,
	images,
	index,
	headingLevel: HeadingTag = "h2",
	productCount,
	description,
	priceRange,
}: CollectionChapterProps) {
	const titleId = `collection-title-${slug}`;
	const collectionUrl = `/collections/${slug}`;
	const accent = dataAccentForSlug(slug);

	// Budget eager : 1 seule image par bande (le tirage 0), bandes above-fold
	// uniquement — transposition du budget de la carte (`@regression
	// collection-chapter-eager-budget`, le défaut ×12 a déjà été payé).
	//
	// ⚠️ Aucun `preload` ni `fetchPriority="high"` ici, volontairement : le
	// candidat LCP de `/collections` est du TEXTE (le h1, ou le h2 de la bande 0),
	// pas un tirage décoratif de 96px (mobile) à 180px (lg) en `alt=""`. Winky
	// Sans est déjà `preload: true` — un `<link rel="preload">` d'image lui
	// disputait la bande passante d'ouverture.
	const isAboveFold = (index ?? 0) < ABOVE_FOLD_THRESHOLD;

	// ⚠️ Cette forme exacte, et pas `Boolean(images?.length)` : c'est elle qui
	// narrowe `images` en `CollectionImage[]` plus bas (TS n'analyse un alias que
	// depuis une expression de garde — leçon de l'audit 2026-08-05).
	const hasImages = images !== undefined && images.length > 0;

	// Eyebrow — jamais vide (le squelette réserve la ligne) : compteur, sinon
	// « Bientôt », sinon le repli. Pas de préfixe « Collection · » (retiré le
	// 2026-08-05, cf. `CARD_EYEBROW_FALLBACK`).
	const eyebrow =
		productCount !== undefined
			? productCount > 0
				? COLLECTION_TEXTS.PRODUCT_COUNT(productCount)
				: COLLECTION_TEXTS.PRODUCT_COUNT_EMPTY
			: COLLECTION_TEXTS.CARD_EYEBROW_FALLBACK;

	// Le mot d'atelier suit le COMPTEUR, il ne le contredit pas : des produits
	// publiés dont aucun SKU actif ne porte de média IMAGE donnaient « 12
	// créations » au-dessus de « encore sur l'établi… ».
	const emptyNote =
		productCount !== undefined && productCount > 0
			? COLLECTION_TEXTS.CHAPTER_EMPTY_NOTE_NO_PHOTO
			: COLLECTION_TEXTS.CHAPTER_EMPTY_NOTE;

	return (
		<article
			aria-labelledby={titleId}
			data-accent={accent}
			className="group relative bg-(--section-band)"
		>
			<div className={CHAPTER_CONTAINER_CLASSES}>
				{/* Légende du chapitre — pas de position:relative : le ::after du
				    stretched link s'ancre sur l'<article>. */}
				<div className="flex flex-col">
					<span className="text-2xs text-muted-foreground font-semibold tracking-widest uppercase">
						{eyebrow}
					</span>

					{/* Stretched link : toute la bande est la cible. Le lien n'entoure QUE
					    le titre — c'est ce qui garde `focus-ring` à la mesure du texte. */}
					<Link
						href={collectionUrl}
						className="focus-ring mt-2 block w-fit max-w-full after:absolute after:inset-0 after:z-10 focus-visible:rounded-sm"
					>
						<HeadingTag
							id={titleId}
							className="font-display text-foreground wrap-break-words text-[1.75rem] leading-[1.1] font-light tracking-[-0.02em] sm:text-[2rem] lg:text-[2.5rem]"
						>
							{name}
						</HeadingTag>
					</Link>

					{/* Trait d'encre — géométrie native (120 × 20), dessiné au SCROLL,
					    suit --section-accent. Toujours rendu : le squelette le réserve. */}
					<HandDrawnUnderline strokeWidth={2} className="-mt-1 -mb-1 block" />

					{/* Description : visible sur TOUS les viewports — la bande a le budget
					    vertical que la carte n'avait pas en mobile. `line-clamp-3` borne
					    une description-fleuve ET garantit qu'à `lg` la colonne texte ne
					    dépasse jamais la bande de tirages (hauteur de bande déterministe).
					    La mesure suit la colonne : large en empilé, 38ch en deux colonnes. */}
					{description && (
						<p
							className={cn(
								CHAPTER_TEXT_RESERVES.description,
								"text-muted-foreground line-clamp-3 max-w-[60ch] text-sm leading-relaxed sm:text-[0.9375rem] lg:max-w-[38ch]",
							)}
						>
							{description}
						</p>
					)}

					{/* From-price — préfixe conservé y compris quand min = max.
					    ⚠️ `formatEuro` NU, jamais `{ compact: true }` : le format compact
					    a `minimumFractionDigits: 0` et rendait « 49,9 € ». */}
					{priceRange && (
						<p className="text-foreground mt-2.5 text-sm font-medium tabular-nums">
							<span className="text-muted-foreground font-normal">
								{COLLECTION_TEXTS.PRICING.FROM_LABEL}{" "}
							</span>
							{formatEuro(priceRange.min)}
						</p>
					)}
				</div>

				{/* Tirages — chevauchés, redressés au survol/focus. */}
				{hasImages ? (
					<div className={CHAPTER_PRINT_STRIP_CLASSES}>
						{images.slice(0, COLLECTION_CHAPTER_PRINT_COUNT).map((image, printIndex) => (
							<div
								// Par INDEX, pas par URL : la même photo peut servir deux produits
								// d'une même série (dédup par produit dans extractCollectionImages,
								// pas par URL) — et la liste est statique, jamais réordonnée.
								key={printIndex}
								className={cn(
									CHAPTER_PRINT_FRAME_CLASSES,
									CHAPTER_PRINT_ROTATIONS[printIndex],
									printIndex > 0 && CHAPTER_PRINT_OVERLAP_CLASSES,
									// Redressement : hover gaté can-hover (sticky-hover iOS),
									// focus JAMAIS derrière can-hover (clavier sur tactile).
									// L'ombre garde sa transition sous reduced-motion (une ombre
									// qui s'estompe n'est pas un déplacement, WCAG 2.3.3) ; seul
									// le mouvement est gaté, sinon l'ombre SAUTAIT. `rotate` et non
									// `transform` : TW v4 compile `rotate-0` vers la propriété
									// autonome `rotate`, que `transition: transform` n'anime pas.
									"transition-[box-shadow] duration-300 ease-out motion-safe:transition-[rotate,box-shadow]",
									"motion-safe:can-hover:group-hover:rotate-0 group-focus-within:rotate-0",
									"can-hover:group-hover:shadow-md group-focus-within:shadow-md",
								)}
							>
								<div className={CHAPTER_PRINT_MEDIA_CLASSES}>
									<Image
										src={image.url}
										alt=""
										fill
										sizes={COLLECTION_CHAPTER_PRINT_SIZES}
										className="object-cover"
										loading={isAboveFold && printIndex === 0 ? "eager" : "lazy"}
										placeholder={image.blurDataUrl ? "blur" : "empty"}
										blurDataURL={image.blurDataUrl ?? undefined}
										quality={CHAPTER_PRINT_QUALITY}
									/>
								</div>
							</div>
						))}
					</div>
				) : (
					/* Chapitre sans photo : un cadre en pointillé et un mot à la main —
					   décoratif (aria-hidden) : l'eyebrow porte l'information chiffrée, la
					   note ne fait que la refléter (cf. `emptyNote`). L'empreinte est celle
					   d'un tirage, aux mêmes constantes : les deux branches produisent la
					   même hauteur de bande, et le squelette recouvre les deux. */
					<div aria-hidden="true" className={CHAPTER_PRINT_STRIP_CLASSES}>
						<div
							className={cn(
								CHAPTER_PRINT_FRAME_CLASSES,
								"border-border bg-card/60 border-2 border-dashed shadow-none motion-safe:-rotate-2",
							)}
						>
							<div className={cn(CHAPTER_PRINT_MEDIA_CLASSES, "flex items-center justify-center")}>
								<span className="font-cursive text-muted-foreground -rotate-3 px-2 text-center text-sm leading-snug lg:text-base">
									{emptyNote}
								</span>
							</div>
						</div>
					</div>
				)}
			</div>
		</article>
	);
}
