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
	SheetHandle,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/shared/components/ui/sheet";
import type { getMobileNavItems } from "@/shared/constants/navigation";
import { useEdgeSwipe } from "@/shared/hooks/use-edge-swipe";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/utils/cn";
import { MenuSheetFooter } from "./menu-sheet-footer";
import { MenuSheetNav } from "./menu-sheet-nav";
import { iconButtonClassName } from "./navbar-styles";

/** Trigger button classes — extends shared iconButtonClassName with mobile-specific overrides */
const triggerClassName = cn(
	iconButtonClassName,
	"-ml-3 inline-flex lg:hidden bg-transparent cursor-pointer",
	"focus-visible:outline-2 focus-visible:outline-primary",
);

/**
 * navItems (flat list from getMobileNavItems) drives the mobile sheet's link rendering,
 * while productTypes/collections provide hierarchical data for sectioned display.
 * Both are needed because the flat list lacks the grouping structure required by sections.
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
	const wantsLogoutRef = useRef(false);
	const haptic = useHaptic();

	useEdgeSwipe(() => {
		haptic("selection");
		openMenu();
	}, isOpen);

	// Flag <html> when the sheet is open so CSS can scale the background content
	// (iOS-like modal aesthetic). Guarded by prefers-reduced-motion in CSS.
	useEffect(() => {
		if (!isOpen) return;
		document.documentElement.setAttribute("data-sheet-open", "");
		return () => {
			document.documentElement.removeAttribute("data-sheet-open");
		};
	}, [isOpen]);

	function handleLogoutClick() {
		haptic("light");
		wantsLogoutRef.current = true;
		closeMenu();
	}

	return (
		<>
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
					if (wantsLogoutRef.current) {
						wantsLogoutRef.current = false;
						// Defer so Vaul starts its close transition before the alert dialog mounts —
						// prevents focus-trap / aria-hidden conflicts between overlapping overlays.
						setTimeout(() => setShowLogout(true), 150);
					}
				}}
				preventScrollRestoration
				scrollLockTimeout={500}
			>
				<SheetTrigger asChild>
					<button
						type="button"
						className={triggerClassName}
						aria-label={isOpen ? "Fermer le menu de navigation" : "Ouvrir le menu de navigation"}
						aria-haspopup="dialog"
						aria-expanded={isOpen}
					>
						<HamburgerIcon isOpen={isOpen} />
					</button>
				</SheetTrigger>

				<SheetContent
					className="bg-background/95 flex w-[min(88vw,340px)] flex-col border-r p-0! sm:w-80 sm:max-w-md"
					onOverlayClick={() => haptic("light")}
				>
					{/* Drag-handle pill verticale (iOS-like) — Vaul Handle pour drag réel
					 * malgré le ScrollFade en dessous. mx-auto/mt-* du composant base
					 * sont overridés pour le placement absolute right-edge. */}
					<SheetHandle
						aria-label="Glisser pour fermer le menu"
						className="absolute top-1/2 right-1 mx-0 mt-0 h-12 w-1 -translate-y-1/2 before:-inset-x-4 before:-inset-y-2"
					/>
					<SheetHeader className="pt-[max(1rem,env(safe-area-inset-top))] pb-2 pl-5">
						<SheetTitle className="font-cursive flex h-9 items-center text-xl font-bold">
							Synclune
						</SheetTitle>
						<SheetDescription className="sr-only">
							Menu de navigation - Découvrez nos bijoux et collections
						</SheetDescription>
					</SheetHeader>

					{/* Live region: announces menu opening to screen readers (fires on mount) */}
					<p role="status" aria-live="polite" className="sr-only">
						Menu ouvert, {navItems.length} liens de navigation disponibles
					</p>

					{/* Scrollable content */}
					<div className="min-h-0 flex-1">
						<ScrollFade axis="vertical" className="h-full" hideScrollbar={false}>
							<MenuSheetNav
								navItems={navItems}
								productTypes={productTypes}
								collections={collections}
								session={session}
								isAdmin={isAdmin}
								onLogoutClick={handleLogoutClick}
							/>
						</ScrollFade>
					</div>

					<MenuSheetFooter isAdmin={isAdmin} />
				</SheetContent>
			</Sheet>

			{/* Logout dialog rendered outside sheet to avoid stacked modals (M2) */}
			<LogoutAlertDialog open={showLogout} onOpenChange={setShowLogout} />
		</>
	);
}
