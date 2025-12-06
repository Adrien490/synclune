"use client"

import { useBreakpoint } from "./use-breakpoint"

type YAxisPreset = "compact" | "default" | "wide"

const Y_AXIS_WIDTHS: Record<YAxisPreset, Record<"sm" | "md" | "lg", number>> = {
	compact: { sm: 60, md: 80, lg: 100 },
	default: { sm: 80, md: 100, lg: 120 },
	wide: { sm: 100, md: 130, lg: 150 },
}

/**
 * Hook pour obtenir une largeur de Y-axis responsive
 * Adapte la largeur selon le breakpoint actuel
 *
 * @param preset - "compact" | "default" | "wide"
 * @returns Largeur en pixels
 */
export function useYAxisWidth(preset: YAxisPreset = "default"): number {
	const breakpoint = useBreakpoint()
	return Y_AXIS_WIDTHS[preset][breakpoint]
}
