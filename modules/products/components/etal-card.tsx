"use client";

import type { LoadMoreAffordanceState } from "@/shared/components/load-more";
import { MaskingTape } from "@/shared/components/masking-tape";
import {
	CARD_SURFACE_FOCUS,
	CARD_SURFACE_HOVER,
	CARD_SURFACE_POLAROID,
} from "@/shared/components/card-surface.constants";
import { cn } from "@/shared/utils/cn";

import { RAIL_ACCENTS, RAIL_SEGMENT_COUNT } from "./catalog-accents.constants";

interface EtalCardProps extends LoadMoreAffordanceState {
	onLoad: () => void;
	/** Posé par `LoadMore` : c'est ce nœud que l'IntersectionObserver observe. */
	ref: (node: HTMLElement | null) => void;
	className?: string;
}

/**
 * Le cadre intérieur, commun au carton et à son squelette (contrat anti-CLS).
 *
 * ⚠️ **Le pointillé est en `muted-foreground/70`, pas en `--border`.** C'est
 * l'un des trois signaux qui empêchent le carton de se lire comme une pièce, il
 * porte donc de l'information : à `--border` (#e2e4eb) il rendait **1,24:1**
 * contre le fond — mesuré, et invisible à l'œil sur la capture. À 70 % de
 * `--muted-foreground` il vaut **3,50:1**, le seuil WCAG 1.4.11 des éléments
 * d'interface.
 *
 * `pb-7` contre `py-4` : **correction optique**. Le panneau absorbe tout
 * l'étirement de la rangée (`flex-1` + `self-stretch` sur la carte), donc un
 * centrage mathématique posait le nombre au milieu d'un grand cadre vide. Le
 * bloc remonte d'un cran pour se lire comme une étiquette posée en haut du
 * carton, pas comme un contenu perdu au centre.
 */
// `bg-primary/5` : le wash de « la salle rose » (audit /produits 2026-08-05,
// direction B) — le carton hérite de la teinte du meuble, comme le rail. Le
// pointillé `border-muted-foreground/70` reste ≥ 3:1 : le wash n'assombrit le
// fond que d'un ΔL ≈ 0,01 par rapport au `bg-background` qu'il remplace.
const INNER_PANEL =
	"bg-primary/5 flex min-h-[10.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-sm border border-dashed border-muted-foreground/70 px-3 pt-4 pb-7 text-center";

/** Le pied : le journal des lots + la ligne d'invite, hauteur réservée. */
const FOOT = "flex flex-col gap-1.5 px-1 pt-2.5 pb-3";

/**
 * Le ruban, position comprise (`MaskingTape` ne fournit que la matière).
 *
 * ⚠️ Les classes de transition sont posées ICI, sur le ruban lui-même, et non
 * par un sélecteur descendant depuis la carte : `MaskingTape` ne porte aucun
 * `data-slot`, donc un `[&_[data-slot=…]]` aurait été une règle morte — sans
 * erreur, sans warning, et sans mouvement.
 */
const TAPE =
	"-top-2 left-1/2 z-20 h-4 w-14 -translate-x-1/2 -rotate-2 motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]";

/** Le ruban se décolle pendant l'attente — le seul mouvement du carton. */
const TAPE_PENDING =
	"-top-2 left-1/2 z-20 h-4 w-14 -translate-x-1/2 -translate-y-0.5 -rotate-6 motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]";

/**
 * Combien de segments du rail sont allumés.
 *
 * Cycle de 4 : le 4ᵉ lot allume les quatre, le 5ᵉ repart à un. C'est un
 * JOURNAL de ce qu'on a déroulé, pas une jauge de progression — le catalogue
 * n'a pas de longueur connue à l'avance côté client, et une jauge qui n'arrive
 * jamais au bout serait un mensonge.
 */
function litSegments(loadCount: number): number {
	if (loadCount <= 0) return 0;
	return ((loadCount - 1) % RAIL_SEGMENT_COUNT) + 1;
}

