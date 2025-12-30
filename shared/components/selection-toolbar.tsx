"use client";

import { useSelectionContext } from "@/shared/contexts/selection-context";
import { Button } from "@/shared/components/ui/button";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
				<motion.div
					role="toolbar"
					aria-label="Actions sur la sélection"
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: "auto" }}
					exit={{ opacity: 0, height: 0 }}
					transition={{
						duration: shouldReduceMotion ? 0 : MOTION_CONFIG.duration.collapse,
						ease: MOTION_CONFIG.easing.collapse,
					}}
					className="overflow-hidden mb-4"
				>
					<div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5">
						{/* Selection counter */}
						<div className="flex items-center gap-2">
							<div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
								<motion.span
									key={selectedCount}
									initial={
										shouldReduceMotion ? false : { scale: 0.8, opacity: 0 }
									}
									animate={{ scale: 1, opacity: 1 }}
									transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
								>
									{selectedCount}
								</motion.span>
							</div>
							<p
								className="text-sm font-medium"
								aria-live="polite"
								aria-atomic="true"
							>
								{selectedCount > 1
									? "sélectionnés"
									: "sélectionné"}
							</p>
						</div>

						{/* Separator */}
						<div
							className="h-4 w-px bg-border/50 hidden sm:block"
							aria-hidden="true"
						/>

						{/* Spacer */}
						<div className="flex-1" />

						{/* Actions */}
						<div className="flex items-center gap-2">
							{children}
							<Button
								variant="ghost"
								size="sm"
								onClick={clearSelection}
								className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-destructive/10 transition-colors cursor-pointer"
								aria-label="Effacer la sélection"
							>
								<X className="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
