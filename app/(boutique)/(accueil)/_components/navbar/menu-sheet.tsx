"use client";

import type { CollectionImage } from "@/modules/collections/types/collection.types";
import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";
import type { NavbarSessionData } from "@/shared/types/session.types";
import ScrollFade from "@/shared/components/scroll-fade";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/shared/components/ui/sheet";
import type { getMobileNavItems } from "@/shared/constants/navigation";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { m, useReducedMotion } from "motion/react";
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

/** Detect swipe-from-left-edge to open menu (mobile native UX pattern) */
function useEdgeSwipe(onOpen: () => void, isOpen: boolean) {
	const onOpenRef = useRef(onOpen);
	useEffect(() => {
		onOpenRef.current = onOpen;
	});

	useEffect(() => {
		// Skip on desktop (pointer: fine) and when menu is already open
		if (typeof window === "undefined") return;
		const mql = window.matchMedia("(min-width: 1024px)");
		if (mql.matches) return;

		let startX = 0;
		let startY = 0;
		let tracking = false;

		function onTouchStart(e: TouchEvent) {
			if (isOpen) return;
			const touch = e.touches[0];
			if (!touch) return;
			// Only track touches starting within 20px of the left edge
			if (touch.clientX <= 20) {
				startX = touch.clientX;
				startY = touch.clientY;
				tracking = true;
			}
		}

		function onTouchMove(e: TouchEvent) {
			if (!tracking) return;
			const touch = e.touches[0];
			if (!touch) return;
			const dx = touch.clientX - startX;
			const dy = Math.abs(touch.clientY - startY);

			// Cancel if vertical movement dominates (user is scrolling)
			if (dy > dx) {
				tracking = false;
				return;
			}

			// Trigger open when horizontal swipe exceeds 50px
			if (dx > 50) {
				tracking = false;
				onOpenRef.current();
			}
		}

		function onTouchEnd() {
			tracking = false;
		}

		document.addEventListener("touchstart", onTouchStart, { passive: true });
		document.addEventListener("touchmove", onTouchMove, { passive: true });
		document.addEventListener("touchend", onTouchEnd, { passive: true });

		return () => {
			document.removeEventListener("touchstart", onTouchStart);
			document.removeEventListener("touchmove", onTouchMove);
			document.removeEventListener("touchend", onTouchEnd);
		};
	}, [isOpen]);
}

/** Animated hamburger ↔ X morph icon (3 bars → cross) */
function HamburgerIcon({ isOpen }: { isOpen: boolean }) {
	const shouldReduceMotion = useReducedMotion();
	const transition = shouldReduceMotion
		? { duration: 0 }
		: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const };

	return (
		<svg
			width={20}
			height={20}
			viewBox="0 0 20 20"
			fill="none"
			aria-hidden="true"
			className="text-current"
		>
			{/* Top bar → top-left to bottom-right diagonal */}
			<m.line
				x1="3"
				x2="17"
				y1="5"
				y2="5"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				initial={{ x1: 3, x2: 17, y1: 5, y2: 5, opacity: 1 }}
				animate={
					isOpen
						? { x1: 4, x2: 16, y1: 4, y2: 16, opacity: 1 }
						: { x1: 3, x2: 17, y1: 5, y2: 5, opacity: 1 }
				}
				transition={transition}
			/>
			{/* Middle bar → fades out */}
			<m.line
				x1="3"
				x2="17"
				y1="10"
				y2="10"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				initial={{ opacity: 1 }}
				animate={isOpen ? { opacity: 0 } : { opacity: 1 }}
				transition={transition}
			/>
			{/* Bottom bar → bottom-left to top-right diagonal */}
			<m.line
				x1="3"
				x2="17"
				y1="15"
				y2="15"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				initial={{ x1: 3, x2: 17, y1: 15, y2: 15, opacity: 1 }}
				animate={
					isOpen
						? { x1: 4, x2: 16, y1: 16, y2: 4, opacity: 1 }
						: { x1: 3, x2: 17, y1: 15, y2: 15, opacity: 1 }
				}
				transition={transition}
			/>
		</svg>
	);
}
