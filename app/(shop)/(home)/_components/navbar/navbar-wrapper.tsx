"use client";

import { usePathname } from "next/navigation";

import { useIsScrolled } from "@/shared/hooks/use-is-scrolled";
import { cn } from "@/shared/utils/cn";
import { resolveNavbarSection } from "./navbar-section";

interface NavbarWrapperProps {
	children: React.ReactNode;
}

/**
 * Wrapper client de la Navbar — « La devanture » (2026-08-04).
 *
 * ## La barre a un SOL, dès le premier pixel
 *
 * Tout le vocabulaire d'atelier du header (fond, filet, grain de papier polaroïd,
 * ombre) vivait sur un seul calque en `opacity-0`, révélé au-delà de 20 px de
 * scroll. Au repos — c'est-à-dire dans l'état où l'on découvre chaque page — la
 * barre n'avait donc AUCUN sol : un logo et deux mots posés dans le vide. La
 * signature payée par la refonte précédente était invisible là où elle compte.
 *
 * Deux calques désormais, et la répartition n'est pas cosmétique :
 *
 * 1. **le sol, permanent** — fond, filet, grain, et le flou. Le flou doit vivre
 *    ici : posé sur le calque de scroll, il aurait eu pour arrière-plan le fond
 *    quasi opaque du calque du dessous, donc n'aurait rien flouté du tout ;
 * 2. **la profondeur, au scroll** — une ombre portée, seule. Le calque n'a pas de
 *    fond : il ne peint que son `box-shadow`, et seule son OPACITÉ transitionne.
 *    Aucune propriété non composable n'est animée.
 *
 * ## Le bandeau est la SIGNATURE de la marque, pas un indicateur de salle
 *
 * Il a d'abord consommé `--section-accent` : rose sur l'accueil, lavande sur les
 * créations, menthe sur les collections, or sur l'aide — et rien du tout hors
 * boutique. La barre changeait donc de couleur à chaque navigation, ce qui a été
 * jugé instable (décision design 2026-08-04). Le bandeau est désormais **toujours
 * peint, et toujours en `--primary`**, sur toutes les routes.
 *
 * `data-accent` reste posé sur le `<header>` (SSOT `navbar-section.ts`) : il
 * expose `--section-soft`, l'aplat de l'entrée de nav courante, et il gouverne le
 * nom de la salle sous `lg`. Ce n'est plus lui qui décide de la couleur du filet.
 *
 * ⚠️ Le bandeau est posé en `absolute bottom-0` À L'INTÉRIEUR de la hauteur de la
 * barre, jamais ajouté dessous : sinon le header mesurerait 4 px de plus que
 * `--navbar-height`, et tout ce qui s'y accroche (barre de tri de `/produits`,
 * CTA collante de la PDP, `scroll-padding-top`) se décalerait d'autant.
 *
 * ## Il n'y a plus de mode compact
 *
 * `data-scrolled` ne pilote plus la hauteur — cf. le commentaire de
 * `app/globals.css`, § `@media (width >= 40rem)`. Il ne reste que l'ombre, et le
 * nom de la salle sous `lg` (`NavbarRoomLabel`).
 */
export function NavbarWrapper({ children }: NavbarWrapperProps) {
	const isScrolled = useIsScrolled(20);
	const { accent } = resolveNavbarSection(usePathname());

	return (
		<header
			data-scrolled={isScrolled}
			data-home-navbar
			data-accent={accent ?? undefined}
			style={{ viewTransitionName: "shop-navbar" }}
			// ⚠️ `group/navbar` NOMMÉ, et surtout pas `group` nu. Le header enveloppe
			// tout le contenu de la barre : avec un groupe anonyme, il devient le
			// premier ancêtre `.group` de chacun de ses descendants et capture leurs
			// variants. Deux dégâts constatés — le trait dessiné de CHAQUE entrée de
			// nav s'affichait dès qu'un élément QUELCONQUE du header prenait le focus
			// (`group-focus-within` de `SquiggleUnderline`), et les icônes du cluster
			// d'actions grossissaient au survol de n'importe quel point de la barre
			// (`motion-safe:group-hover:scale-105`). Même bug que le `group` nu de
			// `NavigationMenuList`, corrigé le 2026-08-04 : un conteneur partagé ne
			// squatte pas l'espace de noms anonyme.
			className={cn("pwa-header", "group/navbar fixed inset-x-0 top-0 z-(--z-header)")}
		>
			{/* Le sol — permanent. */}
			<div
				aria-hidden="true"
				className={cn(
					"pointer-events-none absolute inset-0 -z-10",
					"polaroid-paper",
					// ⚠️ `/95` et pas moins. En passant le sol en permanent j'avais
					// descendu l'alpha à `/92` « pour que le flou serve à quelque chose » :
					// mesuré à 768, le titre d'une page (display 36px) redevenait
					// franchement lisible SOUS la barre. 5 % de fuite sur du texte se
					// mesure à ~1,05:1 — imperceptible ; 8 % ne l'est plus. Le flou garde
					// son utilité sur ces 5 %.
					"bg-background/95 border-border border-b backdrop-blur-md",
				)}
			/>

			{/* La profondeur — au scroll. Ombre seule, opacité seule. */}
			<div
				aria-hidden="true"
				className={cn(
					"pointer-events-none absolute inset-0 -z-10",
					"shadow-header",
					"opacity-0 motion-safe:transition-opacity motion-safe:duration-[var(--duration-slow)] motion-safe:ease-out",
					"group-data-[scrolled=true]/navbar:opacity-100",
				)}
			/>

			{children}

			{/* Le bandeau de marque — rose `--primary`, sur TOUTES les routes. Il
			    recouvre le filet `--border` du sol, qui reste le repli si ce calque
			    disparaissait. */}
			<div
				aria-hidden="true"
				className="bg-primary pointer-events-none absolute inset-x-0 bottom-0 h-1"
			/>
		</header>
	);
}
