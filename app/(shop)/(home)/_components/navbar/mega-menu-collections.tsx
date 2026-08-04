"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItemChild } from "@/shared/constants/navigation";
import { NavigationMenuLink } from "@/shared/components/ui/navigation-menu";
import { LoadingIndicator } from "@/shared/components/navigation";
import { CollectionImagesGrid } from "@/modules/collections/components/collection-images-grid";
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
 * Carte collection de la grille du mega menu.
 */
function CollectionCard({ collection, isActive }: { collection: NavItemChild; isActive: boolean }) {
	const displayImages = collection.images ?? [];
	return (
		<NavigationMenuLink
			render={<Link href={collection.href} aria-current={isActive ? "page" : undefined} />}
			className={cn(
				// `relative` : ancre du `LoadingIndicator`, qui se peint en `absolute`.
				"group/card bg-card relative flex flex-col overflow-hidden rounded-xl",
				"border-2 border-transparent shadow-sm",
				"ease-out motion-safe:transition-[transform,border-color,box-shadow] motion-safe:duration-[var(--duration-slow)]",
				"motion-reduce:transition-colors",
				"motion-safe:can-hover:hover:border-primary/40",
				"can-hover:hover:shadow-premium-rose",
				"motion-safe:can-hover:hover:-translate-y-1 motion-safe:can-hover:hover:scale-[1.02]",
				"focus-ring",
				"focus-within:border-primary/40 focus-within:shadow-primary/15 focus-within:shadow-lg",
				isActive && "border-primary/40",
			)}
		>
			{/* Images bento grid */}
			{displayImages.length > 0 ? (
				<CollectionImagesGrid images={displayImages} variant="compact" />
			) : (
				<div className="bg-muted relative flex aspect-square items-center justify-center overflow-hidden rounded-t-xl">
					<FlowerIcon className="text-muted-foreground/40 size-6" aria-hidden="true" />
				</div>
			)}

			{/* Centered title + description with decorative line — reserve height for CLS */}
			<div className="min-h-[3.25rem] px-3 pb-3 text-center">
				<div
					className={cn(
						"mx-auto mb-2 h-px w-10",
						"via-primary/40 bg-linear-to-r from-transparent to-transparent",
						"origin-center motion-safe:transition-[transform,opacity] motion-safe:duration-[var(--duration-slow)]",
						"scale-x-[0.67]",
						"motion-reduce:scale-x-100",
						"motion-safe:can-hover:group-hover/card:scale-x-100 motion-safe:can-hover:group-hover/card:via-primary/60",
					)}
					aria-hidden="true"
				/>
				<span className={cn("text-foreground line-clamp-1 text-sm", isActive && "font-medium")}>
					{collection.label}
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
		<div className={cn(layout.width, "px-6 py-5")} role="region" aria-labelledby={headingId}>
			<h2
				id={headingId}
				className="text-foreground font-display mb-1 text-sm leading-tight font-medium"
			>
				Collections
			</h2>
			<p className="text-muted-foreground font-display mb-3 text-xs italic">
				L&apos;univers Synclune
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
					// contrôle ; seul celui-ci n'annonçait pas sa transition.
					"relative flex min-h-11 items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium",
					"bg-accent/40 hover:bg-accent",
					"text-foreground",
					"focus-ring",
					"mb-4 motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)]",
					isViewAllActive && "bg-accent font-medium",
				)}
			>
				Toutes les collections
				<ArrowRightIcon className="text-muted-foreground size-3.5" aria-hidden="true" />
				<LoadingIndicator />
			</NavigationMenuLink>

			{/* Grille uniforme de collections */}
			<div className={cn("grid gap-4", layout.columns)}>
				{filteredCollections.map((collection) => (
					<CollectionCard
						key={collection.href}
						collection={collection}
						isActive={pathname === collection.href}
					/>
				))}
			</div>
		</div>
	);
}
