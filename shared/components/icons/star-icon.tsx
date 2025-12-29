import type { StarIconProps } from "@/shared/types/icons.types";

export type { StarIconProps };

// Chemin SVG de l'étoile (Lucide star path)
const STAR_PATH = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"

const sizeClasses = {
	sm: "size-[18px]",
	md: "size-5",
	lg: "size-6",
}

/**
 * Icône étoile avec support du remplissage partiel via linearGradient SVG
 */
export function StarIcon({ fillPercentage, size, gradientId }: StarIconProps) {
	const isFull = fillPercentage >= 1
	const isEmpty = fillPercentage <= 0
	const isPartial = !isFull && !isEmpty

	// Déterminer le fill
	let fill: string
	if (isFull) {
		fill = "var(--star-filled)"
	} else if (isEmpty) {
		fill = "var(--star-empty)"
	} else {
		fill = `url(#${gradientId})`
	}

	return (
		<svg
			viewBox="0 0 24 24"
			className={sizeClasses[size]}
			aria-hidden="true"
			focusable="false"
		>
			{isPartial && (
				<defs>
					<linearGradient id={gradientId}>
						<stop offset={`${fillPercentage * 100}%`} stopColor="var(--star-filled)" />
						<stop offset={`${fillPercentage * 100}%`} stopColor="var(--star-empty)" />
					</linearGradient>
				</defs>
			)}
			<path d={STAR_PATH} fill={fill} />
		</svg>
	)
}