/**
 * Le carton d'étal — la dernière cellule de la grille du catalogue.
 *
 * @description
 * Direction « Le carton d'étal » (artifact du 2026-08-05, reco C). Le catalogue
 * n'a plus de pied de page : l'affordance qui va chercher la suite **est une
 * cellule de la grille**, au format d'une pièce, comme le bloc titre en est la
 * première. On ne franchit pas une frontière entre « ce que le serveur a rendu »
 * et « ce que le navigateur est allé chercher » — on continue de descendre le
 * même étal.
 *
 * ## Ce que la structure règle, et qu'un pied ne pouvait pas régler
 *
 * - **La couture.** L'ancien pied vivait dans une cellule `col-span-full`
 *   précédée d'un `mt-6`, et rendait sa PROPRE grille : la gouttière passait de
 *   16 px à 40 px exactement là où la page prétend continuer. Une cellule ne
 *   peut pas se désaligner de sa propre grille.
 * - **Le silence.** L'auto-load se déclenche 200 px AVANT que l'affordance entre
 *   à l'écran : l'ancien bouton n'était donc presque jamais vu ni cliqué, et
 *   quand un lot échouait, la seule trace était un toast qui s'évaporait — le
 *   catalogue paraissait simplement fini. Le carton ne quitte jamais le flux de
 *   lecture : il porte les quatre états sur le MÊME objet, à l'endroit exact où
 *   le chargement s'est arrêté.
 * - **La cible tactile.** C'est la carte entière — **171 × 389 px** mesurés à
 *   390 px de large, soit exactement la hauteur de sa rangée (`self-stretch`
 *   contre le `items-start` de la grille). Très au-delà des 44 px de
 *   WCAG 2.5.5.
 *
 * ## Ce qui l'empêche de se lire comme une pièce
 *
 * Trois signaux qui doivent tenir ENSEMBLE — c'est le risque assumé de la
 * direction : **pas de photo**, un cadre intérieur en **pointillés**, et un
 * **nombre** à la place du titre. En retirer un le fait basculer du côté
 * « produit en rupture ».
 */
export function EtalCard({
	remainingCount,
	totalCount,
	loadCount,
	isPending,
	error,
	hasMore,
	onLoad,
	ref,
	className,
}: EtalCardProps) {
	const isDone = !hasMore && !error;
	const isSingular = remainingCount === 1;
	// Le total n'est pas toujours connu (recherche sans compte, agrégat à 0) :
	// on ne promet alors pas un chiffre, on dit seulement qu'il en reste.
	const hasCount = totalCount > 0 && remainingCount > 0;

	const lit = isDone ? RAIL_SEGMENT_COUNT : litSegments(loadCount);

	const rail = (
		// Décoratif : le compte est déjà écrit en toutes lettres juste au-dessus.
		<span aria-hidden="true" className="bg-muted flex h-1 gap-0.5 overflow-hidden rounded-full">
			{RAIL_ACCENTS.map((accent, index) => (
				<span
					key={accent}
					className={cn(
						"flex-1 rounded-full",
						index < lit ? accent : "bg-muted",
						// La progression se peint, elle ne clignote pas : une TRANSITION,
						// jamais une keyframe — donc rien à déclarer au killswitch de
						// `animations.css`, et le repli est porté par `motion-safe:`.
						"motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-out",
					)}
				/>
			))}
		</span>
	);

	// ── Fin de catalogue ──────────────────────────────────────────────────
	// Plus rien à charger : le carton devient le mot de la fin. Ce n'est plus une
	// commande, donc plus un `<button>` — laisser une cible tabulable qui ne
	// fait rien est un piège au clavier.
	if (isDone) {
		return (
			<div
				ref={ref}
				data-slot="etal-card"
				data-state="done"
				className={cn(
					CARD_SURFACE_POLAROID,
					CARD_SURFACE_FOCUS,
					"flex w-full flex-col self-stretch",
					"motion-safe:rotate-[0.5deg]",
					className,
				)}
			>
				<MaskingTape className={TAPE} />
				<span className={INNER_PANEL}>
					{/* ⚠️ Ce carton portait un « — Léane » en cursive. Il est retiré : le
					    carton de fin est la DERNIÈRE cellule de la grille, donc à ~200 px
					    du pied de page — qui signe déjà. Deux paraphes manuscrits
					    quasi co-visibles s'annulent. La voix, elle, reste (première
					    personne, « j'ai sorti »), et le mot rejoint le registre des trois
					    autres états du carton : la display en grand, la note en petit. */}
					<span className="font-display text-[clamp(1.75rem,6vw,2.25rem)] leading-[1.02] font-light tracking-[-0.02em]">
						Voilà
					</span>
					<span className="text-muted-foreground text-[0.8125rem] leading-snug">
						c&apos;est tout ce que j&apos;ai sorti pour aujourd&apos;hui
					</span>
				</span>
				<span className={FOOT}>
					{rail}
					<span className="min-h-4" />
				</span>
			</div>
		);
	}

	// ── Échec ─────────────────────────────────────────────────────────────
	// Le message REMPLACE le compte au lieu de s'ajouter en dessous : c'est ce
	// qui rend l'échec impossible à confondre avec un carton au repos. Trois
	// signaux, dont deux non chromatiques (le cadre passe en trait plein,
	// l'inclinaison change de sens) — WCAG 1.4.1.
	if (error) {
		return (
			<button
				ref={ref}
				type="button"
				onClick={onLoad}
				aria-disabled={isPending}
				aria-busy={isPending}
				data-slot="etal-card"
				data-state="error"
				className={cn(
					CARD_SURFACE_POLAROID,
					CARD_SURFACE_HOVER,
					CARD_SURFACE_FOCUS,
					"focus-ring flex w-full flex-col self-stretch text-left",
					"motion-safe:rotate-[1.5deg]",
					className,
				)}
			>
				<MaskingTape className={TAPE} />
				<span className={cn(INNER_PANEL, "border-destructive border-solid")}>
					<span className="text-destructive text-base leading-snug font-semibold">
						Je n&apos;ai pas réussi
					</span>
					<span className="text-muted-foreground mt-1 text-[0.8125rem] leading-snug">
						à sortir la suite. Touche pour réessayer.
					</span>
				</span>
				<span className={FOOT}>
					{rail}
					<span className="min-h-4" />
				</span>
			</button>
		);
	}

	// ── Repos / en vol ────────────────────────────────────────────────────
	return (
		<button
			ref={ref}
			type="button"
			onClick={onLoad}
			// `aria-disabled` et NON `disabled` : un bouton qui devient `disabled`
			// alors qu'il a le focus le renvoie sur `<body>`, et l'utilisateur au
			// clavier repart du premier lien de la page. Le double-dispatch est
			// déjà bloqué par la garde de `LoadMore`.
			aria-disabled={isPending}
			aria-busy={isPending}
			data-slot="etal-card"
			data-state={isPending ? "pending" : "idle"}
			className={cn(
				CARD_SURFACE_POLAROID,
				CARD_SURFACE_HOVER,
				CARD_SURFACE_FOCUS,
				// `self-stretch` contre le `items-start` de la grille : le carton
				// adopte la hauteur de SA rangée, donc le format d'une pièce. Sans
				// lui il rend ~230 px là où une carte en fait ~360.
				"focus-ring flex w-full flex-col self-stretch text-left",
				"motion-safe:rotate-[-1deg]",
				className,
			)}
		>
			<MaskingTape className={isPending ? TAPE_PENDING : TAPE} />
			<span className={INNER_PANEL}>
				<span className="font-display text-[clamp(1.75rem,6vw,2.25rem)] leading-[1.02] font-light tracking-[-0.02em] tabular-nums">
					{hasCount ? remainingCount : "Encore"}
				</span>
				<span className="text-muted-foreground text-[0.8125rem] leading-snug">
					{isPending
						? "je vais les chercher…"
						: hasCount
							? `${isSingular ? "pièce" : "pièces"} encore dans le tiroir`
							: "des pièces dans le tiroir"}
				</span>
			</span>
			<span className={FOOT}>
				{rail}
				<span className="text-muted-foreground min-h-4 text-center text-xs">
					{isPending ? "" : `Touche pour ${isSingular ? "la" : "les"} sortir`}
				</span>
			</span>
		</button>
	);
}

