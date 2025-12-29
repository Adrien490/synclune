"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MOTION_CONFIG } from "./motion.config";
import type { FadeProps } from "./types";

export type { FadeProps };

/**
 * Animation Fade simple avec mouvement vertical
 *
 * Support prefers-reduced-motion et animations au scroll (whileInView).
 * Optimisé GPU avec willChange.
 *
 * @param children - Contenu à animer
 * @param className - Classes Tailwind additionnelles
 * @param delay - Délai avant animation en secondes (défaut: 0)
 * @param duration - Durée de l'animation en secondes (défaut: normal)
 * @param y - Décalage vertical en pixels (défaut: config)
 * @param inView - Active animation au scroll avec whileInView (défaut: false)
 * @param once - N'anime qu'une fois au scroll (défaut: false)
 *
 * @example
 * ```tsx
 * // Fade simple au chargement
 * <Fade y={20} delay={0.3}>
 *   <p>Texte qui apparaît</p>
 * </Fade>
 *
 * // Fade au scroll (une fois)
 * <Fade inView once y={30}>
 *   <div>Contenu révélé au scroll</div>
 * </Fade>
 * ```
 */
export function Fade({
	children,
	className,
	delay = 0,
	duration = MOTION_CONFIG.duration.normal,
	y = MOTION_CONFIG.transform.fadeY,
	inView = false,
	once = false,
}: FadeProps) {
	const shouldReduceMotion = useReducedMotion();

	const animationProps = inView
		? {
				initial: shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: y },
				whileInView: { opacity: 1, y: 0 },
				viewport: { once, margin: "-100px" },
				exit: shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -y },
				transition: {
					duration: shouldReduceMotion ? 0 : duration,
					delay: shouldReduceMotion ? 0 : delay,
					ease: [0.4, 0, 0.2, 1] as const,
				},
		  }
		: {
				initial: shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: y },
				animate: { opacity: 1, y: 0 },
				exit: shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -y },
				transition: {
					duration: shouldReduceMotion ? 0 : duration,
					delay: shouldReduceMotion ? 0 : delay,
					ease: [0.4, 0, 0.2, 1] as const,
				},
		  };

	return (
		<motion.div className={className} {...animationProps}>
			{children}
		</motion.div>
	);
}
