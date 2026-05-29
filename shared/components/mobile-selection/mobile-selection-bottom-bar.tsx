"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { BottomBar } from "@/shared/components/bottom-bar";
import { useBulkSelectionContext } from "@/shared/components/data-table";
import { Button } from "@/shared/components/ui/button";
import { useBackButtonClose } from "@/shared/hooks/use-back-button-close";
import { useEdgeSwipe } from "@/shared/hooks/use-edge-swipe";
import { useMounted } from "@/shared/hooks/use-mounted";
import { cn } from "@/shared/utils/cn";

const COMPACT_BAR_HEIGHT = 64;
// Une seule rangée de boutons `h-11` (44px) + padding vertical. Dimensionné au plus
// juste : une hauteur excessive laissait les boutons flotter en haut d'une bande vide
// (l'ancien 112px prévoyait une 2e ligne de count, absente en présentation bottom-bar).
const ACTION_BAR_HEIGHT = 76;

interface MobileSelectionBottomBarProps {
	children: ReactNode;
	className?: string;
	"aria-label"?: string;
	/**
	 * Hint affiché en mode compact (0 sélectionné). Permet aux listes d'injecter
	 * le ton atelier ("Tape sur les bijoux à sélectionner", "Tape sur les
	 * commandes à sélectionner"…). Default générique.
	 */
	emptyHint?: string;
}

/**
 * Sticky bottom bar mobile rendue uniquement quand `selectionMode === true`
 * ET qu'il y a des items affichés (`pageItemIds.length > 0`).
 *
 * Garanties UX (pattern Mail iOS) :
 * - **Remplace** la `AdminMobileBottomBar` (qui se cache via le bridge
 *   `useAdminListSelectionStore`) — elle est donc collée au safe-area-bottom
 *   directement, sans empilement. Hauteur reportée à `useBottomBarHeight` pour
 *   offsetter le contenu (FAB, sticky CTAs).
 * - **Deux états visuels** :
 *   - `selectedCount === 0` → mode compact (64px) : hint contextuel +
 *     bouton « Tout sélectionner » (thumb-zone). Évite d'occuper plus d'espace
 *     pour des boutons grisés. La sortie du mode passe par le header / back-button
 *     / swipe-right / Escape (« Annuler » n'est pas dupliqué ici).
 *   - `selectedCount > 0` → mode action (76px) : rend `children` (boutons bulk
 *     fournis par le module), centrés verticalement sur une seule rangée.
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
	emptyHint = "Tape sur les éléments à sélectionner",
}: MobileSelectionBottomBarProps) {
	const { selectionMode, exitSelectionMode, pageItemIds, selectedCount, selectAllVisible } =
		useBulkSelectionContext();
	const mounted = useMounted();

	const isActive = selectionMode && pageItemIds.length > 0;
	const noSelection = selectedCount === 0;

	useBackButtonClose({
		isOpen: isActive,
		onClose: exitSelectionMode,
		id: "mobile-selection-mode",
	});

	// Geste natif iOS/Android : swipe depuis le bord droit → sortir du mode
	// sélection (complète back-button hijack pour les utilisateurs qui ne
	// reviennent pas en arrière mais "tirent" pour fermer). Hook respecte
	// prefers-reduced-motion (WCAG 2.3.3) + désactivé ≥1024px (desktop).
	// Pas de visual indicator — geste discret en bas d'écran, indicator
	// dérouterait l'attention pendant la sélection en cours.
	useEdgeSwipe(exitSelectionMode, !isActive, { side: "right" });

	// Portalisée dans `document.body` — parité avec `AdminMobileBottomBar` (qu'elle
	// remplace) qui est elle aussi portalisée. Garantit l'ancrage au viewport
	// (`position: fixed`) quel que soit un éventuel containing-block ancêtre
	// (transform/filter/contain) dans le layout admin. `useMounted` évite tout
	// mismatch d'hydratation (document indisponible côté serveur).
	if (!isActive || !mounted) return null;

	return createPortal(
		<BottomBar
			as="div"
			breakpointClass="md:hidden"
			zIndex="z-(--z-bar)"
			height={noSelection ? COMPACT_BAR_HEIGHT : ACTION_BAR_HEIGHT}
			aria-label={ariaLabel}
			className={cn("px-3 py-2", className)}
		>
			<div
				className="motion-safe:transition-[min-height] motion-safe:duration-200 motion-safe:ease-out"
				style={{ minHeight: noSelection ? COMPACT_BAR_HEIGHT - 16 : ACTION_BAR_HEIGHT - 16 }}
			>
				{noSelection ? (
					<div className="flex h-full items-center justify-between gap-3">
						<p className="text-muted-foreground truncate text-sm" aria-live="polite">
							{emptyHint}
						</p>
						{/* Zone du pouce : à 0 sélectionné la 1re action utile est de
						    commencer à sélectionner, pas d'annuler — « Annuler » reste
						    accessible via le header sticky + back-button + swipe-right +
						    Escape. `selectAllVisible` est idempotent (toggle page). */}
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={selectAllVisible}
							className="min-h-11 shrink-0 px-3"
						>
							Tout sélectionner
						</Button>
					</div>
				) : (
					<div className="flex h-full items-center">{children}</div>
				)}
			</div>
		</BottomBar>,
		document.body,
	);
}
