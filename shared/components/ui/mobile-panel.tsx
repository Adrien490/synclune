"use client";

import { useEffect, useId } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { useSwipeGesture } from "@/shared/hooks/use-swipe-gesture";

// Variants pour l'animation staggered des items
export const mobilePanelItemVariants: Variants = {
	hidden: { opacity: 0, y: 10 },
	visible: { opacity: 1, y: 0 },
};

const containerVariants: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.03,
			delayChildren: 0.1,
		},
	},
};

interface MobilePanelProps {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
	ariaLabel?: string;
	className?: string;
	backdropZIndex?: number;
	panelZIndex?: number;
	enableSwipeToClose?: boolean;
	swipeThreshold?: number;
	showCloseButton?: boolean;
	showDragHandle?: boolean;
	enableStagger?: boolean;
}

interface MobilePanelItemProps {
	children: React.ReactNode;
	className?: string;
}

/**
 * Wrapper pour les items du panel avec animation staggered
 */
export function MobilePanelItem({ children, className }: MobilePanelItemProps) {
	const shouldReduceMotion = useReducedMotion();

	return (
		<motion.div
			variants={shouldReduceMotion ? undefined : mobilePanelItemVariants}
			className={className}
		>
			{children}
		</motion.div>
	);
}

export function MobilePanel({
	isOpen,
	onClose,
	children,
	ariaLabel = "Menu",
	className,
	backdropZIndex = 70,
	panelZIndex = 71,
	enableSwipeToClose = true,
	swipeThreshold = 100,
	showCloseButton = false,
	showDragHandle = true,
	enableStagger = false,
}: MobilePanelProps) {
	const shouldReduceMotion = useReducedMotion();
	const descriptionId = useId();

	const swipeHandlers = useSwipeGesture({
		onSwipe: onClose,
		direction: "down",
		threshold: swipeThreshold,
		disabled: !enableSwipeToClose || (shouldReduceMotion ?? false),
	});

	// Fermeture avec Escape
	useEffect(() => {
		if (!isOpen) return;

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};

		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [isOpen, onClose]);

	// Bloquer le scroll du body
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	const noMotion = shouldReduceMotion ?? false;

	return (
		<>
			<div aria-live="polite" aria-atomic="true" className="sr-only">
				{isOpen ? `${ariaLabel} ouvert. Appuyez sur Echap pour fermer.` : ""}
			</div>

			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: noMotion ? 1 : 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: noMotion ? 1 : 0 }}
						transition={{ duration: noMotion ? 0 : 0.2 }}
						style={{ zIndex: backdropZIndex }}
						onClick={onClose}
						className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm"
						aria-hidden="true"
					/>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={noMotion ? { opacity: 1 } : { y: "100%", opacity: 0.5 }}
						animate={{ y: 0, opacity: 1 }}
						exit={noMotion ? { opacity: 1 } : { y: "100%", opacity: 0 }}
						transition={
							noMotion
								? { duration: 0 }
								: { type: "spring", damping: 28, stiffness: 350 }
						}
						style={{ zIndex: panelZIndex }}
						className={cn(
							"md:hidden fixed bottom-4 left-4 right-4 bg-background rounded-2xl border shadow-2xl max-h-[80vh] overflow-y-auto overscroll-contain",
							"pb-[max(1rem,env(safe-area-inset-bottom))]",
							className
						)}
						role="dialog"
						aria-modal="true"
						aria-label={ariaLabel}
						aria-describedby={descriptionId}
						{...swipeHandlers}
					>
						<span id={descriptionId} className="sr-only">
							Panneau de navigation. Swipez vers le bas ou appuyez sur Echap
							pour fermer.
						</span>

						{showDragHandle && (
							<div
								className="flex justify-center pt-3 pb-2 touch-none"
								aria-hidden="true"
							>
								<div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
							</div>
						)}

						{showCloseButton && (
							<button
								type="button"
								onClick={onClose}
								className={cn(
									"absolute top-3 right-3 p-2 rounded-full",
									"text-muted-foreground hover:text-foreground hover:bg-accent",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									"transition-colors"
								)}
								aria-label="Fermer"
							>
								<X className="size-5" aria-hidden="true" />
							</button>
						)}

						{enableStagger && !noMotion ? (
							<motion.div
								variants={containerVariants}
								initial="hidden"
								animate="visible"
							>
								{children}
							</motion.div>
						) : (
							children
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
