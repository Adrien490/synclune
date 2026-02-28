"use client";

import type { CollectionImage } from "@/modules/collections/types/collection.types";
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
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "@/shared/utils/cn";
import { MenuSheetFooter } from "./menu-sheet-footer";
import { MenuSheetNav } from "./menu-sheet-nav";

/** Trigger button classes (mirrors iconButtonClassName from navbar.tsx) */
const triggerClassName = cn(
	"relative -ml-3 inline-flex items-center justify-center size-11 rounded-xl lg:hidden",
	"bg-transparent hover:bg-accent text-muted-foreground hover:text-accent-foreground",
	"transition-[transform,color,background-color] duration-300 ease-out",
	"motion-safe:hover:scale-105 motion-safe:active:scale-95",
	"cursor-pointer group",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
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
	useEdgeSwipe(openMenu, isOpen);

	return (
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
						/>
					</ScrollFade>
				</div>

				<MenuSheetFooter isAdmin={isAdmin} />
			</SheetContent>
		</Sheet>
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
			<motion.line
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
			<motion.line
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
			<motion.line
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
