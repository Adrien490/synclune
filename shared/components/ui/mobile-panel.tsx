"use client";

import { useEffect, useRef, useId } from "react";
import {
	AnimatePresence,
	motion,
	useReducedMotion,
	type Variants,
} from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { useSwipeGesture } from "@/shared/hooks/use-swipe-gesture";

// Animation variants pour le container avec stagger
const containerVariants: Variants = {
	hidden: {},
	visible: {
		transition: {
			staggerChildren: 0.04,
			delayChildren: 0.1,
		},
	},
};

// Animation variants pour les items enfants
const itemVariants: Variants = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as const },
	},
};

interface MobilePanelProps {
	/** Controle l'ouverture du panneau */
	isOpen: boolean;
	/** Callback pour fermer le panneau */
	onClose: () => void;
	/** Contenu du panneau */
	children: React.ReactNode;
	/** Label pour l'accessibilite */
	ariaLabel?: string;
	/** Classes additionnelles pour le panneau */
	className?: string;
	/** Active les animations stagger sur les enfants directs */
	enableStagger?: boolean;
	/** Z-index du backdrop (defaut: 70) */
	backdropZIndex?: number;
	/** Z-index du panneau (defaut: 71) */
	panelZIndex?: number;
	/** Active la fermeture par swipe vers le bas (defaut: true) */
	enableSwipeToClose?: boolean;
	/** Seuil en px pour declencher le swipe (defaut: 100) */
	swipeThreshold?: number;
	/** Affiche le bouton de fermeture X (defaut: false) */
	showCloseButton?: boolean;
	/** Affiche le drag handle visuel en haut (defaut: true) */
	showDragHandle?: boolean;
}

/**
 * Panneau modal mobile style iOS avec animations Framer Motion.
 * S'affiche en bas de l'ecran avec backdrop blur.
 *
 * Fonctionnalites:
 * - Swipe-to-close
 * - Drag handle visuel style iOS
 * - Bouton de fermeture optionnel (WCAG 2.5.1)
 * - Annonces screen reader
 * - Safe-area-inset pour iPhone
 * - Support reduced motion
 * - Animations stagger optionnelles
 */
export function MobilePanel({
	isOpen,
	onClose,
	children,
	ariaLabel = "Menu",
	className,
	enableStagger = false,
	backdropZIndex = 70,
	panelZIndex = 71,
	enableSwipeToClose = true,
	swipeThreshold = 100,
	showCloseButton = false,
	showDragHandle = true,
}: MobilePanelProps) {
	const shouldReduceMotion = useReducedMotion();
	const panelRef = useRef<HTMLDivElement>(null);
	const descriptionId = useId();

	// Swipe-to-close simple
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
			if (e.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [isOpen, onClose]);

	// Bloquer le scroll du body quand le panneau est ouvert
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

	return (
		<>
			{/* Annonce screen reader */}
			<div aria-live="polite" aria-atomic="true" className="sr-only">
				{isOpen
					? `${ariaLabel} ouvert. Appuyez sur Echap pour fermer.`
					: ""}
			</div>

			{/* Backdrop */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
						transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
						style={{ zIndex: backdropZIndex }}
						onClick={onClose}
						className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm"
						aria-hidden="true"
					/>
				)}
			</AnimatePresence>

			{/* Panneau */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						ref={panelRef}
						initial={
							shouldReduceMotion
								? { opacity: 1 }
								: { y: "100%", opacity: 0.5 }
						}
						animate={{ y: 0, opacity: 1 }}
						exit={
							shouldReduceMotion
								? { opacity: 1 }
								: { y: "100%", opacity: 0 }
						}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: {
										type: "spring",
										damping: 28,
										stiffness: 350,
									}
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
						{/* Description screen reader */}
						<span id={descriptionId} className="sr-only">
							Panneau de navigation. Swipez vers le bas ou appuyez sur Echap
							pour fermer.
						</span>

						{/* Drag Handle visuel */}
						{showDragHandle && (
							<div
								className="flex justify-center pt-3 pb-2 touch-none cursor-grab active:cursor-grabbing"
								aria-hidden="true"
							>
								<div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
							</div>
						)}

						{/* Bouton de fermeture (WCAG 2.5.1 - alternative au swipe) */}
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

						{/* Contenu avec stagger optionnel */}
						{enableStagger ? (
							<motion.div
								variants={shouldReduceMotion ? undefined : containerVariants}
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

interface MobilePanelItemProps {
	children: React.ReactNode;
	className?: string;
}

/**
 * Item anime pour le MobilePanel.
 * Utilise les animations stagger du container parent.
 */
export function MobilePanelItem({ children, className }: MobilePanelItemProps) {
	const shouldReduceMotion = useReducedMotion();

	return (
		<motion.div
			variants={shouldReduceMotion ? undefined : itemVariants}
			className={className}
		>
			{children}
		</motion.div>
	);
}

// Export des variants pour utilisation externe
export { containerVariants as mobilePanelContainerVariants };
export { itemVariants as mobilePanelItemVariants };
