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
import { useActiveNavbarItem } from "@/shared/hooks/use-active-navbar-item";
import { useIsTouchDevice } from "@/shared/hooks/use-touch-device";
import { cn } from "@/shared/utils/cn";
import Link from "next/link";
import type { MegaMenuProduct } from "@/shared/constants/navigation";
import { LoadingIndicator } from "@/shared/components/navigation";
import { MegaMenuCreations } from "./mega-menu-creations";

interface DesktopNavProps {
	navItems: NavItemWithChildren[];
	featuredProducts?: MegaMenuProduct[];
	/** Collection vedette servant de fallback éditorial quand aucune nouveauté n'est dispo. */
	spotlightCollection?: NavItemChild;
}

/**
 * Libellés en display (`font-display`) et non plus en sans : le header était
 * la dernière surface du storefront à parler shadcn-neutre, entre des cartes
 * « Atelier » (tirage polaroid, trait dessiné) et un footer à
 * l'accent manuscrit.
 *
 * Le trait de 2px animé en `scale-x` cède la place à `SquiggleUnderline` — la
 * même primitive que les cartes. Bénéfice non cosmétique : elle se dessine au
 * survol **et au focus clavier** (`group-focus-within`), parité WCAG 2.4.7 que
 * l'ancien `hover:after:scale-x-100` n'avait pas.
 *
 * Le trait est en `--primary`, le rose pastel de la marque : exactement celui des
 * cartes Atelier et du bandeau sous la barre. Il avait été encré en
 * `--color-brand-rose-strong` (rose profond) pour que le marqueur
 * d'`aria-current="page"` passe les 3:1 de WCAG 1.4.11 ; ce rose sombre a été
 * jugé étranger au reste du header, et le trait est repassé au pastel (décision
 * design 2026-08-04).
 *
 * ⚠️ Conséquence assumée : à **1,55:1** sur le fond, ce trait ne SIGNALE plus la
 * page courante à l'œil. Celle-ci reste portée par `aria-current="page"` (donc
 * intacte pour les lecteurs d'écran) et par l'aplat `--section-soft` ci-dessous.
 * Ne pas en déduire que le pastel est un choix neutre partout : sur un contrôle
 * dont il serait le SEUL état visible (point du radio, case cochée), la règle
 * reste `--color-brand-rose-strong` — cf. § « ROSE PROFOND » de `app/globals.css`
 * et `token-contrast.regression.test.ts`.
 */
const linkClasses = cn(
	"group relative h-auto px-3 py-2 rounded-sm font-display text-[0.9375rem] font-medium",
	"text-foreground/85 hover:text-foreground",
	"data-[active=true]:text-foreground",
	"motion-safe:transition-[color,background-color] motion-safe:duration-[var(--duration-normal)]",
	// Halo rose discret au survol et à l'ouverture du panneau.
	//
	// ⚠️ Le fond était `motion-safe:hover:bg-primary/8` : le variant gatait
	// l'ÉTAT et pas seulement la transition, donc sous `prefers-reduced-motion`
	// le survol d'un libellé de nav ne produisait plus rien du tout. Un
	// utilisateur qui demande moins d'animation ne demande pas moins de couleur.
	// Seule la ligne au-dessus (la transition) porte légitimement `motion-safe:`.
	"hover:bg-primary/8 data-popup-open:bg-primary/8",
	// Aplat de la salle courante (« La devanture ») : `--section-soft` est exposé
	// par le `data-accent` du <header> (cf. navbar-wrapper). En APLAT, jamais en
	// encre — c'est le seul régime lisible des accents de marque. Il double le
	// trait rose ci-dessous, qui reste le porteur de l'information.
	"data-[active=true]:bg-(--section-soft)",
	"focus-ring",
);

