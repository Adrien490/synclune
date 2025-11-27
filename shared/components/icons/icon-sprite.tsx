/**
 * Sprite SVG centralisé pour icônes réutilisables
 *
 * Optimise le bundle size en évitant la duplication de code SVG.
 * Contient les icônes les plus utilisées (heart, cart, account, menu).
 *
 * @example
 * ```tsx
 * // Dans le layout racine
 * <body>
 *   <IconSprite />
 *   {children}
 * </body>
 * ```
 */
export function IconSprite() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			style={{ display: "none" }}
			aria-hidden="true"
		>
			<defs>
				{/* Gradient rose-doré réutilisable */}
				<linearGradient
					id="gradient-rose-gold"
					x1="0%"
					y1="0%"
					x2="100%"
					y2="100%"
				>
					<stop offset="0%" stopColor="var(--primary)" />
					<stop offset="100%" stopColor="var(--secondary)" />
				</linearGradient>

				{/* Icône Cœur - Outline */}
				<symbol id="icon-heart-outline" viewBox="0 0 24 24">
					<path
						d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
						fill="none"
						stroke="var(--primary)"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</symbol>

				{/* Icône Cœur - Filled */}
				<symbol id="icon-heart-filled" viewBox="0 0 24 24">
					<path
						d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
						fill="var(--primary)"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</symbol>

				{/* Icône Panier - Outline */}
				<symbol id="icon-cart-outline" viewBox="0 0 24 24">
					<path
						d="M3.5 7c0-.5.4-1 1-1h1.2c.3 0 .6.2.7.5l.6 1.5h11c.8 0 1.4.9 1.2 1.7l-1.5 6c-.1.4-.5.8-1 .8H8.2c-.4 0-.8-.3-.9-.7L5.8 9.5H4.5c-.6 0-1-.4-1-1z"
						fill="none"
						stroke="var(--primary)"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<circle cx="9" cy="19.5" r="1.5" fill="var(--secondary)" />
					<circle cx="16" cy="19.5" r="1.5" fill="var(--secondary)" />
					<path
						d="M8 7V5.5c0-2.5 2-4.5 4.5-4.5S17 3 17 5.5V7"
						stroke="var(--primary)"
						strokeWidth="1.5"
						strokeLinecap="round"
						fill="none"
					/>
				</symbol>

				{/* Icône Panier - Filled */}
				<symbol id="icon-cart-filled" viewBox="0 0 24 24">
					<path
						d="M3.5 7c0-.5.4-1 1-1h1.2c.3 0 .6.2.7.5l.6 1.5h11c.8 0 1.4.9 1.2 1.7l-1.5 6c-.1.4-.5.8-1 .8H8.2c-.4 0-.8-.3-.9-.7L5.8 9.5H4.5c-.6 0-1-.4-1-1z"
						fill="var(--primary)"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<circle cx="9" cy="19.5" r="1.5" fill="var(--secondary)" />
					<circle cx="16" cy="19.5" r="1.5" fill="var(--secondary)" />
					<path
						d="M8 7V5.5c0-2.5 2-4.5 4.5-4.5S17 3 17 5.5V7"
						stroke="var(--primary)"
						strokeWidth="1.5"
						strokeLinecap="round"
						fill="none"
					/>
				</symbol>

				{/* Icône Compte */}
				<symbol id="icon-account" viewBox="0 0 24 24">
					<circle
						cx="12"
						cy="8"
						r="4"
						fill="none"
						stroke="var(--primary)"
						strokeWidth="1.5"
					/>
					<path
						d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"
						fill="none"
						stroke="var(--primary)"
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
				</symbol>

				{/* Icône Menu */}
				<symbol id="icon-menu" viewBox="0 0 24 24">
					<path
						d="M3 6h18M3 12h18M3 18h18"
						stroke="var(--primary)"
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
				</symbol>
			</defs>
		</svg>
	);
}

/**
 * Composant pour utiliser une icône du sprite avec variants
 *
 * @example
 * ```tsx
 * // Icône heart outline
 * <SpriteIcon name="heart" variant="outline" size={24} />
 *
 * // Icône cart filled avec label
 * <SpriteIcon
 *   name="cart"
 *   variant="filled"
 *   ariaLabel="Mon panier"
 * />
 * ```
 */
interface UseIconProps {
	/** Nom de l'icône (heart, cart, account, menu) */
	name: "heart" | "cart" | "account" | "menu";
	/** Taille en pixels (défaut: 24) */
	size?: number;
	/** Classes Tailwind additionnelles */
	className?: string;
	/** Label pour lecteurs d'écran */
	ariaLabel?: string;
	/** Variant de l'icône (outline ou filled, si disponible) */
	variant?: "outline" | "filled";
}

export function SpriteIcon({
	name,
	size = 24,
	className = "",
	ariaLabel,
	variant = "outline",
}: UseIconProps) {
	// Icônes avec variants disponibles
	const iconWithVariants = ["heart", "cart"];
	const hasVariant = iconWithVariants.includes(name);

	// Construire l'ID du symbole
	const symbolId = hasVariant ? `icon-${name}-${variant}` : `icon-${name}`;

	return (
		<svg
			width={size}
			height={size}
			className={className}
			role={ariaLabel ? "img" : undefined}
			aria-label={ariaLabel}
		>
			{ariaLabel && <title>{ariaLabel}</title>}
			<use href={`#${symbolId}`} />
		</svg>
	);
}
