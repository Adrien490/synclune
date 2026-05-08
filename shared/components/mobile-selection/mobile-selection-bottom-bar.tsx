"use client";

import type { ReactNode } from "react";

import { BottomBar } from "@/shared/components/bottom-bar";
import { useBulkSelectionContext } from "@/shared/components/data-table";
import { useBackButtonClose } from "@/shared/hooks/use-back-button-close";
import { useRegisterOverlay } from "@/shared/hooks/use-register-overlay";
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
 * - Appelle `useRegisterOverlay()` quand active → la `AdminMobileBottomBar` se cache
 *   automatiquement (cf. `useHasOverlay` dans le shell admin).
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

	useRegisterOverlay(isActive);
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
			height={56}
			aria-label={ariaLabel}
			className={cn("px-3 py-2", className)}
		>
			{children}
		</BottomBar>
	);
}
