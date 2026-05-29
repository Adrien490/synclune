"use client";

import { Button } from "@/shared/components/ui/button";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { X } from "lucide-react";
import { useDeferredValue, type ReactNode } from "react";
import { useBulkSelectionContext } from "./bulk-selection-context";
import { formatSelectionCount } from "./format-selection-count";

interface BulkSelectionToolbarProps {
	itemsLabel: { singular: string; plural: string };
	children?: ReactNode;
	className?: string;
	/**
	 * Layout variant.
	 * - `"inline"` (default, desktop) : toolbar inline au-dessus de la table
	 *   avec border, count `aria-live`, bouton X clear, role region. Hide si
	 *   `selectedCount === 0`.
	 * - `"bottom-bar"` (mobile selection mode) : rangée de boutons full-width
	 *   sans count/clear (déjà dans `MobileSelectionHeader`). Toujours rendue
	 *   tant que les enfants existent — c'est aux boutons de gérer leur état
	 *   `disabled` selon `selectedCount`.
	 */
	presentation?: "inline" | "bottom-bar";
	/** Signale au screen reader qu'une bulk-action est en cours (forwardé sur le wrapper). */
	"aria-busy"?: boolean;
}

/**
 * Toolbar contextuelle bulk selection. Affichée uniquement si selectedCount > 0
 * en mode `inline`. Aria-live pour annoncer le count aux screen readers.
 *
 * Les actions sont fournies via `children` (boutons, ResponsiveActionMenu, etc.)
 * — chaque consumer décide de ses actions métier.
 */
export function BulkSelectionToolbar({
	itemsLabel,
	children,
	className,
	presentation = "inline",
	"aria-busy": ariaBusy,
}: BulkSelectionToolbarProps) {
	const { selectedCount, clear } = useBulkSelectionContext();
	const countText = formatSelectionCount(selectedCount, itemsLabel);
	// Débouncer les annonces SR sur tap rapide (pattern identique à MobileSelectionHeader).
	// Hook avant tout early-return (Rules of Hooks).
	const deferredCountText = useDeferredValue(countText);

	if (presentation === "bottom-bar") {
		if (!children) return null;
		return (
			<div
				aria-busy={ariaBusy ?? undefined}
				className={cn("flex w-full items-center justify-stretch gap-2 [&>*]:flex-1", className)}
			>
				{children}
			</div>
		);
	}

	if (selectedCount === 0) return null;

	return (
		<div
			role="region"
			aria-label="Actions groupées"
			className={cn(
				"bg-primary/5 border-primary/20 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2",
				"motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-150",
				className,
			)}
		>
			<div className="flex items-center gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => {
						triggerHaptic("light");
						clear();
					}}
					aria-label="Effacer la sélection"
					className="size-8 shrink-0 p-0"
				>
					<X className="size-4" aria-hidden="true" />
				</Button>
				<span aria-live="polite" className="text-sm font-medium">
					{deferredCountText}
				</span>
			</div>
			{children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
		</div>
	);
}
