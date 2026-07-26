"use client";

import type { CollectionImage } from "@/modules/collections/types/collection.types";
import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";
import type { NavbarSessionData } from "@/shared/types/session.types";
import ScrollFade from "@/shared/components/scroll-fade";
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
import { ROUTES } from "@/shared/constants/urls";
import Link from "next/link";
import { useEdgeSwipe } from "@/shared/hooks/use-edge-swipe";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { usePathname } from "next/navigation";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/shared/utils/cn";
import { EdgeSwipeIndicator } from "./edge-swipe-indicator";
import { MenuSheetFooter } from "./menu-sheet-footer";
import { MenuSheetNav } from "./menu-sheet-nav";
import { MenuSheetNavigateProvider } from "./menu-sheet-navigate-context";
import { iconButtonClassName, VAUL_TRANSITION_DURATION_MS } from "./navbar-styles";

/**
 * Id déterministe (et non `useId()`) : `aria-controls` doit désigner un élément
 * réel. Le `SheetContent` n'étant monté par le portail Vaul que sheet ouvert, un
 * id généré rendait la relation invérifiable et intestable. Aligné sur l'admin
 * (`#admin-menu-sheet-content`). Le menu est un singleton par page.
 */
const MENU_SHEET_CONTENT_ID = "shop-menu-sheet-content";

/** Trigger button classes — extends shared iconButtonClassName with mobile-specific overrides */
const triggerClassName = cn(
	iconButtonClassName,
	"-ml-3 inline-flex lg:hidden bg-transparent cursor-pointer",
	"focus-visible:outline-2 focus-visible:outline-primary",
	// Tap feedback parity with footer-link / bottom-bar (2026-05-12)
	"touch-manipulation motion-safe:transition-transform motion-safe:duration-150 active:scale-[0.95]",
);

/**
 * navItems (flat list from getMobileNavItems) is used to resolve the top-level
 * destinations by href (home, about, account, favorites). productTypes/collections
 * are consumed directly by their respective sections for hierarchical display —
 * the children embedded in navItems are not used by the sheet.
 */
interface MenuSheetProps {
	navItems: ReturnType<typeof getMobileNavItems>;
	productTypes?: Array<{ slug: string; label: string }>;
	collections?: Array<{
		slug: string;
		label: string;
		images: CollectionImage[];
		createdAt?: Date;
	}>;
	isAdmin?: boolean;
	session?: NavbarSessionData | null;
}

