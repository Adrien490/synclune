"use client";

import { useSelectionContext } from "@/shared/contexts/selection-context";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { ReactNode } from "react";

interface SelectionToolbarProps {
	children: ReactNode;
}

/**
 * Floating selection toolbar with framer-motion animations
 * Appears at the bottom center when items are selected
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
					initial={{ opacity: 0, y: 20, scale: 0.95 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, y: 20, scale: 0.95 }}
					transition={{
						duration: shouldReduceMotion ? 0 : 0.2,
						ease: "easeOut",
					}}
					className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-[calc(100%-2rem)]"
				>
					<Card className="shadow-2xl border border-primary/20 bg-background/95 backdrop-blur-md">
						<CardContent className="p-4">
							<div className="flex items-center gap-4">
								{/* Selection counter */}
								<div className="flex items-center gap-3">
									<div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-sm">
										<motion.span
											key={selectedCount}
											initial={
												shouldReduceMotion ? false : { scale: 0.8, opacity: 0 }
											}
											animate={{ scale: 1, opacity: 1 }}
											transition={{ duration: 0.15 }}
											className="text-sm font-bold"
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
											? "éléments sélectionnés"
											: "élément sélectionné"}
									</p>
								</div>

								{/* Separator */}
								<div
									className="h-6 w-px bg-border/50 hidden sm:block"
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
										className="h-9 px-3 text-muted-foreground hover:text-foreground hover:bg-destructive/10 transition-colors cursor-pointer"
										aria-label="Effacer la sélection"
									>
										<X className="h-4 w-4" />
										<span className="ml-1 hidden sm:inline">Désélectionner</span>
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
