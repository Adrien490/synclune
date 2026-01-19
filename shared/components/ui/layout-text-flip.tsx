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
 *
 * Style Synclune 2026:
 * - Texte foreground pour contraste WCAG AA (4.5:1+)
 * - Pill avec gradient subtil rose → gold
 * - Glow effect au hover
 * - Respecte prefers-reduced-motion
 *
 * Anti-CLS (Cumulative Layout Shift):
 * - Largeur fixée par placeholder invisible (mot le plus long)
 * - Structure simplifiée: pill contient directement le texte
 * - Pas de layout/layoutId props Framer Motion
 */
export function LayoutTextFlip({
	text = "Des bijoux",
	words = ["colorés", "uniques", "joyeux"],
	duration = 3000,
	textClassName,
	wordsClassName,
}: LayoutTextFlipProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const shouldReduceMotion = useReducedMotion();

	// Trouver le mot le plus long pour réserver l'espace
	const longestWord = words.reduce((a, b) => (a.length > b.length ? a : b));

	useEffect(() => {
		if (shouldReduceMotion) return;

		const interval = setInterval(() => {
			setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
		}, duration);

		return () => clearInterval(interval);
	}, [words.length, duration, shouldReduceMotion]);

	// Styles pour la pill - appliqués directement sur le conteneur du texte animé
	const pillStyles = cn(
		// Structure de base
		"inline-flex items-center justify-center",
		"rounded-xl px-4 py-2",
		// Gradient subtil rose → gold (tendance 2026)
		"bg-gradient-to-r from-primary/15 via-primary/10 to-secondary/20",
		// Bordure
		"ring-1 ring-primary/25",
		// Shadow colorée
		"shadow-md shadow-primary/15",
		// Transition hover
		"transition-shadow duration-300",
		"hover:shadow-lg hover:shadow-primary/25",
		wordsClassName
	);

	// Styles pour le texte
	const textStyles = "text-foreground font-medium whitespace-nowrap";

	// Mode reduced motion : affichage statique
	if (shouldReduceMotion) {
		return (
			<span className="inline-flex items-center gap-[0.35em] flex-wrap justify-center">
				<span className={textClassName}>{text}</span>
				<span className={pillStyles}>
					<span className={textStyles}>{words[0]}</span>
				</span>
			</span>
		);
	}

	return (
		<span className="inline-flex items-center gap-[0.35em] flex-wrap justify-center">
			<span className={textClassName}>{text}</span>

			{/* Pill avec le texte animé */}
			<span className={pillStyles}>
				{/* Container relatif pour le positionnement */}
				<span className="relative inline-flex items-center">
					{/* Texte animé - position absolute */}
					<AnimatePresence mode="wait">
						<motion.span
							key={currentIndex}
							initial={{ y: 20, opacity: 0, filter: "blur(4px)" }}
							animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
							exit={{ y: -20, opacity: 0, filter: "blur(4px)" }}
							transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
							className={cn(textStyles, "absolute inset-0 flex items-center justify-center")}
						>
							{words[currentIndex]}
						</motion.span>
					</AnimatePresence>

					{/* Placeholder invisible - réserve la largeur du mot le plus long */}
					<span className={cn(textStyles, "invisible select-none")} aria-hidden="true">
						{longestWord}
					</span>
				</span>
			</span>
		</span>
	);
}
