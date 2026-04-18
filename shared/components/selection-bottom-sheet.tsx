"use client";

import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { X } from "lucide-react";

import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";

interface SelectionBottomSheetProps {
	/**
	 * Slot pour les actions (dropdown ou icon-buttons) — passé par chaque module.
	 * Le count, select-all, et clear sont fournis par le sheet.
	 */
	children: ReactNode;
	/**
	 * IDs de tous les items visibles sur la page courante.
	 * Si fourni, un bouton "Tout (dé)sélectionner" apparaît.
	 */
	pageItemIds?: string[];
	/** Variante de classe (z-index custom, etc.) */
	className?: string;
}

/**
 * Bottom sheet mobile-only affichée dès qu'au moins un item est sélectionné.
 *
 * Pattern 2026 (Gmail / Linear / Notion) : persistent sticky en bas d'écran,
 * safe-area-bottom, remplace la bottom bar contextuelle de la page quand active.
 *
 * - Portal dans document.body pour échapper au containing block du sidebar
 * - Animation spring slide-up + fade via motion/react
 * - Respecte prefers-reduced-motion
 * - Haptic `light` sur clear, `selection` sur select-all-toggle
 * - z-index identique à BottomBar (se place au même niveau)
 * - `md:hidden` : desktop garde son inline SelectionToolbar
 */
export function SelectionBottomSheet({
	children,
	pageItemIds,
	className,
}: SelectionBottomSheetProps) {
	const { getSelectedCount, clearSelection, areAllSelected, handleSelectionChange } =
		useSelectionContext();
	const haptic = useHaptic();
	const prefersReducedMotion = useReducedMotion();
	const count = getSelectedCount();
	const visible = count > 0;
	const allPageSelected = pageItemIds ? areAllSelected(pageItemIds) : false;

	if (typeof document === "undefined") return null;

	const handleClear = () => {
		haptic("light");
		clearSelection();
	};

	const handleToggleAll = () => {
		if (!pageItemIds) return;
		haptic("selection");
		handleSelectionChange(pageItemIds, !allPageSelected);
	};

	return createPortal(
		<AnimatePresence>
			{visible ? (
				<m.div
					key="selection-bottom-sheet"
					role="toolbar"
					aria-label={`${count} élément${count > 1 ? "s" : ""} sélectionné${count > 1 ? "s" : ""}`}
					data-hide-on-keyboard=""
					initial={prefersReducedMotion ? { opacity: 0 } : { y: 100, opacity: 0 }}
					animate={prefersReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
					exit={prefersReducedMotion ? { opacity: 0 } : { y: 100, opacity: 0 }}
					transition={
						prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 35 }
					}
					className={cn(
						"fixed right-0 bottom-0 left-0 z-(--z-bar) md:hidden",
						"pb-[env(safe-area-inset-bottom)]",
						"bg-background/80 backdrop-blur-xl",
						"border-border/60 border-t",
						"shadow-[0_-0.5px_0_rgba(0,0,0,0.06)]",
						className,
					)}
				>
					<div className="flex items-center gap-2 px-3 py-2">
						{/* Clear button (44x44) */}
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={handleClear}
							aria-label="Effacer la sélection"
							className="hover:bg-destructive/10 hover:text-destructive size-11 shrink-0"
						>
							<X className="size-5" aria-hidden="true" />
						</Button>

						{/* Count + "Tout sélectionner" */}
						<div className="flex min-w-0 flex-1 flex-col">
							<p className="text-sm font-semibold" aria-live="polite" aria-atomic="true">
								{count} sélectionné{count > 1 ? "s" : ""}
							</p>
							{pageItemIds && pageItemIds.length > 0 ? (
								<button
									type="button"
									onClick={handleToggleAll}
									className="text-primary w-fit text-xs font-medium underline-offset-2 hover:underline"
								>
									{allPageSelected
										? "Déselectionner la page"
										: `Tout sélectionner (${pageItemIds.length})`}
								</button>
							) : null}
						</div>

						{/* Actions slot (dropdown ou icon-buttons) */}
						<div className="flex shrink-0 items-center gap-1">{children}</div>
					</div>
				</m.div>
			) : null}
		</AnimatePresence>,
		document.body,
	);
}
