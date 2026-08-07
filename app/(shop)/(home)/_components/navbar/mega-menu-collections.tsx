"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItemChild } from "@/shared/constants/navigation";
import { NavigationMenuLink } from "@/shared/components/ui/navigation-menu";
import { LoadingIndicator } from "@/shared/components/navigation";
import { HandDrawnUnderline } from "@/shared/components/animations/hand-drawn-accent";
import { HAND_DRAWN_STROKES } from "@/shared/components/hand-drawn/constants";
import { CollectionImagesGrid } from "@/modules/collections/components/collection-images-grid";
import { dataAccentForSlug } from "@/modules/products/components/catalog-accents.constants";
import { CARD_SURFACE_FOCUS, CARD_TILT } from "@/shared/components/card-surface.constants";
import { SquiggleUnderline } from "@/shared/components/squiggle-underline";
import { ROUTES } from "@/shared/constants/urls";
import { cn } from "@/shared/utils/cn";
import { ArrowRightIcon, FlowerIcon } from "@phosphor-icons/react/ssr";

interface MegaMenuCollectionsProps {
	collections?: NavItemChild[];
}

/**
 * Largeur du panneau et nombre de colonnes, dérivés du NOMBRE de cartes
 * réellement rendues.
 *
 * `getNavbarMenuData` demande `perPage: 3` **avec** `filters: { hasProducts: true }` :
 * le compte dépend donc du catalogue, pas d'une constante. À largeur fixe
 * (`46rem` + `grid-cols-3` en dur), deux collections publiables laissaient une
 * cellule vide, et une seule laissait ~500 px de vide à droite d'une carte de
 * 215 px.
 *
 * Même arbitrage que `mega-menu-creations.tsx`, qui bascule déjà 46rem ↔ 28rem
 * selon la présence de son rail — « sinon les catégories s'étirent dans le vide ».
 * La règle n'avait simplement pas traversé les deux fichiers.
 *
 * ⚠️ Classes LITTÉRALES, jamais interpolées : Tailwind ne compose que ce qu'il
 * lit tel quel dans les sources.
 */
const PANEL_LAYOUTS = [
	{ width: "w-[min(20rem,var(--available-width))]", columns: "grid-cols-1" },
	{ width: "w-[min(32rem,var(--available-width))]", columns: "grid-cols-2" },
	{ width: "w-[min(46rem,var(--available-width))]", columns: "grid-cols-3" },
] as const;

function panelLayout(count: number) {
	// Bornes des deux côtés : 0 n'arrive pas (retour anticipé plus bas), et un
	// éventuel `perPage` relevé un jour ne doit pas sortir du tableau.
	const index = Math.min(Math.max(count, 1), PANEL_LAYOUTS.length) - 1;
	return PANEL_LAYOUTS[index] as (typeof PANEL_LAYOUTS)[number];
}

/**
 * Carte collection de la grille du mega menu — un TIRAGE encadré : le
 * passe-partout blanc (padding du cadre) absorbe les photos aux fonds
 * discordants, et l'état sans image devient une promesse au lieu d'un carré
 * gris muet (P3 de l'audit 2026-08-05). Le filet décoratif d'avant (1 px à
 * 40 %, compressé ×0.67) était invisible au repos — vérifié au rendu — et a
 * été retiré plutôt que remplacé.
 *
 * Doctrine de la carte collection : elle doit montrer un ENSEMBLE, pas un objet.
 *   ⚠️ Ses deux manques (compteur, fourchette d'entrée) sont un trou de DONNÉES,
 *   pas un choix de design : `NavItemChild` ne les transporte pas. Ne pas
 *   « corriger » la carte sans étendre ce type d'abord — il n'y a rien à
 *   afficher. C'est en revanche la seule des trois surfaces à rendre 4 visuels
 *   ET une description : l'intuition « le menu est petit, donc il en montre
 *   moins » est fausse, et elle a été écrite dans la doctrine avant d'être
 *   corrigée le 2026-08-06.
 */
