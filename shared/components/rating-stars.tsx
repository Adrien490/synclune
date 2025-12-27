"use client"

import { useState, useId } from "react"
import { cn } from "@/shared/utils/cn"
import { StarIcon } from "@/shared/components/icons/star-icon"

interface RatingStarsProps {
	/** Note actuelle (0-maxRating, supporte les décimales) */
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
	/** Label personnalisé pour l'accessibilité */
	ariaLabel?: string
	/** Champ requis (mode interactif) */
	required?: boolean
}

/**
 * Composant d'affichage/saisie d'étoiles avec support des décimales
 *
 * Mode affichage: Affiche les étoiles remplies selon la note (supporte 4.3, 3.7, etc.)
 * Mode interactif: Permet de sélectionner une note en cliquant
 *
 * @example
 * // Affichage avec décimales
 * <RatingStars rating={4.3} size="sm" />
 *
 * // Mode interactif (formulaire)
 * <RatingStars rating={value} interactive onChange={setValue} size="lg" />
 */
export function RatingStars({
	rating,
	maxRating = 5,
	size = "md",
	interactive = false,
	onChange,
	className,
	showRating = false,
	ariaLabel,
	required = false,
}: RatingStarsProps) {
	const [hoverRating, setHoverRating] = useState<number | null>(null)
	const baseId = useId()

	const handleClick = (star: number) => {
		if (interactive && onChange) {
			onChange(star)
		}
	}

	const handleKeyDown = (star: number, e: React.KeyboardEvent) => {
		if (!interactive || !onChange) return

		switch (e.key) {
			case "Enter":
			case " ":
				e.preventDefault()
				onChange(star)
				break
			case "ArrowRight":
			case "ArrowUp":
				e.preventDefault()
				if (star < maxRating) {
					onChange(star + 1)
					const next = e.currentTarget.nextElementSibling as HTMLButtonElement
					next?.focus()
				}
				break
			case "ArrowLeft":
			case "ArrowDown":
				e.preventDefault()
				if (star > 1) {
					onChange(star - 1)
					const prev = e.currentTarget.previousElementSibling as HTMLButtonElement
					prev?.focus()
				}
				break
		}
	}

	// Label par défaut ou personnalisé
	const defaultLabel = interactive
		? "Sélection de la note"
		: `Note : ${rating.toFixed(1).replace(".", ",")} sur ${maxRating}`
	const label = ariaLabel ?? defaultLabel

	return (
		<div
			className={cn("flex items-center gap-1 sm:gap-0.5", className)}
			role={interactive ? "radiogroup" : "img"}
			aria-label={label}
			aria-required={interactive && required ? true : undefined}
			style={{
				"--star-filled": "rgb(251 191 36)",
				"--star-empty": "rgb(156 163 175 / 0.5)",
			} as React.CSSProperties}
		>
			{Array.from({ length: maxRating }, (_, i) => {
				const star = i + 1
				const displayRating = interactive ? (hoverRating ?? rating) : rating

				// Calcul du remplissage : plein (1), partiel (0-1), ou vide (0)
				const fillPercentage = Math.min(1, Math.max(0, displayRating - i))
				const isFilled = fillPercentage >= 1
				const gradientId = `${baseId}-star-${i}`

				if (interactive) {
					return (
						<button
							key={star}
							type="button"
							role="radio"
							aria-checked={star === rating}
							onClick={() => handleClick(star)}
							onKeyDown={(e) => handleKeyDown(star, e)}
							onMouseEnter={() => setHoverRating(star)}
							onMouseLeave={() => setHoverRating(null)}
							className={cn(
								"p-2 min-h-11 min-w-11 flex items-center justify-center rounded-sm",
								"focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-3",
								"motion-safe:transition-all motion-safe:hover:scale-110",
								"cursor-pointer"
							)}
							aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
						>
							<StarIcon
								fillPercentage={isFilled ? 1 : 0}
								size={size}
								gradientId={gradientId}
							/>
						</button>
					)
				}

				return (
					<StarIcon
						key={star}
						fillPercentage={fillPercentage}
						size={size}
						gradientId={gradientId}
					/>
				)
			})}

			{showRating && (
				<span className="ml-1.5 text-sm font-medium text-foreground">
					{rating.toFixed(1).replace(".", ",")}
				</span>
			)}
		</div>
	)
}
