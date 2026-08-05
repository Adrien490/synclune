import type { CSSProperties, ReactNode } from "react";

import { RAIL_ACCENTS } from "@/modules/products/components/catalog-accents.constants";
import { BRAND } from "@/shared/constants/brand";
import {
	HAND_DRAWN_DURATIONS_MS,
	HAND_DRAWN_STROKES,
} from "@/shared/components/hand-drawn/constants";
import {
	RAIL_MONO_STROKE_PATH,
	RAIL_STROKE_PATHS,
	RAIL_VIEWBOX,
} from "@/shared/components/hand-drawn/paths";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/cn";

/**
 * Couleur de trait de chaque accent de marque. `RAIL_ACCENTS` reste la SSOT
 * (des classes `bg-*`, consommées telles quelles par le carton d'étal) ; cette
 * table n'en est que la projection `stroke-*` — Tailwind ne générant que les
 * classes écrites en littéral, une dérivation `bg → stroke` par chaîne ne
 * compilerait pas.
 */
const STROKE_CLASS_BY_ACCENT: Record<(typeof RAIL_ACCENTS)[number], string> = {
	"bg-primary": "stroke-primary",
	"bg-brand-lavender": "stroke-brand-lavender",
	"bg-brand-mint": "stroke-brand-mint",
	"bg-brand-sun": "stroke-brand-sun",
};

/**
 * Dessin des touches : 800 ms chacune, décalées de 120 ms — SSOT
 * `shared/components/hand-drawn/constants.ts` (le rail est la vitesse
 * « pinceau », distincte du trait à 500 ms — deux vitesses nommées, plus deux
 * constantes qui s'ignorent). Ré-exportées : `BrushHighlight` (home) se cale
 * sur ce tempo pour se dessiner en 5ᵉ temps du stagger.
 * Les tracés eux-mêmes vivent dans `shared/components/hand-drawn/paths.ts`.
 */
export const STROKE_DURATION_MS = HAND_DRAWN_DURATIONS_MS.rail;
export const STROKE_STAGGER_MS = HAND_DRAWN_DURATIONS_MS.railStagger;
export const RAIL_STROKE_COUNT = RAIL_STROKE_PATHS.length;

/**
 * Marges du bloc d'accents — partagées entre le composant et son squelette
 * (parité CLS), et calibrées pour que la hauteur totale du bloc soit CELLE DE
 * L'ANCIEN RAIL : 6+12+8 = 26 px sous `sm`, 8+12+12 = 32 px au-dessus —
 * l'ancien rail faisait 8+6+12 et 10+6+16. Zéro décalage au changement de
 * direction, zéro décalage au swap squelette → page.
 */
const RAIL_WRAPPER_CLASS = "mt-1.5 mb-2 flex sm:mt-2 sm:mb-3";

/**
 * Le rail d'accents, version « Les quatre touches » : des touches de pinceau
 * SVG qui se dessinent au montage (`hand-draw-load`, entrance.css — sous
 * `prefers-reduced-motion`, touches déjà sèches ; c'est une animation CSS
 * classique, le guard `animation-timeline` d'entrance.css ne concerne que
 * `-inview`). Pour un rail SOUS la ligne de flottaison, `inView` bascule sur
 * la timeline `view()` — cf. la JSDoc de la prop.
 *
 * Consommé aussi par `EtalHeading` (home) : les marges du wrapper restent la
 * décision de l'appelant — seul le storefront passe par `RAIL_WRAPPER_CLASS`.
 *
 * `preserveAspectRatio="none"` est sûr ici pour la même raison que dans
 * `squiggle-underline.tsx` : la hauteur rendue (h-3 = 12 px) EST celle du
 * viewBox, donc l'échelle Y vaut 1 et l'épaisseur du trait ne bouge pas —
 * seule la largeur se comprime entre les breakpoints (échelle X 0,73 à w-32 :
 * les courbures se tassent un peu, l'épaisseur non — mesuré, assumé).
 *
 * Deux propriétés du dessin, mesurées et ASSUMÉES (audit 79/100 du
 * 2026-08-05) — ne pas les « corriger » sans direction :
 * - le keyframe `hand-draw` partagé finit le trait à 60 % (la fin de courbe
 *   anime `fill-opacity`, no-op ici : le SVG est `fill="none"`) — les 800 ms
 *   déclarées dessinent donc ~480 ms effectives, et c'est sur CE tempo que
 *   `BrushHighlight` se cale ;
 * - la touche mono couvre ~98 % du viewBox là où les quatre touches en
 *   couvrent ~82 % : la touche unique est VOULUE plus pleine (c'est
 *   l'identité d'une page fille), les quatre tiennent par leur rythme.
 */