/**
 * Miroir du carton pour `ProductListSkeleton`.
 *
 * @description
 * ⚠️ La parité de géométrie avec `EtalCard` est un contrat **anti-CLS**, pas une
 * ressemblance : `/produits` est la seule page dont le CLS est budgété en CI
 * (`e2e/performance.spec.ts`, « page produits - CLS under 0.15 »). Les trois
 * constantes de géométrie (`INNER_PANEL`, `FOOT`, `TAPE`) sont partagées avec le
 * carton réel — une copie littérale dériverait au premier changement.
 *
 * `aria-hidden` : la frontière `Suspense` qui monte ce squelette est déjà
 * annoncée par le `role="status"` de son hôte — un second statut sur un
 * placeholder ferait deux annonces pour un seul chargement.
 */
export function EtalCardSkeleton({ className }: { className?: string }) {
	return (
		<div
			aria-hidden="true"
			className={cn(CARD_SURFACE_POLAROID, "flex w-full flex-col self-stretch", className)}
		>
			<MaskingTape className={TAPE} />
			<span className={cn(INNER_PANEL, "gap-2")}>
				<span className="bg-muted h-8 w-16 rounded motion-safe:animate-pulse" />
				<span className="bg-muted h-3 w-28 rounded motion-safe:animate-pulse" />
			</span>
			<span className={FOOT}>
				<span className="bg-muted h-1 rounded-full" />
				<span className="min-h-4" />
			</span>
		</div>
	);
}
