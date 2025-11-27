import { memo } from "react";

/**
 * Icône de cœur pour favoris/wishlist
 *
 * **Utilise les tokens OKLCH du design system :**
 * - `--primary` (rose) pour le cœur principal
 * - `--secondary` (doré) pour les sparkles romantiques (variant filled)
 *
 * **Accessibilité WCAG 2.1 AA :**
 * - Label dynamique selon variant (ajouté/retiré des favoris)
 * - Support `decorative` pour éviter duplication si texte adjacent
 * - Tokens réactifs au high contrast mode
 *
 * **Variants :**
 * - `outline` : Non favori (état neutre)
 * - `filled` : Favori ajouté (avec sparkles dorés romantiques)
 *
 * **Pattern recommandé :**
 * Utiliser dans un bouton toggle avec état `isFavorite` pour gérer
 * automatiquement le variant et le label accessible.
 *
 * **Thèmes supportés :**
 * - ✅ Light mode (défaut)
 * - ✅ Dark mode (adaptation automatique via CSS variables)
 * - ✅ High contrast mode (tokens OKLCH WCAG AA)
 *
 * @example
 * ```tsx
 * // ✅ Bouton toggle favori (pattern recommandé)
 * <button
 *   onClick={toggleFavorite}
 *   aria-pressed={isFavorite}
 * >
 *   <HeartIcon
 *     variant={isFavorite ? "filled" : "outline"}
 *     decorative
 *   />
 *   <span className="sr-only">
 *     {isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
 *   </span>
 * </button>
 *
 * // ✅ Avec label auto-géré
 * <HeartIcon
 *   variant={isFavorite ? "filled" : "outline"}
 * />
 * // → Annoncé : "Retirer des favoris" si filled
 *
 * // ✅ Dans Card produit (decorative car texte adjacent)
 * <Card>
 *   <HeartIcon variant="filled" decorative className="absolute top-2 right-2" />
 *   <p>Produit en favoris</p>
 * </Card>
 * ```
 */
export interface HeartIconProps {
	/** Classes Tailwind additionnelles */
	className?: string;
	/**
	 * Taille en pixels (défaut: 24)
	 * @default 24
	 * @minimum 16 - En dessous de 16px, sparkles dorés invisibles
	 */
	size?: number;
	/**
	 * Label pour lecteurs d'écran
	 * Par défaut, change automatiquement selon variant :
	 * - outline : "Ajouter aux favoris"
	 * - filled : "Retirer des favoris"
	 */
	ariaLabel?: string;
	/**
	 * Style visuel de l'icône
	 * - `outline` : Non favori (défaut)
	 * - `filled` : Favori ajouté (avec sparkles dorés)
	 * @default "outline"
	 */
	variant?: "outline" | "filled";
	/**
	 * Masquer aux lecteurs d'écran si l'icône est purement décorative
	 * Utiliser `true` si texte adjacent déjà descriptif
	 * @default false
	 */
	decorative?: boolean;
}

export const HeartIcon = memo(function HeartIcon({
	className = "",
	size = 24,
	ariaLabel,
	variant = "outline",
	decorative = false,
}: HeartIconProps) {
	// Code défensif : fallback si props invalides
	const safeSize = Math.max(size, 16); // Minimum 16px pour sparkles visibles
	const safeVariant = variant === "filled" ? "filled" : "outline";
	const isFilled = safeVariant === "filled";

	// Label dynamique selon variant (si non fourni)
	const defaultLabel = isFilled ? "Retirer des favoris" : "Ajouter aux favoris";
	const accessibleLabel = ariaLabel ?? defaultLabel;

	return (
		<svg
			width={safeSize}
			height={safeSize}
			viewBox="0 0 24 24"
			fill="none"
			className={className}
			xmlns="http://www.w3.org/2000/svg"
			role={decorative ? "presentation" : "img"}
			aria-label={decorative ? undefined : accessibleLabel}
			aria-hidden={decorative ? "true" : undefined}
			data-testid="heart-icon"
			data-variant={safeVariant}
		>
			{!decorative && <title>{accessibleLabel}</title>}

			{/* Cœur principal - rose avec variants outline/filled */}
			<path
				d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
				fill={isFilled ? "var(--primary)" : "none"}
				stroke={isFilled ? "none" : "var(--primary)"}
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>

			{/* Détails dorés - sparkles romantiques (variant filled uniquement) */}
			{isFilled && (
				<g data-testid="heart-sparkles">
					<circle cx="10" cy="10" r="1" fill="var(--secondary)" />
					<circle cx="14" cy="9" r="0.8" fill="var(--secondary)" />
					<circle cx="16" cy="14" r="0.9" fill="var(--secondary)" />
				</g>
			)}
		</svg>
	);
});

// Display name pour React DevTools et debugging
HeartIcon.displayName = "HeartIcon";
