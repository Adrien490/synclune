"use client"

import { cn } from "@/shared/utils/cn"
import { useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react"
import { ComponentPropsWithoutRef, memo, useEffect, useRef } from "react"

/**
 * Configuration spring optimisée pour l'animation de nombres
 * - damping élevé (60) pour éviter le rebond sur les chiffres
 * - stiffness modérée (100) pour une animation fluide
 */
const NUMBER_SPRING_CONFIG = {
	damping: 60,
	stiffness: 100,
}

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
	value: number
	startValue?: number
	direction?: "up" | "down"
	delay?: number
	decimalPlaces?: number
	locale?: string
}

function formatNumber(value: number, decimalPlaces: number, locale: string): string {
	return Intl.NumberFormat(locale, {
		minimumFractionDigits: decimalPlaces,
		maximumFractionDigits: decimalPlaces,
	}).format(Number(value.toFixed(decimalPlaces)))
}

export const NumberTicker = memo(function NumberTicker({
	value,
	startValue = 0,
	direction = "up",
	delay = 0,
	className,
	decimalPlaces = 0,
	locale = "fr-FR",
	...props
}: NumberTickerProps) {
	const ref = useRef<HTMLSpanElement>(null)
	const shouldReduceMotion = useReducedMotion()
	const isInView = useInView(ref, { once: true, margin: "0px" })

	const initialValue = direction === "down" ? value : startValue
	const motionValue = useMotionValue(initialValue)
	const springValue = useSpring(motionValue, NUMBER_SPRING_CONFIG)

	const formattedValue = formatNumber(value, decimalPlaces, locale)

	// Déclencher l'animation quand le composant entre dans le viewport
	useEffect(() => {
		if (shouldReduceMotion || !isInView) return

		const timer = setTimeout(() => {
			motionValue.set(direction === "down" ? startValue : value)
		}, delay * 1000)

		return () => clearTimeout(timer)
	}, [motionValue, isInView, delay, value, direction, startValue, shouldReduceMotion])

	// Mettre à jour le DOM avec la valeur animée
	useEffect(() => {
		if (shouldReduceMotion) return

		return springValue.on("change", (latest) => {
			if (ref.current) {
				ref.current.textContent = formatNumber(latest, decimalPlaces, locale)
			}
		})
	}, [springValue, decimalPlaces, locale, shouldReduceMotion])

	return (
		<span
			ref={ref}
			role="status"
			aria-live="polite"
			aria-atomic="true"
			className={cn("inline-block tabular-nums", className)}
			{...props}
		>
			{shouldReduceMotion ? formattedValue : formatNumber(initialValue, decimalPlaces, locale)}
		</span>
	)
})
