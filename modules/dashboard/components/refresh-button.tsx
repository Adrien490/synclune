"use client"

import { Button } from "@/shared/components/ui/button"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip"
import { cn } from "@/shared/utils/cn"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import { RefreshCw } from "lucide-react"
import { useRefreshDashboard } from "../hooks/use-refresh-dashboard"

interface RefreshButtonProps {
	/** Afficher le timestamp de derniere mise a jour */
	showTimestamp?: boolean
	/** Classes CSS additionnelles */
	className?: string
}

/**
 * Bouton de rafraichissement du dashboard
 * Affiche optionnellement le timestamp de derniere mise a jour
 */
export function RefreshButton({
	showTimestamp = true,
	className,
}: RefreshButtonProps) {
	const { refresh, isRefreshing, lastUpdated } = useRefreshDashboard()

	// Formater le timestamp
	const timestampLabel = lastUpdated
		? `Mis a jour ${formatDistanceToNow(lastUpdated, { addSuffix: true, locale: fr })}`
		: "Actualiser"

	// Version courte pour mobile
	const timestampShort = lastUpdated
		? formatDistanceToNow(lastUpdated, { addSuffix: false, locale: fr })
		: null

	return (
		<div className={cn("hidden md:flex items-center gap-2 min-h-[44px]", className)}>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="outline"
						size="icon"
						onClick={refresh}
						disabled={isRefreshing}
						className="h-11 w-11"
						aria-label={isRefreshing ? "Actualisation en cours" : timestampLabel}
					>
						<RefreshCw
							className={cn(
								"h-4 w-4",
								isRefreshing && "animate-spin"
							)}
							aria-hidden="true"
						/>
						<span className="sr-only">Actualiser les donnees</span>
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>{timestampLabel}</p>
				</TooltipContent>
			</Tooltip>

			{/* Timestamp condense sur mobile, complet sur desktop */}
			{showTimestamp && lastUpdated && (
				<>
					<span className="md:hidden text-xs text-muted-foreground" aria-hidden="true">
						{timestampShort}
					</span>
					<span className="hidden md:inline text-xs text-muted-foreground" aria-hidden="true">
						{timestampLabel}
					</span>
				</>
			)}
		</div>
	)
}
