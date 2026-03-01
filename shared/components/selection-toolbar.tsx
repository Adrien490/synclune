"use client";

import { useSelectionContext } from "@/shared/contexts/selection-context";
import { Button } from "@/shared/components/ui/button";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { X } from "lucide-react";
import { ReactNode } from "react";

interface SelectionToolbarProps {
	children: ReactNode;
}

/**
 * Inline selection toolbar with framer-motion animations
 * Appears above the datatable when items are selected
 */
export function SelectionToolbar({ children }: SelectionToolbarProps) {
	const { getSelectedCount, clearSelection } = useSelectionContext();
	const selectedCount = getSelectedCount();
	const shouldReduceMotion = useReducedMotion();

	return (
		<AnimatePresence mode="wait">
			{selectedCount > 0 && (
				<m.div
					role="toolbar"
					aria-label="Actions sur la sélection"
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: "auto" }}
					exit={{ opacity: 0, height: 0 }}
					transition={{
						duration: shouldReduceMotion ? 0 : MOTION_CONFIG.duration.collapse,
						ease: MOTION_CONFIG.easing.collapse,
					}}
					className="mb-4 overflow-hidden"
				>
					<div className="border-primary/20 bg-primary/5 flex items-center gap-3 rounded-lg border px-3 py-2">
						{/* Selection counter */}
						<div className="flex items-center gap-2">
							<div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold">
								<m.span
									key={selectedCount}
									initial={shouldReduceMotion ? false : { scale: 0.8, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
								>
									{selectedCount}
								</m.span>
							</div>
							<p className="text-sm font-medium" aria-live="polite" aria-atomic="true">
								{selectedCount > 1 ? "sélectionnés" : "sélectionné"}
							</p>
						</div>

						{/* Separator */}
						<div className="bg-border/50 hidden h-4 w-px sm:block" aria-hidden="true" />

						{/* Spacer */}
						<div className="flex-1" />

						{/* Actions */}
						<div className="flex items-center gap-2">
							{children}
							<Button
								variant="ghost"
								size="sm"
								onClick={clearSelection}
								className="text-muted-foreground hover:text-foreground hover:bg-destructive/10 h-7 cursor-pointer px-2 transition-colors"
								aria-label="Effacer la sélection"
							>
								<X className="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>
				</m.div>
			)}
		</AnimatePresence>
	);
}
