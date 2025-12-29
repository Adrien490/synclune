import type { InstagramIconProps } from "@/shared/types/icons.types";

export type { InstagramIconProps };

export function InstagramIcon({
	className = "",
	size = 24,
	ariaLabel = "Suivre sur Instagram",
	decorative = false,
}: InstagramIconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			className={className}
			xmlns="http://www.w3.org/2000/svg"
			role={decorative ? "presentation" : "img"}
			aria-label={decorative ? undefined : ariaLabel}
			aria-hidden={decorative ? "true" : undefined}
		>
			{!decorative && <title>{ariaLabel}</title>}

			{/* Cadre principal Instagram */}
			<rect
				x="2"
				y="2"
				width="20"
				height="20"
				rx="5.5"
				ry="5.5"
				stroke="currentColor"
				strokeWidth="2"
				fill="none"
			/>

			{/* Objectif de l'appareil photo */}
			<circle
				cx="12"
				cy="12"
				r="4.5"
				stroke="currentColor"
				strokeWidth="2"
				fill="none"
			/>

			{/* Indicateur de mode */}
			<circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" />
		</svg>
	);
}
