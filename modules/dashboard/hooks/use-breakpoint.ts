"use client"

import { useEffect, useState } from "react"

type Breakpoint = "sm" | "md" | "lg"

const BREAKPOINTS = {
	sm: 640,
	md: 768,
	lg: 1024,
} as const

/**
 * Hook SSR-safe pour detecter le breakpoint actuel
 * Retourne "sm" par defaut (mobile-first) cote serveur
 */
export function useBreakpoint(): Breakpoint {
	const [breakpoint, setBreakpoint] = useState<Breakpoint>("sm")

	useEffect(() => {
		const updateBreakpoint = () => {
			const width = window.innerWidth
			if (width >= BREAKPOINTS.lg) {
				setBreakpoint("lg")
			} else if (width >= BREAKPOINTS.md) {
				setBreakpoint("md")
			} else {
				setBreakpoint("sm")
			}
		}

		// Initial check
		updateBreakpoint()

		// Listen for resize
		window.addEventListener("resize", updateBreakpoint)
		return () => window.removeEventListener("resize", updateBreakpoint)
	}, [])

	return breakpoint
}
