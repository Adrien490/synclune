"use client";

import {
	motion,
	useMotionValueEvent,
	useReducedMotion,
	useScroll,
	useTransform,
} from "motion/react";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { cn } from "@/shared/utils/cn";
import { MOTION_CONFIG } from "./motion.config";

export interface ScrollIndicatorProps {
	/** ID de l'élément cible vers lequel scroller */
	targetId: string;
	/** Label accessible pour le bouton */
	ariaLabel?: string;
	/** Classe CSS additionnelle */
	className?: string;
}

/**
 * Indicateur de scroll animé pour les hero sections
 *
 * Best practices UX 2025 :
 * - Zone tactile 48x48px minimum (Material Design)
 * - Positionné à 18% du bas pour éviter les zones mask
 * - Contraste suffisant (WCAG AA)
 * - Animation bounce subtile pour attirer l'attention
 * - Fade out progressif au scroll (évite la distraction)
 * - Support prefers-reduced-motion
 * - Masqué sur mobile (scroll natif suffisant)
 *
 * @example
 * ```tsx
 * <section className="relative min-h-screen">
 *   <ScrollIndicator targetId="next-section" className="hidden sm:block" />
 * </section>
 * ```
 */
export function ScrollIndicator({
	targetId,
	ariaLabel = "Voir la suite",
	className,
}: ScrollIndicatorProps) {
	const shouldReduceMotion = useReducedMotion();
	const { scrollY } = useScroll();
	const [isVisible, setIsVisible] = useState(true);

	// Optimisation : useTransform évite les re-renders React (calcul côté Framer Motion)
	const opacity = useTransform(scrollY, [0, 100], [1, 0]);

	// Retirer du focus quand invisible (accessibilité clavier)
	useMotionValueEvent(scrollY, "change", (latest) => {
		setIsVisible(latest < 100);
	});

	const handleClick = () => {
		const target = document.getElementById(targetId);
		if (target) {
			target.scrollIntoView({ behavior: "smooth" });
		}
	};

	return (
		<motion.button
			type="button"
			onClick={handleClick}
			aria-label={ariaLabel}
			tabIndex={isVisible ? 0 : -1}
			className={cn(
				// Position au-dessus des zones mask avec fallback minimum
				"absolute left-1/2 -translate-x-1/2 z-20",
				"bottom-[max(12%,3rem)]",
				// Zone tactile 48x48px minimum (p-2.5 + icône 28px = 48px)
				"p-2.5 rounded-full",
				// Couleurs avec contraste suffisant
				"text-muted-foreground hover:text-foreground",
				"transition-colors duration-200",
				// Focus accessible
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
				className
			)}
			style={{ opacity }}
			animate={shouldReduceMotion ? undefined : { y: [0, 8, 0] }}
			transition={
				shouldReduceMotion
					? undefined
					: {
							duration: MOTION_CONFIG.background.scrollIndicator.duration,
							repeat: Infinity,
							ease: MOTION_CONFIG.easing.easeInOut,
						}
			}
		>
			<ChevronDown size={28} strokeWidth={1.5} />
		</motion.button>
	);
}
