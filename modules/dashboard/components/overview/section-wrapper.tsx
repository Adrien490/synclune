"use client"

import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/utils/cn"
import {
	OVERVIEW_SECTIONS,
	type OverviewSectionId,
} from "../../constants/overview-sections"

interface SectionWrapperProps {
	/** ID de la section (pour la config et l'accordion) */
	sectionId: OverviewSectionId
	/** Contenu de la section */
	children: React.ReactNode
	/** Badge optionnel (ex: nombre d'alertes) */
	badge?: {
		count: number
		variant?: "default" | "secondary" | "destructive" | "outline"
	}
	/** Classes CSS additionnelles */
	className?: string
}

/**
 * Wrapper pour une section pliable du dashboard Overview
 * Affiche un header avec icone, titre, description et badge optionnel
 */
export function SectionWrapper({
	sectionId,
	children,
	badge,
	className,
}: SectionWrapperProps) {
	const config = OVERVIEW_SECTIONS.find((s) => s.id === sectionId)

	if (!config) {
		return null
	}

	const Icon = config.icon

	return (
		<AccordionItem
			value={sectionId}
			className={cn(
				"border rounded-lg bg-card shadow-sm overflow-hidden",
				className
			)}
		>
			<AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 transition-colors">
				<div className="flex items-center gap-3 flex-1">
					<div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary">
						<Icon className="w-5 h-5" />
					</div>
					<div className="flex flex-col items-start gap-0.5">
						<div className="flex items-center gap-2">
							<span className="font-semibold text-base">{config.title}</span>
							{badge && badge.count > 0 && (
								<Badge variant={badge.variant || "secondary"} className="text-xs">
									{badge.count}
								</Badge>
							)}
						</div>
						<span className="text-xs text-muted-foreground">
							{config.description}
						</span>
					</div>
				</div>
			</AccordionTrigger>
			<AccordionContent className="px-4 pt-4 pb-4">
				{children}
			</AccordionContent>
		</AccordionItem>
	)
}
