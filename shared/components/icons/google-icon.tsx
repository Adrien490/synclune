import { memo } from "react";

/**
 * Logo Google officiel pour authentification OAuth
 *
 * **Couleurs de marque Google (ne pas modifier) :**
 * - Bleu #4285F4
 * - Vert #34A853
 * - Jaune #FBBC05
 * - Rouge #EA4335
 *
 * **IMPORTANT:** Ces couleurs sont fixes et ne suivent PAS le design system
 * Synclune pour respecter les Google Brand Guidelines.
 *
 * **Accessibilité WCAG 2.1 AA :**
 * - Support `decorative` pour éviter duplication si texte adjacent
 * - Label descriptif pour lecteurs d'écran
 *
 * **Thèmes supportés :**
 * - ✅ Light mode (couleurs fixes Google)
 * - ⚠️ Dark mode (couleurs fixes, pas de tokens) - Logo reste identique
 *
 * @example
 * ```tsx
 * // ✅ Dans Button OAuth (pattern recommandé)
 * <Button variant="outline" onClick={signInWithGoogle}>
 *   <GoogleIcon decorative className="mr-2" />
 *   Se connecter avec Google
 * </Button>
 *
 * // ✅ Bouton icon seul (label auto-géré)
 * <Button variant="ghost" size="icon" onClick={signInWithGoogle}>
 *   <GoogleIcon />
 * </Button>
 * // → Annoncé : "Se connecter avec Google"
 *
 * // ✅ Dans Form (decorative car label adjacent)
 * <form>
 *   <GoogleIcon decorative />
 *   <label>Authentification Google</label>
 * </form>
 * ```
 */
export interface GoogleIconProps {
	/** Classes Tailwind additionnelles */
	className?: string;
	/**
	 * Taille en pixels (défaut: 20)
	 * @default 20
	 * @minimum 16 - En dessous de 16px, détails logo illisibles
	 */
	size?: number;
	/**
	 * Label pour lecteurs d'écran (défaut: "Se connecter avec Google")
	 */
	ariaLabel?: string;
	/**
	 * Masquer aux lecteurs d'écran si l'icône est purement décorative
	 * Utiliser `true` si texte adjacent déjà descriptif
	 * @default false
	 */
	decorative?: boolean;
}

export const GoogleIcon = memo(function GoogleIcon({
	className = "",
	size = 20,
	ariaLabel = "Se connecter avec Google",
	decorative = false,
}: GoogleIconProps) {
	// Code défensif : fallback si props invalides
	const safeSize = Math.max(size, 16); // Minimum 16px pour détails visibles

	return (
		<svg
			width={safeSize}
			height={safeSize}
			viewBox="0 0 24 24"
			fill="none"
			className={className}
			xmlns="http://www.w3.org/2000/svg"
			role={decorative ? "presentation" : "img"}
			aria-label={decorative ? undefined : ariaLabel}
			aria-hidden={decorative ? "true" : undefined}
			data-testid="google-icon"
		>
			{!decorative && <title>{ariaLabel}</title>}

			{/* Logo Google authentique - Couleurs fixes (Google Brand Guidelines) */}
			{/* Partie bleue (haut-droite) */}
			<path
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
				fill="#4285F4"
			/>

			{/* Partie verte (bas-droite) */}
			<path
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
				fill="#34A853"
			/>

			{/* Partie jaune (bas-gauche) */}
			<path
				d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
				fill="#FBBC05"
			/>

			{/* Partie rouge (haut-gauche) */}
			<path
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
				fill="#EA4335"
			/>
		</svg>
	);
});

// Display name pour React DevTools et debugging
GoogleIcon.displayName = "GoogleIcon";
