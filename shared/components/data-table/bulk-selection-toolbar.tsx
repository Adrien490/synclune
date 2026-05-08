"use client";

import { Button } from "@/shared/components/ui/button";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useBulkSelectionContext } from "./bulk-selection-context";

interface BulkSelectionToolbarProps {
	itemsLabel: { singular: string; plural: string };
	children?: ReactNode;
	className?: string;
}

/**
 * Toolbar contextuelle bulk selection. Affichée uniquement si selectedCount > 0.
 * Aria-live pour annoncer le count aux screen readers.
 *
 * Les actions sont fournies via `children` (boutons, ResponsiveActionMenu, etc.)
 * — chaque consumer décide de ses actions métier.
 */
export function BulkSelectionToolbar({
	itemsLabel,
	children,
	className,
}: BulkSelectionToolbarProps) {
	const { selectedCount, clear } = useBulkSelectionContext();

	if (selectedCount === 0) return null;

	const label = selectedCount > 1 ? itemsLabel.plural : itemsLabel.singular;

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
					{selectedCount} {label} sélectionné{selectedCount > 1 ? "s" : ""}
				</span>
			</div>
			{children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
		</div>
	);
}
