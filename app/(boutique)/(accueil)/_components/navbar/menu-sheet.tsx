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
import { useEdgeSwipe } from "@/shared/hooks/use-edge-swipe";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useState } from "react";
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
	useEdgeSwipe(openMenu, isOpen);

	function handleLogoutClick() {
		closeMenu();
		// Small delay to let sheet close before opening the alert dialog
		setTimeout(() => setShowLogout(true), 150);
	}

	return (
		<>
			<Sheet
				direction="left"
				open={isOpen}
				onOpenChange={(open) => (open ? openMenu() : closeMenu())}
				preventScrollRestoration
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

				<SheetContent className="bg-background/95 flex w-[min(88vw,340px)] flex-col border-r p-0! sm:w-80 sm:max-w-md">
					{/* Header sr-only */}
					<SheetHeader className="sr-only p-0!">
						<SheetTitle>Menu de navigation</SheetTitle>
						<SheetDescription>
							Menu de navigation de Synclune - Découvrez nos bijoux et collections
						</SheetDescription>
					</SheetHeader>

					{/* Scrollable content */}
					<div className="min-h-0 flex-1">
						<ScrollFade axis="vertical" className="h-full" hideScrollbar={false}>
							<MenuSheetNav
								navItems={navItems}
								productTypes={productTypes}
								collections={collections}
								session={session}
								isAdmin={isAdmin}
								isOpen={isOpen}
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
