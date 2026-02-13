"use client"

import { useState, useEffect, type ReactNode } from "react"

interface ResponsiveLayoutProps {
	/** Content shown below the lg breakpoint (< 1024px) */
	mobile: ReactNode
	/** Content shown at and above the lg breakpoint (>= 1024px) */
	desktop: ReactNode
}

/**
 * Renders only the layout matching the current viewport after mount.
 *
 * SSR + first paint: both layouts render with CSS hidden classes (no hydration mismatch).
 * After mount: only the matching layout stays in the DOM, eliminating hydration
 * and animation cost of the hidden layout.
 */
export function ResponsiveLayout({ mobile, desktop }: ResponsiveLayoutProps) {
	const [mounted, setMounted] = useState(false)
	const [isDesktop, setIsDesktop] = useState(false)

	useEffect(() => {
		const mql = window.matchMedia("(min-width: 1024px)")
		setIsDesktop(mql.matches)
		setMounted(true)

		const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
		mql.addEventListener("change", handler)
		return () => mql.removeEventListener("change", handler)
	}, [])

	// SSR + first paint: render both with CSS visibility to avoid hydration mismatch
	if (!mounted) {
		return (
			<>
				<div className="lg:hidden">{mobile}</div>
				<div className="hidden lg:block">{desktop}</div>
			</>
		)
	}

	// After mount: render only the matching layout
	return isDesktop ? desktop : mobile
}
