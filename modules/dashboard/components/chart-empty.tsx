"use client"

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/utils/cn"
import Link from "next/link"
import { EMPTY_STATES, type EmptyStateType } from "../constants/empty-states"

interface ChartEmptyProps {
	/** Type d'etat vide (cle de EMPTY_STATES) */
	type: EmptyStateType
	/** Texte additionnel pour le contexte (ex: "sur cette periode") */
	periodLabel?: string
	/** Action optionnelle */
	action?: {
		label: string
		href?: string
		onClick?: () => void
	}
	/** Hauteur minimale (pour matcher la hauteur du chart) */
	minHeight?: number
	/** Classes CSS additionnelles */
	className?: string
}

/**
 * Empty state specifique pour les charts du dashboard
 * Reutilise le composant Empty avec les configurations predefinies
 */
export function ChartEmpty({
	type,
	periodLabel,
	action,
	minHeight = 250,
	className,
}: ChartEmptyProps) {
	const config = EMPTY_STATES[type]
	const Icon = config.icon

	// Construire la description avec le label de periode si fourni
	const description = periodLabel
		? config.description.replace(".", ` ${periodLabel}.`)
		: config.description

	return (
		<Empty
			className={cn("py-8", className)}
			style={{ minHeight: `${minHeight}px` }}
		>
			<EmptyHeader>
				<EmptyMedia>
					<Icon className="size-6" />
				</EmptyMedia>
				<EmptyTitle className="text-lg">{config.title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>

			{action && (
				<div className="mt-4">
					{action.href ? (
						<Button asChild variant="outline" size="sm">
							<Link href={action.href}>{action.label}</Link>
						</Button>
					) : (
						<Button variant="outline" size="sm" onClick={action.onClick}>
							{action.label}
						</Button>
					)}
				</div>
			)}
		</Empty>
	)
}
