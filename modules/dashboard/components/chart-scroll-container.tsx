"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/shared/utils/cn"

interface ChartScrollContainerProps {
	children: React.ReactNode
	/** Activer le scroll horizontal sur mobile (defaut: true) */
	enableScroll?: boolean
	/** Afficher l'indicateur de scroll (defaut: true) */
	showScrollHint?: boolean
	/** Classes CSS additionnelles */
	className?: string
}

/**
 * Container pour les charts avec scroll horizontal sur mobile
 * Permet de garder les charts lisibles meme sur petits ecrans
 * Affiche un indicateur visuel quand le contenu est scrollable
 */
export function ChartScrollContainer({
	children,
	enableScroll = true,
	showScrollHint = true,
	className,
}: ChartScrollContainerProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const [canScroll, setCanScroll] = useState(false)
	const [isScrolledToEnd, setIsScrolledToEnd] = useState(false)

	useEffect(() => {
		if (!enableScroll || !showScrollHint) return

		const el = containerRef.current
		if (!el) return

		const checkScroll = () => {
			const hasScroll = el.scrollWidth > el.clientWidth
			setCanScroll(hasScroll)

			// Verifier si on est a la fin du scroll
			if (hasScroll) {
				const scrolledToEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 5
				setIsScrolledToEnd(scrolledToEnd)
			}
		}

		const handleScroll = () => {
			const scrolledToEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 5
			setIsScrolledToEnd(scrolledToEnd)
		}

		checkScroll()
		el.addEventListener("scroll", handleScroll, { passive: true })
		window.addEventListener("resize", checkScroll)

		return () => {
			el.removeEventListener("scroll", handleScroll)
			window.removeEventListener("resize", checkScroll)
		}
	}, [enableScroll, showScrollHint])

	if (!enableScroll) {
		return <div className={className}>{children}</div>
	}

	return (
		<div className="relative">
			<div
				ref={containerRef}
				className={cn(
					"relative",
					// Scroll horizontal sur mobile
					"overflow-x-auto -mx-4 px-4",
					// Pas de scroll sur desktop
					"md:mx-0 md:px-0 md:overflow-visible",
					// Indicateur de scroll
					"scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
					className
				)}
			>
				<div className="min-w-[400px] sm:min-w-[500px] md:min-w-0">
					{children}
				</div>
			</div>

			{/* Indicateur de scroll - gradient sur le bord droit */}
			{showScrollHint && canScroll && !isScrolledToEnd && (
				<div
					className="absolute right-0 top-0 h-full w-8 pointer-events-none bg-gradient-to-l from-background to-transparent md:hidden"
					aria-hidden="true"
				/>
			)}
		</div>
	)
}
