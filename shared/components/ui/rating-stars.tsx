"use client"

import { Star } from "lucide-react"
import { cn } from "@/shared/utils/cn"

interface RatingStarsProps {
	/** Note actuelle (1-maxRating) */
	rating: number
	/** Note maximale (par défaut: 5) */
	maxRating?: number
	/** Taille des étoiles */
	size?: "sm" | "md" | "lg"
	/** Mode interactif (input) */
	interactive?: boolean
	/** Callback lors du changement de note */
	onChange?: (rating: number) => void
	/** Classes CSS additionnelles */
	className?: string
	/** Afficher la note en texte */
	showRating?: boolean
}

const sizeClasses = {
	sm: "size-3.5",
	md: "size-4",
	lg: "size-5",
}

/**
 * Composant d'affichage/saisie d'étoiles
 *
 * Mode affichage: Affiche les étoiles remplies selon la note
 * Mode interactif: Permet de sélectionner une note en cliquant
 */
export function RatingStars({
	rating,
	maxRating = 5,
	size = "md",
	interactive = false,
	onChange,
	className,
	showRating = false,
}: RatingStarsProps) {
	const handleClick = (star: number) => {
		if (interactive && onChange) {
			onChange(star)
		}
	}

	const handleKeyDown = (star: number, e: React.KeyboardEvent) => {
		if (interactive && onChange && (e.key === "Enter" || e.key === " ")) {
			e.preventDefault()
			onChange(star)
		}
	}

	return (
		<div
			className={cn("flex items-center gap-0.5", className)}
			role={interactive ? "radiogroup" : "img"}
			aria-label={
				interactive
					? "Sélection de la note"
					: `Note : ${rating} sur ${maxRating}`
			}
		>
			{Array.from({ length: maxRating }, (_, i) => {
				const star = i + 1
				const isFilled = star <= rating

				if (interactive) {
					return (
						<button
							key={star}
							type="button"
							role="radio"
							aria-checked={star === rating}
							onClick={() => handleClick(star)}
							onKeyDown={(e) => handleKeyDown(star, e)}
							className={cn(
								"p-2 min-h-11 min-w-11 flex items-center justify-center rounded-sm",
								"focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
								"motion-safe:transition-all motion-safe:hover:scale-110",
								interactive && "cursor-pointer"
							)}
							aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
						>
							<Star
								className={cn(
									sizeClasses[size],
									isFilled
										? "fill-amber-400 text-amber-400"
										: "fill-muted text-muted-foreground/30"
								)}
							/>
						</button>
					)
				}

				return (
					<Star
						key={star}
						className={cn(
							sizeClasses[size],
							isFilled
								? "fill-amber-400 text-amber-400"
								: "fill-muted text-muted-foreground/30"
						)}
						aria-hidden="true"
					/>
				)
			})}

			{showRating && (
				<span className="ml-1.5 text-sm font-medium text-foreground">
					{rating.toFixed(1)}
				</span>
			)}
		</div>
	)
}

/**
 * Affichage compact de la note moyenne
 */
export function RatingStarsCompact({
	rating,
	count,
	countLabel = "avis",
	className,
}: {
	rating: number
	count: number
	countLabel?: string
	className?: string
}) {
	return (
		<div
			className={cn("flex items-center gap-1.5", className)}
			role="img"
			aria-label={`Note moyenne : ${rating.toFixed(1)} sur 5, basée sur ${count} ${countLabel}`}
		>
			<Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
			<span className="text-sm font-medium" aria-hidden="true">
				{rating.toFixed(1)}
			</span>
			<span className="text-sm text-muted-foreground" aria-hidden="true">
				({count} {countLabel})
			</span>
		</div>
	)
}