export function HandDrawnRail({
	accent,
	animated = true,
	inView = false,
	className,
}: {
	accent: "rail" | (typeof RAIL_ACCENTS)[number];
	animated?: boolean;
	/**
	 * `true` : le tracé se joue à l'ARRIVÉE dans le viewport
	 * (`hand-draw-inview`, timeline `view()`) au lieu du montage — pour une
	 * section sous la ligne de flottaison (FAQ), où `hand-draw-load` se serait
	 * joué avant que quiconque l'atteigne. Même repli que `HandDrawnAccent` :
	 * Safari ≤ 18 et reduced-motion voient le trait déjà sec.
	 * ⚠️ Réservé aux accents MONO : sous une timeline `view()`, le progrès est
	 * piloté par le défilement et `--hand-delay` ne décale plus rien — les
	 * quatre touches de `accent="rail"` se dessineraient d'un seul geste.
	 */
	inView?: boolean;
	className?: string;
}) {
	const strokes =
		accent === "rail"
			? RAIL_STROKE_PATHS.map((d, index) => ({
					d,
					strokeClass: STROKE_CLASS_BY_ACCENT[RAIL_ACCENTS[index]!],
					delayMs: index * STROKE_STAGGER_MS,
				}))
			: [{ d: RAIL_MONO_STROKE_PATH, strokeClass: STROKE_CLASS_BY_ACCENT[accent], delayMs: 0 }];

	return (
		<svg
			viewBox={RAIL_VIEWBOX}
			preserveAspectRatio="none"
			fill="none"
			aria-hidden="true"
			focusable="false"
			className={cn("pointer-events-none h-3 w-32 sm:w-36 lg:w-44", className)}
		>
			{strokes.map(({ d, strokeClass, delayMs }) => (
				<path
					key={d}
					d={d}
					pathLength={1}
					strokeWidth={HAND_DRAWN_STROKES.pinceau}
					strokeLinecap="round"
					className={cn(strokeClass, animated && (inView ? "hand-draw-inview" : "hand-draw-load"))}
					style={
						animated
							? ({
									"--hand-duration": `${STROKE_DURATION_MS}ms`,
									"--hand-delay": `${delayMs}ms`,
								} as CSSProperties)
							: undefined
					}
				/>
			))}
		</svg>
	);
}

/**
 * Sur-titre d'atelier — le défaut de TOUTES les pages boutique, home comprise.
 *
 * ⚠️ SSOT récupérée le 2026-08-05. La chaîne vivait en DEUX littéraux sans lien :
 * ici comme valeur par défaut de `eyebrow`, et en dur dans `etal-heading.tsx`.
 * Cinq routes prenaient le défaut, la page d'accueil avait sa copie — donc reformuler
 * le sur-titre côté partagé laissait diverger, en silence, la seule page que tout le
 * monde regarde. C'est le motif que le dépôt venait de corriger deux fois : les deux
 * `<p>` du chapô, et les quatre classes du rail (passées à `RAIL_ACCENTS`).
 *
 * L'apostrophe est droite (U+0027), comme le rendait l'entité `&apos;` des deux
 * littéraux : la changer en apostrophe typographique casserait les assertions de
 * texte sans rien apporter au rendu.
 */
export const STOREFRONT_EYEBROW = `L'atelier de Léane · ${BRAND.contact.location.city}`;

/**
 * Classes du `<p>` d'eyebrow — SSOT au même titre que la chaîne ci-dessus, et
 * pour la même raison : `etal-heading.tsx` (home) rend le même sur-titre hors
 * de `StorefrontHeading`, et une copie des classes divergerait en silence au
 * premier retuning typographique (le défaut exact que `STOREFRONT_EYEBROW` a
 * corrigé pour le texte, rejoué au niveau du style — audit 79/100 du
 * 2026-08-05).
 */
