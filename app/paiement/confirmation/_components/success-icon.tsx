"use client";

import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { m, useReducedMotion } from "motion/react";
import { CheckCircleIcon } from "@phosphor-icons/react/ssr";

/**
 * Animated success icon for the order confirmation page.
 * Spring-based scale + rotate entrance for a celebratory feel.
 * Respects prefers-reduced-motion.
 *
 * Pas d'haptique : l'icône est un **affichage**. Le `useEffect` de montage qui
 * vibrait ici se déclenchait à chaque rendu de la page — chargement, retour
 * arrière, remount — et pas seulement au paiement réussi. Le retour tactile du
 * paiement appartient au bouton de paiement, pas à sa page de confirmation.
 */
export function SuccessIcon() {
	const shouldReduceMotion = useReducedMotion();

	if (shouldReduceMotion) {
		return (
			<div className="bg-primary/10 mx-auto flex size-16 items-center justify-center rounded-full">
				<CheckCircleIcon className="text-primary size-10" />
			</div>
		);
	}

	return (
		<m.div
			initial={{ opacity: 0, scale: 0.5 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{
				...MOTION_CONFIG.spring.success,
				delay: 0.2,
			}}
			className="bg-primary/10 mx-auto flex size-16 items-center justify-center rounded-full"
		>
			<m.div
				initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
				animate={{ scale: 1, opacity: 1, rotate: 0 }}
				transition={{
					...MOTION_CONFIG.spring.success,
					damping: 15,
					stiffness: 300,
					delay: 0.5,
				}}
			>
				<CheckCircleIcon className="text-primary size-10" />
			</m.div>
		</m.div>
	);
}
