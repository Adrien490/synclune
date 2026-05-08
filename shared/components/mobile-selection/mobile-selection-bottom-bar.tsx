"use client";

import type { ReactNode } from "react";

import { BottomBar } from "@/shared/components/bottom-bar";
import { useBulkSelectionContext } from "@/shared/components/data-table";
import { useBackButtonClose } from "@/shared/hooks/use-back-button-close";
import { cn } from "@/shared/utils/cn";

interface MobileSelectionBottomBarProps {
	children: ReactNode;
	className?: string;
	"aria-label"?: string;
}

/**
 * Sticky bottom bar mobile rendue uniquement quand `selectionMode === true`
 * ET qu'il y a des items affichés (`pageItemIds.length > 0`).
 *
 * Garanties UX (pattern Mail iOS) :
 * - Empilée **au-dessus** de la `AdminMobileBottomBar` (offset
 *   `bottom: calc(56px + safe-area-inset-bottom)`) afin que le toggle
 *   « Sélection » de la nav globale reste accessible au pouce pour quitter le
 *   mode. La hauteur reportée à `useBottomBarHeight` (112) couvre les deux
 *   bars empilées pour les offsets de contenu (FAB, sticky CTAs).
 * - Hijack du back-button hardware Android / swipe-back iOS via `useBackButtonClose`
 *   → un retour quitte le mode sélection au lieu de la page.
 *
 * Les boutons d'actions sont fournis via `children` — c'est aux modules de gérer
 * leur état `disabled` selon `selectedCount`.
 */
export function MobileSelectionBottomBar({
	children,
	className,
	"aria-label": ariaLabel = "Actions groupées",
}: MobileSelectionBottomBarProps) {
	const { selectionMode, exitSelectionMode, pageItemIds } = useBulkSelectionContext();

	const isActive = selectionMode && pageItemIds.length > 0;

	useBackButtonClose({
		isOpen: isActive,
		onClose: exitSelectionMode,
		id: "mobile-selection-mode",
	});

	if (!isActive) return null;

	return (
		<BottomBar
			as="div"
			breakpointClass="md:hidden"
			zIndex="z-(--z-bar)"
			height={112}
			aria-label={ariaLabel}
			className={cn("bottom-[calc(56px+env(safe-area-inset-bottom))] px-3 py-2 pb-2", className)}
		>
			{children}
		</BottomBar>
	);
}