export const STOREFRONT_EYEBROW_CLASS =
	"text-muted-foreground text-[0.8125rem] tracking-[0.09em] uppercase";

export type StorefrontHeadingProps = {
	/** Titre de la page — l'unique `h1`, visible à TOUS les viewports. */
	title: string;
	/** Sur-titre. Défaut : « L'atelier de Léane · {ville} ». */
	eyebrow?: string;
	/**
	 * Accents décoratifs (`aria-hidden`) :
	 * - `"rail"` (défaut) : les quatre touches de pinceau de marque ;
	 * - un membre de `RAIL_ACCENTS` : une seule touche, plus longue —
	 *   l'identité d'une page fille (`accentForSlug`) ;
	 * - `false` : aucun accent.
	 */
	accent?: "rail" | (typeof RAIL_ACCENTS)[number] | false;
	/**
	 * Chapô. La visibilité par breakpoint se règle par `descriptionClassName`
	 * (le budget vertical mobile reste la décision de l'appelant) — plus par un
	 * `<span>` masqué DANS le chapô, qui laissait le `<p>` hôte imprimer sa
	 * marge haute sous `sm` (10 px fantômes, lot 0 de l'audit 2026-08-05).
	 */
	description?: ReactNode;
	/** Classes du `<p>` de chapô — typiquement `hidden sm:block`. */
	descriptionClassName?: string;
	/**
	 * Ligne streamée (compteur). L'appelant fournit SA frontière `Suspense` —
	 * c'est ce qui garde le `h1` hors de toute attente. Rendue dans un `<p>`
	 * `empty:hidden` : quand le compte résolu ne rend rien (état vide), la
	 * marge du paragraphe disparaît avec lui. Le fallback doit être un élément
	 * inline (`Skeleton as="span"`).
	 */
	countSlot?: ReactNode;
	/**
	 * Fait du `<p>` du compteur une région vivante (`role="status"`, donc polie et
	 * atomique). À n'activer que là où le contenu se recompose SANS changement de
	 * page — le catalogue filtré au rail desktop, où cocher un critère remplace la
	 * grille en place : sans ça, un lecteur d'écran coche et n'entend rien.
	 *
	 * ⚠️ Le `<p>` reste `empty:hidden`, donc `display: none` quand le compte est
	 * vide — un passage à « 0 pièce » n'est pas annoncé ici. C'est l'état vide de
	 * la grille qui porte ce cas, avec son action de réinitialisation.
	 */
	countLive?: boolean;
	/**
	 * `h2` `sr-only` en FIN de bloc : comble le saut de niveau vers les titres
	 * des cartes (WCAG 1.3.1) sans ajouter un titre de section visible. Omis
	 * quand le contenu porte déjà ses propres `h2`.
	 */
	listLabel?: string;
	/** Classes du `<div>` hôte du bloc. */
	className?: string;
};

/**
 * Bloc titre du storefront — l'en-tête des pages boutique, à la place de
 * l'ancienne bande `PageHeader`.
 *
 * @description
 * Direction « L'étal continue » (artifact /produits du 2026-08-05), rail passé
 * aux « quatre touches » (artifact bloc titre du 2026-08-05, reco B) : une page
 * boutique n'a pas de bande d'en-tête. Son titre est du texte posé sur le
 * papier — eyebrow d'atelier, touches de pinceau, `h1`, chapô — monté en tête
 * de page, au-dessus du contenu (re-tranché le 2026-08-05 : plus aucune route
 * ne le rend en cellule de la grille de produits).
 *
 * ## Ce que la structure garantit
 *
 * - **Le `h1` est VISIBLE à tous les viewports.** L'ancien montage masquait le
 *   `PageHeader` sous `sm` avec au mieux un repli `sr-only` : la page
 *   n'affichait plus un seul mot en mobile.
 * - **Le composant est SYNCHRONE.** Toute donnée streamée passe par `countSlot`,
 *   avec la frontière `Suspense` chez l'appelant : la lecture des données ne
 *   peut pas retarder l'élément qui porte le LCP, et c'est pour lui que
 *   la display est préchargée.
 * - **Le bloc n'a ni cadre, ni fond, ni ruban** — c'est ce qui l'empêche de se
 *   lire comme une carte de plus au milieu d'une grille.
 * - **Le squelette est un miroir au pixel** — verrouillé par
 *   `storefront-heading-skeleton-parity.regression.test.tsx` : chaque ligne
 *   réservée reflète la ligne réelle, et une ligne retirée d'un côté doit
 *   l'être de l'autre (le défaut d'origine était une ligne réelle sans miroir :
 *   ~40 px de CLS sur toutes les routes à `loading.tsx`).
 *
 * `PageHeader` survit pour les pages légales et l'admin (variant compact) —
 * il n'est plus un composant storefront.
 */
