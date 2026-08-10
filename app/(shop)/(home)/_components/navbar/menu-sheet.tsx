"use client";

import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";
import type { NavbarSessionData } from "@/shared/types/session.types";
import { HamburgerIcon } from "@/shared/components/icons/hamburger-icon";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/shared/components/ui/sheet";
import type { getMobileNavItems } from "@/shared/constants/navigation";
import { brandLinkLabel, LogoWordmark } from "@/shared/components/logo";
import { ROUTES } from "@/shared/constants/urls";
import Link from "next/link";
import { useEdgeSwipe } from "@/shared/hooks/use-edge-swipe";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useDialog } from "@/shared/providers/overlay-store-provider";
import { useSheetStore } from "@/shared/providers/overlay-store-provider";
import { usePathname } from "next/navigation";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/shared/utils/cn";
import { EdgeSwipeIndicator } from "./edge-swipe-indicator";
import { MenuSheetFooter } from "./menu-sheet-footer";
import type { MenuProductTypeItem } from "./menu-sheet-nav-sections";
import { MenuSheetNav } from "./menu-sheet-nav";
import { MenuSheetNavigateProvider } from "./menu-sheet-navigate-context";
import { iconButtonClassName, VAUL_TRANSITION_DURATION_MS } from "./navbar-styles";

/**
 * Id déterministe (et non `useId()`) : `aria-controls` doit désigner un élément
 * réel. Le `SheetContent` n'étant monté par le portail que sheet ouvert, un
 * id généré rendait la relation invérifiable et intestable. Aligné sur l'admin
 * (`#admin-menu-sheet-content`). Le menu est un singleton par page.
 */
const MENU_SHEET_CONTENT_ID = "shop-menu-sheet-content";

/** Trigger button classes — extends shared iconButtonClassName with mobile-specific overrides */
const triggerClassName = cn(
	iconButtonClassName,
	"-ml-3 inline-flex lg:hidden bg-transparent cursor-pointer",
	// Pas de `focus-visible:outline-*` ici : `iconButtonClassName` compose déjà
	// `focus-ring`, dont la première déclaration est `outline-none`. Rajouter un
	// outline par-dessus produisait DEUX indicateurs concurrents (anneau 3px +
	// contour 2px) sur le contrôle mobile le plus utilisé du site — exactement la
	// dérive que l'audit du 2026-05-25 avait supprimée partout ailleurs.
	// Tap feedback parity with footer-link / bottom-bar (2026-05-12)
	"touch-manipulation motion-safe:transition-transform motion-safe:duration-150 active:scale-[0.95]",
);

/** Id du sheet panier dans le `sheet-store` (cf. `SheetId`). */
const CART_SHEET_ID = "cart" as const;

/**
 * navItems (flat list from getMobileNavItems) is used to resolve the top-level
 * destinations by href (home, about, collections, favorites). productTypes is
 * consumed directly by its section for hierarchical display — the children
 * embedded in navItems are not used by the sheet.
 *
 * ⚠️ Plus de prop `collections` : la bande de cartes a été supprimée le
 * 2026-08-08 avec les autres surfaces à cartes de collection (à refaire). La
 * destination `/collections` remonte donc dans `navItems`, comme les autres.
 */
interface MenuSheetProps {
	navItems: ReturnType<typeof getMobileNavItems>;
	productTypes?: MenuProductTypeItem[];
	isAdmin?: boolean;
	session?: NavbarSessionData | null;
}

/**
 * Action différée jusqu'à la fin de la transition de SORTIE du volet — ouvrir
 * un second overlay (dialog de déconnexion, cart sheet) pendant que le premier
 * glisse encore empilerait deux modales (M2).
 */
type PendingAction = "logout" | "cart" | null;

