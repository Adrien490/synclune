"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode, useEffect, useState } from "react";
import { MOTION_CONFIG } from "./motion.config";

export interface RevealProps {
	children: ReactNode;
	className?: string;
	delay?: number;
	duration?: number;
	y?: number;
	once?: boolean;
	amount?: number | "some" | "all";
	role?: string;
	/** Data attributes (e.g., data-testid) */
	[key: `data-${string}`]: string | undefined;
}

/**
 * Animation reveal avec whileInView (scroll-triggered)
 * L'animation se déclenche quand l'élément entre dans le viewport
 *
 * Fix hydratation: On assume toujours une animation normale côté serveur
 * et on ajuste côté client si reduced motion est activé
 */
export function Reveal({
	children,
	className,
	delay = 0,
	duration = MOTION_CONFIG.duration.normal,
	y = MOTION_CONFIG.transform.fadeY,
	once = true,
	amount = 0.2,
	role,
	...rest
}: RevealProps) {
	const prefersReducedMotion = useReducedMotion();
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	// Côté serveur et première hydratation: toujours avec animation
	// Côté client après mount: respecte les préférences utilisateur
	const shouldReduceMotion = isMounted && prefersReducedMotion;

	return (
		<motion.div
			className={className}
			role={role}
			style={{ willChange: "opacity, transform" }}
			initial={{ opacity: 0, y }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once, amount }}
			transition={{
				duration: shouldReduceMotion ? 0 : duration,
				delay: shouldReduceMotion ? 0 : delay,
				ease: "easeOut",
			}}
			{...rest}
		>
			{children}
		</motion.div>
	);
}