export function StorefrontHeading({
	title,
	eyebrow,
	accent = "rail",
	description,
	descriptionClassName,
	countSlot,
	countLive = false,
	listLabel,
	className,
}: StorefrontHeadingProps) {
	return (
		<div className={cn(className)}>
			<p className={STOREFRONT_EYEBROW_CLASS}>{eyebrow ?? STOREFRONT_EYEBROW}</p>

			{/* Les touches de pinceau : le dernier trait du storefront encore tiré à
			    la règle est passé au vocabulaire main (squiggle, tape, hand-drawn).
			    Une seule touche quand la page a une identité propre (couleur de
			    famille, de collection). Purement décoratif : le titre porte le sens. */}
			{accent !== false && (
				<div aria-hidden="true" className={RAIL_WRAPPER_CLASS}>
					<HandDrawnRail accent={accent} />
				</div>
			)}

			{/* La correction optique `-ml-[0.055em]` de Fraunces ne revient PAS, et c'est
			    mesuré : le bord d'encre du « D » de Winky Sans tombe à 0,7 % d'em à
			    DROITE de l'origine du crayon (contre ~5,5 % à gauche pour Fraunces), soit
			    0,2 px au corps de ce bloc. Sous le seuil de visibilité (mesure du
			    2026-08-05, cf. `etal-heading.tsx`).
			    L'échelle reste SOUS le `clamp(2.5rem, 4.6vw, 4rem)` de la page
			    d'accueil : ce sont des pages filles, elles ne crient pas plus fort
			    que leur mère.
			    La borne `md:max-w-[20ch]` vient aussi de `etal-heading.tsx` : entre
			    768 et ~870 px la cellule est pleine largeur pendant que le clamp
			    colle à son plancher — sans borne, un titre long s'étire en une seule
			    ligne d'un bord à l'autre (défaut déjà payé sur la home). */}
			<h1 className="font-display wrap-break-words text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.06] font-light tracking-[-0.02em] md:max-w-[20ch] lg:max-w-none">
				{title}
			</h1>

			{description && (
				<p
					className={cn(
						"text-muted-foreground mt-2.5 max-w-[42ch] text-[0.9375rem] leading-relaxed sm:mt-3 sm:text-base",
						descriptionClassName,
					)}
				>
					{description}
				</p>
			)}

			{/* La ligne streamée mérite sa ligne, pas un gris de 14 px sous les
			    filtres. Sa frontière `Suspense` vit chez l'appelant : c'est elle qui
			    garde le `h1` hors de toute attente. `empty:hidden` : les compteurs
			    rendent `null` à zéro résultat — sans lui, le paragraphe vide gardait
			    sa marge haute sur tout état vide. */}
			{countSlot && (
				<p
					className="text-muted-foreground mt-2 text-[0.9375rem] empty:hidden sm:text-base"
					// Pas de wrapper interne : un élément enfant ferait échouer
					// `:empty`, et la marge du paragraphe réapparaîtrait à l'état vide.
					role={countLive ? "status" : undefined}
				>
					{countSlot}
				</p>
			)}

			{/* ⚠️ Pas de signature « — Léane » ici, et ce n'est pas un oubli : le
			    storefront ne signe qu'UNE fois par page, dans le pied de page (cf.
			    `footer.tsx`, « la zone de signature »). Ce bloc-ci est monté sur
			    /produits, /produits/[type], /collections, /collections/[slug] et
			    /favoris — une signature au défaut en mettait donc une
			    deuxième sur CINQ routes, à ~un écran de celle du footer, et le geste
			    manuscrit cessait d'en être un. L'eyebrow d'atelier ci-dessus dit
			    déjà qui tient la boutique. */}

			{/* Le seul titre visible est le `h1` ; les cartes portent des `h3`. Ce `h2`
			    masqué comble le saut de niveau (WCAG 1.3.1). Il est en FIN de bloc :
			    un `h2` avant le `h1` serait une hiérarchie inversée, pas comblée. */}
			{listLabel && <h2 className="sr-only">{listLabel}</h2>}
		</div>
	);
}

