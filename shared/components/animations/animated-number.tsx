"use client";

import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { cn } from "@/shared/utils/cn";
import {
	m,
	type MotionValue,
	useInView,
	useReducedMotion,
	useSpring,
	useTransform,
} from "motion/react";
import { useEffect, useEffectEvent, useRef } from "react";

function formatNumber(value: number, decimalPlaces: number, locale: string): string {
	return Intl.NumberFormat(locale, {
		minimumFractionDigits: decimalPlaces,
		maximumFractionDigits: decimalPlaces,
	}).format(Number(value.toFixed(decimalPlaces)));
}

export interface AnimatedNumberProps {
	/** Valeur cible a atteindre */
	value: number;
	/** Valeur de depart (default: 0) */
	startValue?: number;
	/** Direction de l'animation */
	direction?: "up" | "down";
	/** Delai avant le debut de l'animation en secondes */
	delay?: number;
	/** Nombre de decimales a afficher */
	decimalPlaces?: number;
	/** Locale pour le formatage des nombres */
	locale?: string;
	/** Custom formatter (overrides decimalPlaces/locale) */
	formatter?: (n: number) => string;
	/** Classes CSS additionnelles */
	className?: string;
	/** Callbacks d'animation */
	onAnimationStart?: () => void;
	onAnimationComplete?: () => void;
}

export function AnimatedNumber({
	value,
	startValue = 0,
	direction = "up",
	delay = 0,
	className,
	decimalPlaces = 0,
	locale = "fr-FR",
	formatter,
	onAnimationStart,
	onAnimationComplete,
}: AnimatedNumberProps) {
	const ref = useRef<HTMLSpanElement>(null);
	const shouldReduceMotion = useReducedMotion();
	const isInView = useInView(ref, { once: true, margin: "0px" });

	const initialValue = direction === "down" ? value : startValue;
	const spring = useSpring(initialValue, MOTION_CONFIG.spring.number);

	const format = formatter ?? ((n: number) => formatNumber(n, decimalPlaces, locale));

	const display: MotionValue<string> = useTransform(spring, format);

	const formattedValue = format(value);

	// Effect Events: read callbacks without re-triggering effects on identity changes
	const onStart = useEffectEvent(() => {
		onAnimationStart?.();
		spring.set(direction === "down" ? startValue : value);
	});

	const onComplete = useEffectEvent(() => {
		onAnimationComplete?.();
	});

	// Declencher l'animation quand le composant entre dans le viewport
	useEffect(() => {
		if (shouldReduceMotion || !isInView) return;

		const timer = setTimeout(onStart, delay * 1000);

		return () => clearTimeout(timer);
	}, [isInView, delay, value, shouldReduceMotion]);

	// Detecter la fin de l'animation.
	// Abonnement inconditionnel + `return unsubscribe` : aucun chemin de sortie ne
	// peut laisser l'abonnement en vie (sous `prefers-reduced-motion` le spring
	// n'est jamais lancé, il n'émet donc aucun "change" — le garde-fou dans le
	// callback ne fait que l'expliciter).
	useEffect(() => {
		const targetValue = direction === "down" ? startValue : value;
		const unsubscribe = spring.on("change", (current) => {
			if (shouldReduceMotion) return;
			// Considerer l'animation terminee quand on est tres proche de la cible
			if (Math.abs(current - targetValue) < 0.01) {
				onComplete();
			}
		});

		return unsubscribe;
	}, [spring, value, startValue, direction, shouldReduceMotion]);

	// Pas de role="status"/aria-live ici : motion réécrit le textContent à CHAQUE
	// frame du spring — une région live dessus fait vocaliser chaque valeur
	// intermédiaire. L'annonce SR appartient au call site, sur la valeur finale
	// (ex. la région différée de cart-sheet.tsx).
	if (shouldReduceMotion) {
		return (
			<span ref={ref} className={cn("inline-block tabular-nums", className)}>
				{formattedValue}
			</span>
		);
	}

	return (
		<m.span ref={ref} className={cn("inline-block tabular-nums", className)}>
			{display}
		</m.span>
	);
}

// Alias pour compatibilite avec l'ancien composant
export const NumberTicker = AnimatedNumber;
