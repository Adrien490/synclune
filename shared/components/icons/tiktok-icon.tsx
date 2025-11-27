"use client";

import { memo } from "react";

/**
 * Logo TikTok - Version minimaliste
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
 *   <TikTokIcon size={24} />
 * </div>
 *
 * // ✅ Avec classe Tailwind
 * <TikTokIcon className="text-primary hover:text-primary/80" />
 *
 * // ✅ Footer social links
 * <a href="https://tiktok.com/@synclune" className="text-foreground hover:text-primary">
 *   <TikTokIcon decorative />
 *   <span className="sr-only">Suivre sur TikTok</span>
 * </a>
 * ```
 */
export interface TikTokIconProps {
	/** Classes Tailwind additionnelles */
	className?: string;
	/**
	 * Taille en pixels (défaut: 24)
	 * @default 24
	 */
	size?: number;
	/**
	 * Label pour lecteurs d'écran (défaut: "Suivre sur TikTok")
	 */
	ariaLabel?: string;
	/**
	 * Masquer aux lecteurs d'écran si l'icône est purement décorative
	 * @default false
	 */
	decorative?: boolean;
}

export const TikTokIcon = memo(function TikTokIcon({
	className = "",
	size = 24,
	ariaLabel = "Suivre sur TikTok",
	decorative = false,
}: TikTokIconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="currentColor"
			className={className}
			xmlns="http://www.w3.org/2000/svg"
			role={decorative ? "presentation" : "img"}
			aria-label={decorative ? undefined : ariaLabel}
			aria-hidden={decorative ? "true" : undefined}
		>
			{!decorative && <title>{ariaLabel}</title>}

			{/* Logo TikTok - Note musicale stylisée */}
			<path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
		</svg>
	);
});

// Display name pour React DevTools et debugging
TikTokIcon.displayName = "TikTokIcon";