/**
 * Miroir du bloc titre pour les `loading.tsx` — où la donnée du titre n'est
 * pas encore là. Chaque ligne réservée doit refléter la page réelle (CLS) ;
 * la table des hauteurs vit dans le test de parité
 * (`storefront-heading-skeleton-parity.regression.test.tsx`).
 *
 * `accent="mono"` pour les routes à touche unique (/collections/[slug],
 * /produits/[productTypeSlug]) : un `loading.tsx` ne connaît pas le slug, donc
 * pas la couleur — la réservation est une barre neutre de même empreinte,
 * plutôt que quatre couleurs qui se raviseraient en une au swap.
 */
export function StorefrontHeadingSkeleton({
	className,
	accent = "rail",
	descriptionLines = 1,
	hasDescription = true,
	hasCount = true,
}: {
	className?: string;
	accent?: "rail" | "mono";
	/**
	 * Nombre de lignes de chapô que la page RÉELLE rend à `sm+` dans son
	 * `max-w-[42ch]` (447 px) — 26 px par ligne. Les copies statiques longues
	 * (/produits, /collections, /favoris : 95-117 caractères) en rendent DEUX ;
	 * les descriptions de base (slug de type ou de collection) tiennent en une.
	 * Une ligne non réservée = 26 px de CLS au swap `loading.tsx` → page
	 * (mesuré, audit 79/100 du 2026-08-05) — le test de parité épingle la
	 * valeur attendue par route.
	 */
	descriptionLines?: 1 | 2;
	hasDescription?: boolean;
	hasCount?: boolean;
}) {
	return (
		<div className={cn(className)}>
			{/* Eyebrow : 13 px × interligne 1.5 ≈ 19,5 px. */}
			<Skeleton className="h-5 w-48 rounded" />
			<div aria-hidden="true" className={RAIL_WRAPPER_CLASS}>
				{accent === "rail" ? (
					<HandDrawnRail accent="rail" animated={false} className="opacity-40" />
				) : (
					<Skeleton className="h-3 w-32 rounded-full sm:w-36 lg:w-44" />
				)}
			</div>
			{/* h1 : clamp × leading-[1.06] → ~32 px jusqu'à ~937 px de viewport,
			    ~35 px à lg, ~44 px à xl. L'ancien fantôme (h-9 sm:h-11 lg:h-12)
			    était plus haut que le titre réel à tous les paliers. */}
			<Skeleton className="h-8 w-64 rounded lg:h-9 xl:h-11" />
			{/* Chapô : 16 px × leading-relaxed = 26 px PAR LIGNE. Une seule barre par
			    ligne réelle, à pleine hauteur d'interligne (la convention de toutes
			    les lignes de ce squelette) ; les deux barres du cas 2 lignes se
			    touchent donc — comme les boîtes de ligne du texte réel. */}
			{hasDescription &&
				(descriptionLines === 2 ? (
					<div className="mt-3 hidden sm:block">
						<Skeleton className="h-[1.625rem] w-80 max-w-full rounded" />
						<Skeleton className="h-[1.625rem] w-56 max-w-full rounded" />
					</div>
				) : (
					<Skeleton className="mt-3 hidden h-[1.625rem] w-80 max-w-full rounded sm:block" />
				))}
			{/* Compteur : 15 px × 1.5 ≈ 22 px sous sm, 16 px × 1.5 = 24 px au-dessus. */}
			{hasCount && <Skeleton className="mt-2 h-[1.375rem] w-44 rounded sm:h-6" />}
			{/* Pas de ligne de signature : le bloc réel n'en rend plus (une seule
			    signature par page, dans le pied de page). Les 40 px qu'elle réservait
			    à `sm+` sont partis DES DEUX CÔTÉS — c'est ce que vérifie le test de
			    parité, et c'est ce qui garde le swap sans saut. */}
		</div>
	);
}