function CollectionCard({
	collection,
	isActive,
	index,
}: {
	collection: NavItemChild;
	isActive: boolean;
	index: number;
}) {
	const displayImages = collection.images ?? [];
	return (
		<NavigationMenuLink
			render={<Link href={collection.href} aria-current={isActive ? "page" : undefined} />}
			// La carte re-scope l'accent sur SON slug (même hash que la carte
			// landing, la bande de /collections et le rail de la page fille) : la
			// couleur promise ici est celle qui accueille au clic. Le panneau, lui,
			// garde le mint de salle pour son chrome (titre, baseline, CTA) —
			// harmonisation 2026-08-06.
			data-accent={collection.slug ? dataAccentForSlug(collection.slug) : undefined}
			className={cn(
				// `relative` : ancre du `LoadingIndicator`, qui se peint en `absolute`.
				// L'enveloppe complète CARD_SURFACE_POLAROID n'est PAS adoptée :
				// `p-1.5`/`shadow-2xs`/`polaroid-paper` sont la densité propre du menu
				// (forme actée) — seuls tilt et focus sont la SSOT partagée.
				"group/card polaroid-paper bg-card relative flex flex-col rounded-md p-1.5",
				"border-2 border-transparent shadow-2xs",
				CARD_TILT[index % CARD_TILT.length],
				"ease-out motion-safe:transition-[translate,border-color,box-shadow] motion-safe:duration-[var(--duration-slow)]",
				"motion-reduce:transition-colors",
				"motion-safe:can-hover:hover:border-primary/40",
				"can-hover:hover:shadow-premium-rose",
				"motion-safe:can-hover:hover:-translate-y-1",
				"focus-ring",
				CARD_SURFACE_FOCUS,
				isActive && "border-primary/40",
			)}
		>
			{/* Passe-partout : la photo vit dans une fenêtre clipée DANS le cadre. */}
			<span className="relative block overflow-hidden rounded-sm">
				{displayImages.length > 0 ? (
					<CollectionImagesGrid images={displayImages} variant="compact" />
				) : (
					<span className="relative flex aspect-square flex-col items-center justify-center gap-1.5 bg-(--section-wash)">
						<FlowerIcon className="text-muted-foreground size-6" aria-hidden="true" />
						<span className="text-muted-foreground text-xs">Photos à venir</span>
					</span>
				)}
			</span>

			{/* Centered title + description — reserve height for CLS */}
			<div className="min-h-[3.25rem] px-2 pt-2 pb-1.5 text-center">
				{/* Même encre que la carte landing : le squiggle teinté par le
				    `data-accent` de la carte, posé AU REPOS (`drawn`) — c'est
				    l'identité de la série, pas une affordance de survol. En
				    `absolute` sous la ligne : la réserve anti-CLS ne bouge pas. */}
				<span className="relative inline-block max-w-full">
					<span className={cn("text-foreground line-clamp-1 text-sm", isActive && "font-medium")}>
						{collection.label}
					</span>
					<SquiggleUnderline className="w-full" drawn stroke="var(--section-accent)" />
				</span>
				{collection.description && (
					<p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
						{collection.description}
					</p>
				)}
			</div>
			<LoadingIndicator />
		</NavigationMenuLink>
	);
}

export function MegaMenuCollections({ collections }: MegaMenuCollectionsProps) {
	const headingId = useId();
	const pathname = usePathname();

	// Exclude "Toutes les collections" from cards (shown as CTA instead)
	const filteredCollections = collections?.filter((c) => c.href !== ROUTES.SHOP.COLLECTIONS);

	if (!filteredCollections || filteredCollections.length === 0) {
		return null;
	}

	const isViewAllActive = pathname === ROUTES.SHOP.COLLECTIONS;
	const layout = panelLayout(filteredCollections.length);

	return (
		// Le panneau porte sa propre largeur (cf. `DesktopNav`) : une carte de
		// collection mesure ~215px, plus les gouttières. Base UI morphe d'une
		// largeur à l'autre — il n'y a rien à animer ici.
		// `data-accent="rose"` : accent de salle des collections (SSOT
		// navbar-section.ts) — le panneau portalisé pose le sien, cf. le panneau
		// Créations. C'était « mint » jusqu'au passage de la navigation au
		// mono-rose (2026-08-06). Répartition des encres inchangée : l'accent de
		// salle ne teinte que le CHROME (h2, baseline, CTA « Toutes les
		// collections ») ; chaque carte re-scope `data-accent` sur son slug, donc
		// squiggle et état vide portent la couleur de leur page fille — c'est
		// l'identité de la SÉRIE, pas de la navigation, et elle reste quadri.
		// ⚠️ Le nom accessible du landmark doit continuer de matcher
		// /Collections/i (e2e/mega-menu-desktop.spec.ts).
		<div
			className={cn(layout.width, "px-6 py-5")}
			role="region"
			aria-labelledby={headingId}
			data-accent="rose"
		>
			<h2 id={headingId} className="text-foreground font-display text-sm leading-tight font-medium">
				Collections
			</h2>
			{/* Width seule (hauteur dérivée du ratio — l'ancien 76×12 letterboxait) ;
			    durée et graisse : les défauts de l'échelle (trait 500 ms, marqueur). */}
			<HandDrawnUnderline
				width={76}
				strokeWidth={HAND_DRAWN_STROKES.marqueur}
				inView={false}
				className="mt-0.5"
			/>
			<p className="text-muted-foreground font-display mt-1 mb-3 text-xs italic">
				Petites séries, grandes couleurs
			</p>

			{/* CTA "Toutes les collections" */}
			<NavigationMenuLink
				render={
					<Link
						href={ROUTES.SHOP.COLLECTIONS}
						aria-current={isViewAllActive ? "page" : undefined}
					/>
				}
				className={cn(
					// `relative` : ancre du `LoadingIndicator`, comme son jumeau exact de
					// `mega-menu-column.tsx`. Les deux CTA sont rigoureusement le même
					// contrôle — mêmes lavages d'accent de salle (SSOT section-accents.css).
					"relative flex min-h-11 items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium",
					"bg-(--section-wash) hover:bg-(--section-wash-strong)",
					"text-foreground",
					"focus-ring",
					"mb-4 motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)]",
					isViewAllActive && "bg-(--section-wash-strong) font-medium",
				)}
			>
				Toutes les collections
				<ArrowRightIcon className="text-muted-foreground size-3.5" aria-hidden="true" />
				<LoadingIndicator />
			</NavigationMenuLink>

			{/* Grille uniforme de collections */}
			<div className={cn("grid gap-4", layout.columns)}>
				{filteredCollections.map((collection, index) => (
					<CollectionCard
						key={collection.href}
						collection={collection}
						isActive={pathname === collection.href}
						index={index}
					/>
				))}
			</div>
		</div>
	);
}