export function MenuSheet({ navItems, productTypes, isAdmin = false, session }: MenuSheetProps) {
	const { isOpen, open: openMenu, close: closeMenu } = useDialog("menu-sheet");
	const [showLogout, setShowLogout] = useState(false);
	const [pendingAction, setPendingAction] = useState<PendingAction>(null);
	// L'opacité de l'indicateur de bord s'écrit sur le nœud, pas via un `useState` :
	// `onProgress` tire une fois par `touchmove`, ce qui re-rendait tout ce sheet à
	// chaque frame du geste. Voir `edge-swipe-indicator.tsx` et le même arbitrage,
	// déjà commenté, dans `quick-search-dialog.tsx`.
	const swipeIndicatorRef = useRef<HTMLDivElement>(null);
	const openCartSheet = useSheetStore((state) => state.open);
	const haptic = useHaptic();

	// Le trigger est blurré avant l'ouverture (cf. onOpenChange) : à ce moment
	// `document.activeElement` vaut déjà `<body>`, donc le FocusScope de Radix
	// mémorise `<body>` comme élément à restaurer et le focus retombait là à la
	// fermeture (WCAG 2.4.3). On garde donc une référence explicite et on la
	// réapplique dans `onCloseAutoFocus` — même handoff que l'onglet
	// « Rechercher » de la bottom bar (`setLastTrigger` avant blur).
	const triggerRef = useRef<HTMLButtonElement>(null);

	// `disabledFrom: "lg"` = le seuil du trigger burger (`lg:hidden`, ci-dessus) et
	// de `DesktopNav` (`hidden lg:flex`), dérivé du même SSOT. Avec un `1024` en
	// dur, le geste restait armé sur les largeurs où le mega-menu était déjà là
	// dès que la police racine changeait (audit responsive 2026-07-26, P2).
	useEdgeSwipe(
		() => {
			haptic("selection");
			openMenu();
		},
		isOpen,
		{
			disabledFrom: "lg",
			onProgress: (progress) => {
				if (swipeIndicatorRef.current) {
					swipeIndicatorRef.current.style.opacity = String(progress);
				}
			},
		},
	);

	// Filet : fermer sur changement de route. Le `sheet-store` possède déjà son
	// `SheetAutoCloseOnNavigation` (`overlay-store-provider.tsx`), mais le
	// `dialog-store` — qui porte ce menu — n'en a AUCUN : toute navigation non
	// initiée par un lien du menu (redirection, `router.push` d'un autre
	// composant) laissait le panneau ouvert par-dessus la nouvelle page.
	// `useEffectEvent` évite de mettre `closeMenu` en dépendance : `useDialog`
	// renvoie une nouvelle closure à chaque rendu, ce qui bouclerait.
	const pathname = usePathname();
	// Gardé sur `isOpen` : sans ça l'effet appelait `closeDialog` à chaque montage
	// et à chaque navigation même menu fermé — inoffensif, mais du bruit dans le
	// store et un compteur d'appels faussé côté tests.
	const closeOnRouteChange = useEffectEvent(() => {
		if (isOpen) closeMenu();
	});
	useEffect(() => {
		closeOnRouteChange();
	}, [pathname]);

	// Flag <html> when the sheet is open so CSS can scale the background content
	// (iOS-like modal aesthetic). useLayoutEffect prevents a one-frame flash on
	// open. Guarded by prefers-reduced-motion in CSS.
	useLayoutEffect(() => {
		if (!isOpen) return;
		document.documentElement.setAttribute("data-sheet-open", "");
		return () => {
			document.documentElement.removeAttribute("data-sheet-open");
		};
	}, [isOpen]);

	// Defer the follow-up overlay (logout dialog OR cart sheet) until the menu
	// finishes its exit transition. Listening for transitionend (transform
	// property) on sheet-content is more robust than a hardcoded setTimeout —
	// fallback timer kicks in only if the event is interrupted (e.g.
	// reduced-motion unmounts the content before paint).
	useEffect(() => {
		if (!pendingAction || isOpen) return;
		const action = pendingAction;
		// Scopé par id : un `[data-slot="sheet-content"]` nu attrapait le PREMIER
		// sheet du document (panier, filtres) et attendait SA transition.
		const sheetContent = document.getElementById(MENU_SHEET_CONTENT_ID);
		let done = false;
		const finish = () => {
			if (done) return;
			done = true;
			sheetContent?.removeEventListener("transitionend", onEnd);
			setPendingAction(null);
			if (action === "logout") setShowLogout(true);
			else openCartSheet(CART_SHEET_ID);
		};
		const onEnd = (event: TransitionEvent) => {
			if (event.propertyName === "transform" && event.target === sheetContent) finish();
		};
		// Reduced motion : `pwa.css` neutralise la transition transform du panneau
		// (cf. `sheet.tsx`, PANEL_TRANSITION), donc `transitionend` ne part jamais et
		// seul le fallback de 450 ms déclenchait — le chemin le PLUS lent pour qui
		// demande MOINS de mouvement. Micro-délai plutôt qu'appel direct : le volet
		// doit être démonté/peint avant que l'overlay suivant ne s'empile (M2).
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			const immediate = window.setTimeout(finish, 0);
			return () => clearTimeout(immediate);
		}
		sheetContent?.addEventListener("transitionend", onEnd);
		const fallback = window.setTimeout(finish, VAUL_TRANSITION_DURATION_MS);
		return () => {
			sheetContent?.removeEventListener("transitionend", onEnd);
			clearTimeout(fallback);
		};
	}, [pendingAction, isOpen, openCartSheet]);

	function handleLogoutClick() {
		haptic("light");
		setPendingAction("logout");
		closeMenu();
	}

	// Le raccourci « Panier » de la bande d'accès rapide : le panier est un sheet,
	// pas une route — fermer le menu d'abord, ouvrir le panier une fois la
	// transition de sortie terminée (même mécanique que la déconnexion).
	function handleCartClick() {
		haptic("light");
		setPendingAction("cart");
		closeMenu();
	}

	// Fermeture sur tap d'une entrée de navigation. Passe par la prop contrôlée
	// (`closeMenu`) et NON par `SheetClose` — cf. `menu-sheet-navigate-context`
	// pour la race `history.back()` vs `router.push` que ce détour évite.
	function handleNavigate() {
		haptic("light");
		closeMenu();
	}

	return (
		<>
			<EdgeSwipeIndicator ref={swipeIndicatorRef} hidden={isOpen} />
			<Sheet
				direction="left"
				open={isOpen}
				onOpenChange={(open) => {
					haptic("light");
					if (open) {
						// Blur trigger before sheet opens to prevent aria-hidden conflict:
						// the library sets aria-hidden on the header before focus moves to sheet content
						if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
						openMenu();
						return;
					}
					closeMenu();
				}}
			>
				<SheetTrigger
					render={
						<button
							ref={triggerRef}
							type="button"
							className={triggerClassName}
							aria-label={isOpen ? "Fermer le menu de navigation" : "Menu de navigation"}
							aria-haspopup="dialog"
							aria-expanded={isOpen}
							// ⚠️ CONDITIONNEL. Le `SheetContent` n'est monté par le portail que sheet
							// ouvert : posé en permanence, `aria-controls` désignait un id ABSENT du
							// document les 99 % du temps où le menu est fermé (axe le relève en
							// `aria-valid-attr-value`).
							//
							// C'est exactement ce que `shop-mobile-bottom-nav.tsx` refuse de faire, avec
							// sa justification écrite : « Désigner un id absent est plus nuisible que de
							// l'omettre — `aria-haspopup` + `aria-expanded` suffisent au pattern
							// disclosure ». Deux surfaces du même dépôt ne peuvent pas trancher
							// l'inverse l'une de l'autre.
							aria-controls={isOpen ? MENU_SHEET_CONTENT_ID : undefined}
						/>
					}
				>
					<HamburgerIcon isOpen={isOpen} />
				</SheetTrigger>

				<SheetContent
					id={MENU_SHEET_CONTENT_ID}
					// ⚠️ Le « × » par défaut est RÉTABLI (2026-08-04). Il avait été retiré au
					// motif de « TROIS affordances de fermeture concurrentes : ce bouton, le
					// scrim et le swipe — plus le burger lui-même ». La prémisse était fausse
					// au doigt : le panneau mesure `min(92vw, 360px)` et RECOUVRE intégralement
					// le burger, qui vit à ≤ 56 px du bord gauche. « Plus le burger » ne valait
					// que pour le clavier, où `finalFocus` y ramène.
					//
					// Ce qui restait à un primo-visiteur tactile : une bande de scrim de 50 px
					// à 390 px, 38 px à 320 px, sans aucune affordance — ou un geste que rien
					// n'annonce. Sortir d'un panneau ne se devine pas.
					//
					// Sûr vis-à-vis de la race `history.back()` de
					// `menu-sheet-navigate-context` : ce piège ne concerne QUE `SheetClose`
					// enroulé autour d'un `<Link>`, où le `back()` synchrone double le
					// `router.push`. Ici il n'y a aucune navigation à doubler, et consommer
					// l'entrée poussée à l'ouverture est exactement le comportement voulu.
					// `pl-0!` et non `p-0!` : `p-0` écrasait via tailwind-merge le
					// `pl-[max(0px,env(safe-area-inset-left))]` que `sheet.tsx` pose sur la
					// branche `direction="left"`, laissant le contenu sous l'encoche en
					// paysage. On neutralise les trois autres côtés et on laisse l'inset
					// gauche vivre, additionné au padding propre de chaque bloc.
					// Largeur « étal de poche » (2026-08-05) : 92vw plafonné à 360 px sous
					// `sm`, puis 70vw plafonné à 520 px — le volet grandit AVEC l'écran (à
					// 768 l'ancien plafond de 340 px laissait 56 % de scrim inutile), et la
					// grille des familles gagne sa 3ᵉ colonne au même palier. Le plafond
					// intégré de `sheet.tsx` sur la branche gauche (24rem à partir de `sm`)
					// est neutralisé ici, sinon il tronquait le palier en silence.
					className="bg-background/95 flex w-[min(92vw,360px)] flex-col border-r pt-0! pr-0! pb-0! sm:w-[min(70vw,520px)] sm:max-w-none"
					// ⚠️ Plus de `onOverlayClick={() => haptic("light")}` ici. Un tap sur le
					// scrim déclenche le `onClick` du `Backdrop` PUIS le dismiss de Base UI,
					// donc `onOpenChange` — qui vibre déjà. Deux pulsations pour un geste,
					// contre la règle « haptique : pas d'abus » du dépôt.
					// Restaure le focus sur le burger. Sans cela il retombait sur `<body>`
					// (le trigger est blurré avant l'ouverture, donc la restauration
					// automatique n'aurait mémorisé que `<body>`) — cf. `triggerRef`.
					// `finalFocus` remplace l'ancien `onCloseAutoFocus` + `preventDefault`.
					finalFocus={triggerRef}
				>
					{/* `pr-16` : réserve la place du « × » (size-11 posé à `right-4`, soit de
					    16 à 60 px du bord). Sans lui le titre passerait dessous. */}
					<SheetHeader className="pt-[max(1rem,env(safe-area-inset-top))] pr-16 pb-2 pl-5">
						<SheetTitle className="flex items-center">
							{/* `min-h-11` : sans lui la cible ne mesurait que la line-height de
							    `text-xl`, soit 28px — sous le minimum WCAG 2.5.5 (44px).
							    Le lien reste écrit ICI, et non délégué à `<Logo href>` : il porte
							    `replace` (consomme l'entrée d'historique du panneau) et
							    `onClick={handleNavigate}` (fermeture par la prop contrôlée), deux
							    comportements verrouillés par
							    `menu-sheet-link-navigation.regression.test.tsx`. Seuls le DESSIN du
							    nom et son LIBELLÉ sont mutualisés. */}
							<Link
								href={ROUTES.SHOP.HOME}
								replace
								prefetch={null}
								onClick={handleNavigate}
								className="focus-ring inline-flex min-h-11 items-center rounded-md"
								aria-label={brandLinkLabel(ROUTES.SHOP.HOME)}
							>
								<LogoWordmark className="text-xl" />
							</Link>
						</SheetTitle>
						{/* Tutoiement + première personne — la voix du dépôt ne s'arrête pas
						    aux lecteurs d'écran (le vouvoiement « Découvrez nos bijoux »
						    n'était servi qu'à eux, audit menu-sheet 2026-08-05). */}
						<SheetDescription className="sr-only">
							Menu de navigation — découvre mes créations et mes collections
						</SheetDescription>
					</SheetHeader>

					{/* Scrollable content. Le provider englobe AUSSI le footer : ses liens
					    « Aide » / « Écrire à Léane » ferment par la même prop contrôlée. */}
					<MenuSheetNavigateProvider value={handleNavigate}>
						<div className="min-h-0 flex-1">
							<div
								data-slot="scroll-fade-container"
								className="scroll-fade-y h-full overflow-x-hidden overflow-y-auto"
							>
								<MenuSheetNav
									navItems={navItems}
									productTypes={productTypes}
									session={session}
									isAdmin={isAdmin}
									onLogoutClick={handleLogoutClick}
									onCartClick={handleCartClick}
								/>
							</div>
						</div>

						<MenuSheetFooter />
					</MenuSheetNavigateProvider>
				</SheetContent>
			</Sheet>

			{/* Logout dialog rendered outside sheet to avoid stacked modals (M2) */}
			<LogoutAlertDialog open={showLogout} onOpenChange={setShowLogout} />
		</>
	);
}
