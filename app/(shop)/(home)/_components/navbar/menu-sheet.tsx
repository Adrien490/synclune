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
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useEffect, useId, useLayoutEffect, useState } from "react";
import { cn } from "@/shared/utils/cn";
import { EdgeSwipeIndicator } from "./edge-swipe-indicator";
import { MenuSheetFooter } from "./menu-sheet-footer";
import { MenuSheetNav } from "./menu-sheet-nav";
import { iconButtonClassName } from "./navbar-styles";

/** Trigger button classes — extends shared iconButtonClassName with mobile-specific overrides */
const triggerClassName = cn(
	iconButtonClassName,
	"-ml-3 inline-flex lg:hidden bg-transparent cursor-pointer",
	"focus-visible:outline-2 focus-visible:outline-primary",
	// Tap feedback parity with footer-link / bottom-bar (2026-05-12)
	"touch-manipulation motion-safe:transition-transform motion-safe:duration-150 active:scale-[0.95]",
);

/**
 * Approximate duration of Vaul's exit slide-out animation. Used as safety
 * fallback when deferring a follow-up overlay (LogoutAlertDialog) until the
 * sheet has finished closing — avoids focus-trap / aria-hidden conflicts
 * between overlapping overlays. Source: vaul defaults (~300ms) + margin.
 */
const VAUL_EXIT_DURATION_MS = 450;

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
	const sheetId = useId();
	const { isOpen, open: openMenu, close: closeMenu } = useDialog("menu-sheet");
	const [showLogout, setShowLogout] = useState(false);
	const [pendingLogout, setPendingLogout] = useState(false);
	const [swipeProgress, setSwipeProgress] = useState(0);
	const haptic = useHaptic();

	useEdgeSwipe(
		() => {
			haptic("selection");
			openMenu();
		},
		isOpen,
		1024,
		setSwipeProgress,
	);

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
		const sheetContent = document.querySelector<HTMLElement>('[data-slot="sheet-content"]');
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
		const fallback = window.setTimeout(finish, VAUL_EXIT_DURATION_MS);
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
						type="button"
						className={triggerClassName}
						aria-label="Menu de navigation"
						aria-haspopup="dialog"
						aria-expanded={isOpen}
						aria-controls={sheetId}
					>
						<HamburgerIcon isOpen={isOpen} />
					</button>
				</SheetTrigger>

				<SheetContent
					id={sheetId}
					className="bg-background/95 flex w-[min(88vw,340px)] flex-col border-r p-0! sm:w-80 sm:max-w-md"
					onOverlayClick={() => haptic("light")}
				>
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
						Menu ouvert, {navItems.length}{" "}
						{navItems.length > 1
							? "liens de navigation disponibles"
							: "lien de navigation disponible"}
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
