"use client"

import { cn } from "@/shared/utils/cn"

interface ChartScrollContainerProps {
	children: React.ReactNode
	/** Activer le scroll horizontal sur mobile (defaut: true) */
	enableScroll?: boolean
	/** Largeur minimum du chart (defaut: 500px) */
	minWidth?: number
	/** Classes CSS additionnelles */
	className?: string
}

/**
 * Container pour les charts avec scroll horizontal sur mobile
 * Permet de garder les charts lisibles meme sur petits ecrans
 */
export function ChartScrollContainer({
	children,
	enableScroll = true,
	minWidth = 500,
	className,
}: ChartScrollContainerProps) {
	if (!enableScroll) {
		return <div className={className}>{children}</div>
	}

	return (
		<div
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
			<div
				className={cn(
					// Largeur minimum sur mobile
					"md:min-w-0"
				)}
				style={{ minWidth: `${minWidth}px` }}
			>
				{children}
			</div>
		</div>
	)
}