export function MenuSheet({
	navItems,
	productTypes,
	collections,
	isAdmin = false,
	session,
}: MenuSheetProps) {
	const { isOpen, open: openMenu, close: closeMenu } = useDialog("menu-sheet");
	const [showLogout, setShowLogout] = useState(false);
	const [pendingLogout, setPendingLogout] = useState(false);
	const [swipeProgress, setSwipeProgress] = useState(0);
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
		{ disabledFrom: "lg", onProgress: setSwipeProgress },
	);

	// Filet : fermer sur changement de route. Le `sheet-store` possède déjà son
	// `SheetAutoCloseOnNavigation` (`sheet-store-provider.tsx`), mais le
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

	// Defer LogoutAlertDialog until Vaul finishes its exit transition. Listening
	// for transitionend (transform property) on sheet-content is more robust
	// than a hardcoded setTimeout — fallback timer kicks in only if the event
	// is interrupted (e.g. reduced-motion unmounts the content before paint).
	useEffect(() => {
		if (!pendingLogout || isOpen) return;
		// Scopé par id : un `[data-slot="sheet-content"]` nu attrapait le PREMIER
		// sheet du document (panier, filtres) et attendait SA transition.
		const sheetContent = document.getElementById(MENU_SHEET_CONTENT_ID);
		let done = false;
		const finish = () => {
			if (done) return;
			done = true;
			sheetContent?.removeEventListener("transitionend", onEnd);
			setPendingLogout(false);
			setShowLogout(true);
		};
		const onEnd = (event: TransitionEvent) => {
			if (event.propertyName === "transform" && event.target === sheetContent) finish();
		};
		sheetContent?.addEventListener("transitionend", onEnd);
		const fallback = window.setTimeout(finish, VAUL_TRANSITION_DURATION_MS);
		return () => {
			sheetContent?.removeEventListener("transitionend", onEnd);
			clearTimeout(fallback);
		};
	}, [pendingLogout, isOpen]);

	function handleLogoutClick() {
		haptic("light");
		setPendingLogout(true);
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
			<EdgeSwipeIndicator progress={swipeProgress} hidden={isOpen} />
			<Sheet
				direction="left"
				open={isOpen}
				onOpenChange={(open) => {
					haptic("light");
					if (open) {
						// Blur trigger before sheet opens to prevent aria-hidden conflict:
						// Vaul/Radix sets aria-hidden on the header before focus moves to sheet content
						if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
						openMenu();
						return;
					}
					closeMenu();
				}}
				preventScrollRestoration
				scrollLockTimeout={500}
			>
				<SheetTrigger asChild>
					<button
						ref={triggerRef}
						type="button"
						className={triggerClassName}
						aria-label={isOpen ? "Fermer le menu de navigation" : "Menu de navigation"}
						aria-haspopup="dialog"
						aria-expanded={isOpen}
						aria-controls={MENU_SHEET_CONTENT_ID}
					>
						<HamburgerIcon isOpen={isOpen} />
					</button>
				</SheetTrigger>

				<SheetContent
					id={MENU_SHEET_CONTENT_ID}
					// `pl-0!` et non `p-0!` : `p-0` écrasait via tailwind-merge le
					// `pl-[max(0px,env(safe-area-inset-left))]` que `sheet.tsx` pose sur la
					// branche `direction="left"`, laissant le contenu sous l'encoche en
					// paysage. On neutralise les trois autres côtés et on laisse l'inset
					// gauche vivre, additionné au padding propre de chaque bloc.
					className="bg-background/95 flex w-[min(88vw,340px)] flex-col border-r pt-0! pr-0! pb-0! sm:w-80 sm:max-w-md"
					onOverlayClick={() => haptic("light")}
					// Restaure le focus sur le burger. Sans cela il retombait sur `<body>`
					// (le trigger est blurré avant l'ouverture, donc le FocusScope Radix
					// n'avait mémorisé que `<body>`) — cf. `triggerRef` ci-dessus.
					onCloseAutoFocus={(event) => {
						if (!triggerRef.current) return;
						event.preventDefault();
						triggerRef.current.focus();
					}}
				>
					<SheetHeader className="pt-[max(1rem,env(safe-area-inset-top))] pb-2 pl-5">
						<SheetTitle className="font-cursive flex items-center text-xl">
							{/* `min-h-11` : sans lui la cible ne mesurait que la line-height de
							    `text-xl`, soit 28px — sous le minimum WCAG 2.5.5 (44px). */}
							<Link
								href={ROUTES.SHOP.HOME}
								replace
								prefetch={null}
								onClick={handleNavigate}
								className="focus-ring inline-flex min-h-11 items-center rounded-md"
								aria-label="Synclune - Retour à l'accueil"
							>
								Synclune
							</Link>
						</SheetTitle>
						<SheetDescription className="sr-only">
							Menu de navigation - Découvrez nos bijoux et collections
						</SheetDescription>
					</SheetHeader>

					{/* Scrollable content */}
					<div className="min-h-0 flex-1">
						<ScrollFade axis="vertical" className="h-full" hideScrollbar={false}>
							<MenuSheetNavigateProvider value={handleNavigate}>
								<MenuSheetNav
									navItems={navItems}
									productTypes={productTypes}
									collections={collections}
									session={session}
									isAdmin={isAdmin}
									onLogoutClick={handleLogoutClick}
								/>
							</MenuSheetNavigateProvider>
						</ScrollFade>
					</div>

					<MenuSheetFooter />
				</SheetContent>
			</Sheet>

			{/* Logout dialog rendered outside sheet to avoid stacked modals (M2) */}
			<LogoutAlertDialog open={showLogout} onOpenChange={setShowLogout} />
		</>
	);
}
