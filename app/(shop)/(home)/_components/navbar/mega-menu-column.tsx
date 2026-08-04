"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItemChild } from "@/shared/constants/navigation";
import { NavigationMenuLink } from "@/shared/components/ui/navigation-menu";
import { LoadingIndicator } from "@/shared/components/navigation";
import { cn } from "@/shared/utils/cn";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";

/**
 * ⚠️ **Il n'y a plus d'icône par catégorie, et c'est un retrait délibéré.**
 *
 * Un `ITEM_ICON_MAP` résolvait le slug du type de produit vers une icône
 * Phosphor. Il couvrait `bagues, colliers, bracelets, boucles-d-oreilles,
 * pendentifs, broches, montres` — mais le catalogue de Synclune est
 * `colliers, bracelets, bagues, chaines-corps, papilloux, chaines-cheveux,
 * porte-cles`. Soit **trois entrées sur sept servies**, quatre clés visant des
 * catégories qui n'ont jamais existé ici, et les quatre familles orphelines
 * étant précisément celles qui appartiennent à Léane (« Papilloux » est un mot
 * qu'elle a inventé).
 *
 * Le fichier revendiquait ce vide — « pas de fallback générique, un slug non
 * mappé n'affiche AUCUNE icône plutôt qu'une icône sémantiquement fausse ».
 * L'intention est juste ; le rendu ne l'était pas : avec `size-4 shrink-0` +
 * `gap-2.5`, une ligne sans icône démarrait **26 px à gauche** de ses voisines.
 * La liste des sept familles se lisait comme une colonne mal alignée.
 *
 * Deux raisons de retirer plutôt que de compléter. D'abord il n'existe pas
 * d'icône honnête pour « Chaînes de corps » ou « Papilloux » — on inventerait
 * une sémantique. Ensuite chaque icône Phosphor embarque ses 6 graisses dans un
 * module intreeshakable (~5× le gzip d'une lucide) : sept icônes distinctes
 * pesaient sur le chunk de la navbar, donc sur TOUTES les routes de la boutique.
 *
 * Le jour où ces catégories doivent porter un visuel, ce sera une photo de pièce
 * (direction « L'étal »), pas un pictogramme.
 */

interface MegaMenuColumnProps {
	/** Column title displayed as section header */
	title: string;
	/** Optional subtitle rendered under the title (italic, atelier microcopy) */
	subtitle?: string;
	/** Navigation items to display in the column */
	items: NavItemChild[];
	/** Display items in a multi-column grid */
	columns?: 2 | 3;
}

/**
 * Reusable mega menu column component for desktop navigation.
 * Displays a list of navigation links with proper accessibility attributes.
 *
 * Features:
 * - WCAG 2.5.5 compliant touch targets (min 44px)
 * - aria-current="page" for active links
 * - Visible focus indicators
 * - Active state styling
 * - Optional multi-column grid layout
 * - Visual hierarchy: first item styled as primary CTA
 */
export function MegaMenuColumn({ title, subtitle, items, columns }: MegaMenuColumnProps) {
	const pathname = usePathname();

	if (items.length === 0) {
		return null;
	}

	// Separate first item (CTA "Toutes les créations" etc.) from rest
	const [primaryItem, ...restItems] = items;

	return (
		// ⚠️ Plus de `role="region"` : cette colonne vit DANS le panneau du
		// mega-menu, qui porte déjà son landmark. Trois `region` imbriquées pour un
		// menu saturaient la liste de landmarks d'un lecteur d'écran ; le `<h3>`
		// ci-dessous suffit à la navigation par en-têtes.
		<div>
			<h3
				className={cn(
					"text-foreground font-display text-sm leading-tight font-medium",
					subtitle ? "mb-1" : "mb-3",
				)}
			>
				{title}
			</h3>
			{subtitle && (
				<p className="text-muted-foreground font-display mb-3 text-xs italic">{subtitle}</p>
			)}

			{/* Primary CTA link with distinct styling */}
			{primaryItem && (
				// `render` et non `asChild` (Base UI n'a pas de Slot) : l'ÉLÉMENT passé
				// remplace celui du composant, les enfants restent portés par le composant.
				// Plus de `flex-row!` — le lien n'impose plus `flex-col` par défaut.
				<NavigationMenuLink
					render={
						<Link
							href={primaryItem.href}
							aria-current={pathname === primaryItem.href ? "page" : undefined}
						/>
					}
					className={cn(
						"relative flex min-h-11 items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium",
						"bg-accent/40 hover:bg-accent",
						"text-foreground",
						"focus-ring",
						"mb-2 motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)]",
						pathname === primaryItem.href && "bg-accent font-medium",
					)}
				>
					{primaryItem.label}
					<ArrowRightIcon className="text-muted-foreground size-3.5" aria-hidden="true" />
					<LoadingIndicator />
				</NavigationMenuLink>
			)}

			{/* Rest of items - optional multi-column grid */}
			<ul
				className={cn(
					"space-y-0.5",
					columns === 2 && "grid grid-cols-2 space-y-0 gap-x-4 gap-y-0.5",
					columns === 3 && "grid grid-cols-3 space-y-0 gap-x-4 gap-y-0.5",
				)}
			>
				{restItems.map((item) => {
					const isActive = pathname === item.href;
					return (
						<li key={item.href}>
							<NavigationMenuLink
								render={<Link href={item.href} aria-current={isActive ? "page" : undefined} />}
								className={cn(
									"relative flex min-h-11 items-center rounded-sm px-3 py-2.5 text-sm",
									"hover:bg-accent hover:text-accent-foreground",
									"focus-ring",
									"motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)]",
									isActive && "bg-accent/50 font-medium",
								)}
							>
								<span className="truncate">{item.label}</span>
								<LoadingIndicator />
							</NavigationMenuLink>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
