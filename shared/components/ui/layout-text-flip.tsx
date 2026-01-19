"use client";

import { cn } from "@/shared/utils/cn";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

export interface LayoutTextFlipProps {
	/** Texte statique affiché avant les mots rotatifs */
	text?: string;
	/** Liste de mots qui alternent avec animation */
	words?: string[];
	/** Durée d'affichage de chaque mot (en ms) */
	duration?: number;
	/** Classes CSS pour le texte statique */
	textClassName?: string;
	/** Classes CSS pour le conteneur des mots rotatifs */
	wordsClassName?: string;
}

/**
 * Composant de texte avec mots rotatifs animés
 * Style adapté au thème Synclune (couleurs OKLCH)
 * Respecte prefers-reduced-motion
 */
export function LayoutTextFlip({
	text = "Des bijoux",
	words = ["colorés", "uniques", "audacieux"],
	duration = 3000,
	textClassName,
	wordsClassName,
}: LayoutTextFlipProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const shouldReduceMotion = useReducedMotion();

	useEffect(() => {
		if (shouldReduceMotion) return;

		const interval = setInterval(() => {
			setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
		}, duration);

		return () => clearInterval(interval);
	}, [words.length, duration, shouldReduceMotion]);

	// Mode reduced motion : affichage statique
	if (shouldReduceMotion) {
		return (
			<span className="inline-flex items-baseline gap-[0.3em] flex-wrap justify-center">
				<span className={textClassName}>{text}</span>
				<span
					className={cn(
						"inline-block rounded-lg bg-primary/10 px-3 py-1 text-primary",
						wordsClassName
					)}
				>
					{words[0]}
				</span>
			</span>
		);
	}

	return (
		<span className="inline-flex items-baseline gap-[0.3em] flex-wrap justify-center">
			<motion.span layoutId="hero-text" className={textClassName}>
				{text}
			</motion.span>

			<motion.span
				layout
				className={cn(
					"relative overflow-hidden rounded-lg",
					"bg-primary/10 px-3 py-1",
					"ring-1 ring-primary/20",
					"shadow-sm shadow-primary/10",
					wordsClassName
				)}
			>
				<AnimatePresence mode="popLayout">
					<motion.span
						key={currentIndex}
						initial={{ y: -40, filter: "blur(10px)", opacity: 0 }}
						animate={{ y: 0, filter: "blur(0px)", opacity: 1 }}
						exit={{ y: 50, filter: "blur(10px)", opacity: 0 }}
						transition={{ duration: 0.5, ease: "easeOut" }}
						className="inline-block whitespace-nowrap text-primary"
					>
						{words[currentIndex]}
					</motion.span>
				</AnimatePresence>
			</motion.span>
		</span>
	);
}
