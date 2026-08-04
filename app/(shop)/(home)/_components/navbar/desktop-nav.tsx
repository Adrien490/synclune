"use client";

import type { NavItemChild, NavItemWithChildren } from "@/shared/constants/navigation";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuPopup,
	NavigationMenuTrigger,
	navigationMenuTriggerStyle,
} from "@/shared/components/ui/navigation-menu";
import { SquiggleUnderline } from "@/shared/components/squiggle-underline";
import { MaskingTape } from "@/shared/components/masking-tape";
import { useActiveNavbarItem } from "@/shared/hooks/use-active-navbar-item";
import { useIsTouchDevice } from "@/shared/hooks/use-touch-device";
import { cn } from "@/shared/utils/cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MegaMenuProduct } from "@/shared/constants/navigation";
import { LoadingIndicator } from "@/shared/components/navigation";
import { MegaMenuCreations } from "./mega-menu-creations";
import { MegaMenuCollections } from "./mega-menu-collections";

interface DesktopNavProps {
	navItems: NavItemWithChildren[];
	featuredProducts?: MegaMenuProduct[];
	/** Collection vedette servant de fallback éditorial quand aucune nouveauté n'est dispo. */
	spotlightCollection?: NavItemChild;
}

/**
 * Libellés en Fraunces (`font-display`) et non plus en Figtree : le header était
 * la dernière surface du storefront à parler shadcn-neutre, entre des cartes
 * « Atelier » (tirage polaroid, masking tape, trait dessiné) et un footer à
 * l'accent manuscrit.
 *
 * Le trait de 2px animé en `scale-x` cède la place à `SquiggleUnderline` — la
 * même primitive que les cartes. Bénéfice non cosmétique : elle se dessine au
 * survol **et au focus clavier** (`group-focus-within`), parité WCAG 2.4.7 que
 * l'ancien `hover:after:scale-x-100` n'avait pas.
 */
const linkClasses = cn(
	"group relative h-auto px-3 py-2 rounded-sm font-display text-[0.9375rem] font-medium",
	"text-foreground/85 hover:text-foreground",
	"data-[active=true]:text-foreground",
	"motion-safe:transition-[color,background-color] motion-safe:duration-[var(--duration-normal)]",
	// Halo rose discret au survol et à l'ouverture du panneau.
	"motion-safe:hover:bg-primary/8 data-popup-open:bg-primary/8",
	"focus-ring",
);

export function DesktopNav({ navItems, featuredProducts, spotlightCollection }: DesktopNavProps) {
	const { isMenuItemActive } = useActiveNavbarItem();
	const router = useRouter();
	// Sur écran tactile (laptops hybrides / tablettes ≥ lg sans hover), un tap doit OUVRIR
	// le mega menu plutôt que naviguer directement vers la page section — sinon l'utilisateur
	// ne voit jamais les catégories ni le cross-sell (F3). La navigation reste possible via
	// le CTA "Toutes les créations / collections" à l'intérieur du panneau.
	const isTouch = useIsTouchDevice();

	return (
		<NavigationMenu className="hidden lg:flex" delay={120} closeDelay={150}>
			<NavigationMenuList className="gap-1">
				{navItems.map((item) => {
					const itemIsActive = isMenuItemActive(item.href);

					// Item sans dropdown = lien simple
					if (!item.hasDropdown) {
						return (
							<NavigationMenuItem key={item.href}>
								<NavigationMenuLink
									render={
										<Link
											href={item.href}
											data-active={itemIsActive}
											aria-current={itemIsActive ? "page" : undefined}
										/>
									}
									className={cn(navigationMenuTriggerStyle, linkClasses)}
								>
									{item.label}
									<SquiggleUnderline
										className="-bottom-0.5 left-3 h-2 w-[calc(100%-1.5rem)]"
										drawn={itemIsActive}
									/>
									<LoadingIndicator />
								</NavigationMenuLink>
							</NavigationMenuItem>
						);
					}

					// Item avec dropdown = mega menu
					return (
						<NavigationMenuItem key={item.href}>
							<NavigationMenuTrigger
								showChevron
								className={linkClasses}
								data-active={itemIsActive}
								aria-current={itemIsActive ? "page" : undefined}
								onClick={(event) => {
									// Activation clavier (Entrée/Espace) : le clic synthétisé porte
									// `detail === 0`. On laisse Base UI ouvrir le panneau, sinon ses
									// liens seraient injoignables au clavier et au lecteur d'écran.
									if (event.detail === 0) return;
									// Tactile (pointeur grossier, pas de survol) : le tap ouvre le
									// panneau au lieu de naviguer — le CTA interne prend le relais (F3).
									if (isTouch) return;
									// Souris sur un pointeur capable de survol : le survol a déjà
									// montré le panneau, le clic va droit à la page section.
									//
									// ⚠️ `preventBaseUIHandler()`, PAS `preventDefault()`. Base UI ne
									// consulte pas `defaultPrevented` : ses gestionnaires internes sont
									// fusionnés par `mergeProps`, qui ne les court-circuite que sur ce
									// signal dédié. Un `preventDefault()` seul aurait laissé le panneau
									// s'ouvrir en même temps que la navigation.
									event.preventBaseUIHandler();
									router.push(item.href);
								}}
							>
								{item.label}
								<SquiggleUnderline
									className="-bottom-0.5 left-3 h-2 w-[calc(100%-2.75rem)]"
									drawn={itemIsActive}
								/>
							</NavigationMenuTrigger>
							{/* Le panneau était pleine largeur (`fixed! left-0! right-0! w-screen!`).
							    C'était un gabarit de grand magasin pour un catalogue d'une dizaine
							    de liens — et `w-screen` valait `100vw`, gouttière de scrollbar
							    comprise, donc ~15px de débordement horizontal. Chaque panneau porte
							    désormais SA largeur : Base UI morphe de l'une à l'autre. */}
							<NavigationMenuContent>
								{item.dropdownType === "creations" && (
									<MegaMenuCreations
										productTypes={item.children}
										featuredProducts={featuredProducts}
										spotlightCollection={spotlightCollection}
									/>
								)}
								{item.dropdownType === "collections" && (
									<MegaMenuCollections collections={item.children} />
								)}
							</NavigationMenuContent>
						</NavigationMenuItem>
					);
				})}
			</NavigationMenuList>

			{/* Le panneau, monté une seule fois. Base UI y déplace le contenu de l'item
			    actif et morphe la taille d'un panneau à l'autre. Le ruban de masking
			    tape remplace le filet rose : même vocabulaire que les cartes Atelier,
			    et il déborde du cadre — d'où l'absence d'`overflow-hidden` ici. */}
			<NavigationMenuPopup className="overflow-visible">
				<MaskingTape className="-top-2 left-10 h-4 w-20 -rotate-2" />
			</NavigationMenuPopup>
		</NavigationMenu>
	);
}
