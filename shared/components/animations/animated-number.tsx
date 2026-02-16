"use client"

import { cn } from "@/shared/utils/cn"
import {
	motion,
	type MotionValue,
	useInView,
	useReducedMotion,
	useSpring,
	useTransform,
} from "motion/react"
import { useEffect, useEffectEvent, useRef } from "react"

/**
 * Configuration spring optimisee pour l'animation de nombres
 * - mass faible (0.8) pour une reponse rapide
 * - stiffness moderee (75) pour une animation fluide
 * - damping (15) pour eviter le rebond excessif
 */
const NUMBER_SPRING_CONFIG = {
	mass: 0.8,
	stiffness: 75,
	damping: 15,
}

function formatNumber(value: number, decimalPlaces: number, locale: string): string {
	return Intl.NumberFormat(locale, {
		minimumFractionDigits: decimalPlaces,
		maximumFractionDigits: decimalPlaces,
	}).format(Number(value.toFixed(decimalPlaces)))
}

interface AnimatedNumberProps {
	/** Valeur cible a atteindre */
	value: number
	/** Valeur de depart (default: 0) */
	startValue?: number
	/** Direction de l'animation */
	direction?: "up" | "down"
	/** Delai avant le debut de l'animation en secondes */
	delay?: number
	/** Nombre de decimales a afficher */
	decimalPlaces?: number
	/** Locale pour le formatage des nombres */
	locale?: string
	/** Classes CSS additionnelles */
	className?: string
	/** Callbacks d'animation */
	onAnimationStart?: () => void
	onAnimationComplete?: () => void
}

export function AnimatedNumber({
	value,
	startValue = 0,
	direction = "up",
	delay = 0,
	className,
	decimalPlaces = 0,
	locale = "fr-FR",
	onAnimationStart,
	onAnimationComplete,
}: AnimatedNumberProps) {
	const ref = useRef<HTMLSpanElement>(null)
	const shouldReduceMotion = useReducedMotion()
	const isInView = useInView(ref, { once: true, margin: "0px" })

	const initialValue = direction === "down" ? value : startValue
	const spring = useSpring(initialValue, NUMBER_SPRING_CONFIG)

	const display: MotionValue<string> = useTransform(spring, (current) =>
		formatNumber(current, decimalPlaces, locale)
	)

	const formattedValue = formatNumber(value, decimalPlaces, locale)

	// Effect Events: read callbacks without re-triggering effects on identity changes
	const onStart = useEffectEvent(() => {
		onAnimationStart?.()
		spring.set(direction === "down" ? startValue : value)
	})

	const onComplete = useEffectEvent(() => {
		onAnimationComplete?.()
	})

	// Declencher l'animation quand le composant entre dans le viewport
	useEffect(() => {
		if (shouldReduceMotion || !isInView) return

		const timer = setTimeout(onStart, delay * 1000)

		return () => clearTimeout(timer)
	}, [isInView, delay, value, shouldReduceMotion])

	// Detecter la fin de l'animation
	useEffect(() => {
		if (shouldReduceMotion) return

		const targetValue = direction === "down" ? startValue : value
		const unsubscribe = spring.on("change", (current) => {
			// Considerer l'animation terminee quand on est tres proche de la cible
			if (Math.abs(current - targetValue) < 0.01) {
				onComplete()
			}
		})

		return () => unsubscribe()
	}, [spring, value, startValue, direction, shouldReduceMotion])

	// Si reduced motion, afficher directement la valeur finale
	if (shouldReduceMotion) {
		return (
			<span
				ref={ref}
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className={cn("inline-block tabular-nums", className)}
			>
				{formattedValue}
			</span>
		)
	}

	return (
		<motion.span
			ref={ref}
			role="status"
			aria-live="polite"
			aria-atomic="true"
			className={cn("inline-block tabular-nums", className)}
		>
			{display}
		</motion.span>
	)
}

// Alias pour compatibilite avec l'ancien composant
export const NumberTicker = AnimatedNumber
