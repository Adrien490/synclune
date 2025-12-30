"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useOptimistic, useTransition } from "react"
import { X } from "lucide-react"

import { Progress } from "@/shared/components/ui/progress"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/utils/cn"
import type { RatingDistribution as RatingDistributionType } from "../types/review.types"

interface RatingDistributionProps {
	distribution: RatingDistributionType[]
	className?: string
}

/**
 * Distribution des notes cliquable pour filtrer les avis
 * Baymard: 90% des utilisateurs cliquent instinctivement sur les barres
 * pour filtrer, et 53% recherchent activement les avis négatifs
 */
export function RatingDistribution({
	distribution,
	className,
}: RatingDistributionProps) {
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const [isPending, startTransition] = useTransition()

	// Lire le filtre actuel depuis l'URL
	const currentFilter = searchParams.get("ratingFilter")
	const activeRating = currentFilter ? parseInt(currentFilter, 10) : null

	// State optimiste pour feedback immédiat
	const [optimisticRating, setOptimisticRating] = useOptimistic(
		activeRating,
		(_current, newRating: number | null) => newRating
	)

	// Construire l'URL avec le nouveau filtre
	const buildUrl = (rating: number | null): string => {
		const params = new URLSearchParams(searchParams.toString())

		if (rating === null) {
			params.delete("ratingFilter")
		} else {
			params.set("ratingFilter", String(rating))
		}

		// Reset pagination
		params.delete("cursor")
		params.delete("direction")

		const queryString = params.toString()
		return queryString ? `${pathname}?${queryString}` : pathname
	}

	// Handler pour cliquer sur une barre
	const handleRatingClick = (rating: number) => {
		startTransition(() => {
			// Si on clique sur le filtre actif, on le désactive
			const newRating = optimisticRating === rating ? null : rating
			setOptimisticRating(newRating)
			router.push(buildUrl(newRating), { scroll: false })
		})
	}

	// Handler pour réinitialiser le filtre
	const handleClearFilter = () => {
		startTransition(() => {
			setOptimisticRating(null)
			router.push(buildUrl(null), { scroll: false })
		})
	}

	return (
		<div className={cn("space-y-3", className)}>
			{/* Barres de distribution cliquables */}
			<div className="space-y-2" role="group" aria-label="Filtrer par note">
				{distribution.map(({ rating, count, percentage }) => {
					const isActive = optimisticRating === rating
					const isDisabled = count === 0

					return (
						<button
							key={rating}
							type="button"
							onClick={() => handleRatingClick(rating)}
							disabled={isDisabled || isPending}
							aria-pressed={isActive}
							aria-label={`Filtrer par ${rating} étoile${rating > 1 ? "s" : ""} (${count} avis)`}
							className={cn(
								"flex items-center gap-2 w-full flex-nowrap py-1.5 px-2 -mx-2 rounded-md",
								"transition-all duration-150",
								// Hover et focus
								!isDisabled && "cursor-pointer",
								!isDisabled && "hover:bg-muted/60 focus-visible:bg-muted/60",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
								// État actif
								isActive && "bg-primary/10 hover:bg-primary/15",
								// Désactivé (0 avis)
								isDisabled && "opacity-50 cursor-not-allowed",
								// Pending
								isPending && "opacity-70"
							)}
						>
							{/* Label (étoiles) */}
							<span
								className={cn(
									"text-sm font-medium w-16 whitespace-nowrap text-left",
									isActive ? "text-primary" : "text-muted-foreground"
								)}
							>
								{rating} étoile{rating > 1 ? "s" : ""}
							</span>

							{/* Barre de progression */}
							<div className="flex-1 min-w-0">
								<Progress
									value={percentage}
									className={cn(
										"h-2.5 transition-all",
										isActive && "[&>[data-slot=progress-indicator]]:bg-primary"
									)}
									aria-hidden="true"
								/>
							</div>

							{/* Pourcentage */}
							<span
								className={cn(
									"text-sm w-10 text-right tabular-nums",
									isActive ? "text-primary font-medium" : "text-muted-foreground"
								)}
							>
								{percentage}%
							</span>

							{/* Nombre d'avis */}
							<span
								className={cn(
									"text-xs w-12 text-right hidden sm:inline tabular-nums",
									isActive ? "text-primary" : "text-muted-foreground"
								)}
							>
								({count})
							</span>
						</button>
					)
				})}
			</div>

			{/* Badge filtre actif */}
			{optimisticRating !== null && (
				<div className="flex items-center gap-2 pt-1">
					<span className="text-sm text-muted-foreground">
						Filtre actif :
					</span>
					<Button
						variant="secondary"
						size="sm"
						onClick={handleClearFilter}
						disabled={isPending}
						className="h-7 gap-1.5 text-xs"
					>
						{optimisticRating} étoile{optimisticRating > 1 ? "s" : ""}
						<X className="size-3" aria-hidden="true" />
						<span className="sr-only">Supprimer le filtre</span>
					</Button>
				</div>
			)}
		</div>
	)
}