export function DesktopNav({ navItems, featuredProducts, spotlightCollection }: DesktopNavProps) {
	const { isMenuItemActive } = useActiveNavbarItem();
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
								// ⚠️ `nativeButton={false}` est INDISSOCIABLE du `render` ci-dessous.
								// Base UI passe `native: nativeButton` (défaut `true`) à son
								// `useButton`, qui spread alors `type="button"` — attribut invalide sur
								// une ancre, doublé d'un avertissement en dev. À `false` il spread
								// `role="button"` et surtout ACTIVE sa branche `isLink`, écrite
								// exactement pour ce montage.
								//
								// Corollaire assumé : le lecteur d'écran annonce « bouton », pas
								// « lien ». Ce n'est pas une régression — c'était déjà le cas quand
								// l'élément ÉTAIT un `<button>` — et c'est honnête vis-à-vis du
								// clavier, où Entrée ouvre le panneau au lieu de naviguer.
								nativeButton={false}
								render={<Link href={item.href} />}
								className={linkClasses}
								data-active={itemIsActive}
								aria-current={itemIsActive ? "page" : undefined}
								onClick={(event) => {
									// Activation clavier (Entrée/Espace) : le clic synthétisé porte
									// `detail === 0`. On laisse Base UI ouvrir le panneau, sinon ses
									// liens seraient injoignables au clavier et au lecteur d'écran.
									//
									// ⚠️ `preventDefault()` est OBLIGATOIRE depuis que l'élément est une
									// ancre : sans lui, Entrée navigue nativement EN PLUS d'ouvrir le
									// panneau.
									if (event.detail === 0) {
										event.preventDefault();
										return;
									}
									// Tactile (pointeur grossier, pas de survol) : le tap ouvre le
									// panneau au lieu de naviguer — le CTA interne prend le relais (F3).
									if (isTouch) {
										event.preventDefault();
										return;
									}
									// Souris sur un pointeur capable de survol : le survol a déjà montré
									// le panneau, le clic va droit à la page section — par la navigation
									// NATIVE de l'ancre, plus par un `router.push`.
									//
									// C'est tout l'intérêt du montage : ⌘/Ctrl-clic et clic milieu
									// ouvrent un onglet, le menu contextuel propose « Copier l'adresse du
									// lien », le survol pose un prefetch, et `LoadingIndicator` a enfin
									// un `<Link>` ancêtre à interroger. Un `router.push` ne rendait aucun
									// de ces quatre services — sur les deux entrées les plus cliquées du
									// site.
									//
									// ⚠️ `preventBaseUIHandler()`, PAS `preventDefault()` — qui
									// annulerait justement la navigation qu'on veut. Base UI ne consulte
									// pas `defaultPrevented` : ses gestionnaires sont fusionnés par
									// `mergeProps`, qui ne les court-circuite que sur ce signal dédié.
									event.preventBaseUIHandler();
								}}
							>
								{item.label}
								<SquiggleUnderline
									className="-bottom-0.5 left-3 h-2 w-[calc(100%-2.75rem)]"
									drawn={itemIsActive}
								/>
								{/* Possible seulement depuis que le trigger rend un `<Link>` :
								    `useLinkStatus` exige un ancêtre `<Link>`, qu'un `<button>` +
								    `router.push` ne fournissait pas. */}
								<LoadingIndicator />
							</NavigationMenuTrigger>
							{/* Le panneau était pleine largeur (`fixed! left-0! right-0! w-screen!`).
							    C'était un gabarit de grand magasin pour un catalogue d'une dizaine
							    de liens — et `w-screen` valait `100vw`, gouttière de scrollbar
							    comprise, donc ~15px de débordement horizontal. Chaque panneau porte
							    désormais SA largeur : Base UI morphe de l'une à l'autre. */}
							{/* ⚠️ Plus de branche `collections` : le bento du méga-menu
							    Collections a été supprimé le 2026-08-08 avec toutes les
							    surfaces à cartes de collection (à refaire). « Les
							    collections » redevient donc un lien simple — c'est
							    `getDesktopNavItems` qui le décide, en ne posant plus
							    `hasDropdown`, et cette branche ne serait plus atteinte
							    de toute façon. */}
							<NavigationMenuContent>
								{item.dropdownType === "creations" && (
									<MegaMenuCreations
										productTypes={item.children}
										featuredProducts={featuredProducts}
										spotlightCollection={spotlightCollection}
									/>
								)}
							</NavigationMenuContent>
						</NavigationMenuItem>
					);
				})}
			</NavigationMenuList>

			{/* Le panneau, monté une seule fois. Base UI y déplace le contenu de l'item
			    actif et morphe la taille d'un panneau à l'autre.

			    ⚠️ **Aucun décor débordant ici, et surtout pas au-dessus du cadre.** Un
			    ruban de masking tape y vivait en `-top-2` ; avec le `sideOffset={8}` du
			    popup, ces 8 px de débord le posaient EXACTEMENT sur la rangée de nav,
			    à la hauteur du `SquiggleUnderline` (`-bottom-0.5`) — donc un aplat rose
			    opaque par-dessus le marqueur de la page courante, à chaque survol d'une
			    autre entrée. Le décor masquait l'état. Retiré le 2026-08-05. */}
			{/* ⚠️ `align="start"` est la CONSÉQUENCE MÉCANIQUE du déplacement de la nav à
			    gauche (2026-08-04), pas une préférence. Mesuré à 1280 px avec le défaut
			    `align="center"` : le panneau de 738 px centré sur un trigger désormais
			    à x=253 débordait à gauche, donc la détection de collision le rabattait à
			    **x=16** — 48 px en dehors du conteneur de page (qui commence à 96) et
			    237 px à gauche de son propre trigger. Aucun débordement, mais un panneau
			    qui ne s'aligne sur rien.

			    Ancré sur le bord gauche du trigger, il redevient lisible comme SON
			    panneau. Tant que la nav était centrée sur la page, `center` était le bon
			    défaut — c'est bien le déplacement qui l'a invalidé. */}
			<NavigationMenuPopup align="start" />
		</NavigationMenu>
	);
}
