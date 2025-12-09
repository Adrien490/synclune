"use client";

import { useEffect } from "react";
import {
	AnimatePresence,
	motion,
	useReducedMotion,
	type Variants,
} from "framer-motion";
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
	/** Seuil en px pour declencher le swipe (defaut: 80) */
	swipeThreshold?: number;
}

/**
 * Panneau modal mobile style iOS avec animations Framer Motion.
 * S'affiche en bas de l'ecran avec backdrop blur.
 * Supporte les animations stagger pour les enfants.
 * Fermeture par swipe vers le bas activee par defaut.
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
	swipeThreshold = 80,
}: MobilePanelProps) {
	const shouldReduceMotion = useReducedMotion();

	// Swipe vers le bas pour fermer
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
			{/* Backdrop */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
						transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
						onClick={onClose}
						className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm"
						style={{ zIndex: backdropZIndex }}
						aria-hidden="true"
					/>
				)}
			</AnimatePresence>

			{/* Panneau */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
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
						className={cn(
							"md:hidden fixed bottom-4 left-4 right-4 bg-background rounded-2xl border shadow-2xl max-h-[80vh] overflow-y-auto overscroll-contain",
							className
						)}
						style={{ zIndex: panelZIndex }}
						role="dialog"
						aria-modal="true"
						{...swipeHandlers}
						aria-label={ariaLabel}
					>
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
