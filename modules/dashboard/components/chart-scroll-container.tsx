"use client"

import { cn } from "@/shared/utils/cn"

interface ChartScrollContainerProps {
	children: React.ReactNode
	/** Classes CSS additionnelles */
	className?: string
}

/**
 * Container pour les charts - force le responsive sur mobile
 */
export function ChartScrollContainer({
	children,
	className,
}: ChartScrollContainerProps) {
	return (
		<div
			className={cn(
				"relative",
				// Pas de scroll, forcer le responsive
				"overflow-hidden",
				"md:overflow-visible",
				className
			)}
		>
			<div className="w-full min-w-0">
				{children}
			</div>
		</div>
	)
}
