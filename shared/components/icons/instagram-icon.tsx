"use client";

/**
 * Logo Instagram - Version minimaliste
 *
 * **Adaptation automatique au thème :**
 * - Utilise `currentColor` pour hériter la couleur du parent
 * - S'adapte automatiquement light/dark mode
 * - Aucune configuration nécessaire
 *
 * **Accessibilité WCAG 2.1 AA :**
 * - Support `decorative` pour éviter duplication si texte adjacent
 * - Label descriptif pour lecteurs d'écran
 *
 * @example
 * ```tsx
 * // ✅ Simple - hérite la couleur du parent
 * <div className="text-primary">
 *   <InstagramIcon size={24} />
 * </div>
 *
 * // ✅ Avec classe Tailwind
 * <InstagramIcon className="text-primary hover:text-primary/80" />
 *
 * // ✅ Footer social links
 * <a href="https://instagram.com/synclune" className="text-foreground hover:text-primary">
 *   <InstagramIcon decorative />
 *   <span className="sr-only">Suivre sur Instagram</span>
 * </a>
 * ```
 */
export interface InstagramIconProps {
	/** Classes Tailwind additionnelles */
	className?: string;
	/**
	 * Taille en pixels (défaut: 24)
	 * @default 24
	 */
	size?: number;
	/**
	 * Label pour lecteurs d'écran (défaut: "Suivre sur Instagram")
	 */
	ariaLabel?: string;
	/**
	 * Masquer aux lecteurs d'écran si l'icône est purement décorative
	 * @default false
	 */
	decorative?: boolean;
}

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
