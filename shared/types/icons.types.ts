/**
 * Props pour StarIcon (etoile avec remplissage partiel)
 */
export interface StarIconProps {
	fillPercentage: number;
	size: "sm" | "md" | "lg";
	gradientId: string;
}

/**
 * Props pour HeartIcon (favoris/wishlist)
 */
export interface HeartIconProps {
	/** Classes Tailwind additionnelles */
	className?: string;
	/**
	 * Taille en pixels (defaut: 24)
	 * @default 24
	 * @minimum 16 - En dessous de 16px, sparkles dores invisibles
	 */
	size?: number;
	/**
	 * Label pour lecteurs d'ecran
	 * Par defaut, change automatiquement selon variant :
	 * - outline : "Ajouter aux favoris"
	 * - filled : "Retirer des favoris"
	 */
	ariaLabel?: string;
	/**
	 * Style visuel de l'icone
	 * - `outline` : Non favori (defaut)
	 * - `filled` : Favori ajoute (avec sparkles dores)
	 * @default "outline"
	 */
	variant?: "outline" | "filled";
	/**
	 * Masquer aux lecteurs d'ecran si l'icone est purement decorative
	 * Utiliser `true` si texte adjacent deja descriptif
	 * @default false
	 */
	decorative?: boolean;
}

/**
 * Props pour GoogleIcon (logo Google couleur)
 */
export interface GoogleIconProps {
	/** Classes Tailwind additionnelles */
	className?: string;
	/**
	 * Taille en pixels (defaut: 24)
	 * @default 24
	 */
	size?: number;
	/**
	 * Label pour lecteurs d'ecran
	 */
	ariaLabel?: string;
	/**
	 * Masquer aux lecteurs d'ecran si l'icone est purement decorative
	 * @default false
	 */
	decorative?: boolean;
}

/**
 * Props pour TikTokIcon (logo TikTok minimaliste)
 */
export interface TikTokIconProps {
	/** Classes Tailwind additionnelles */
	className?: string;
	/**
	 * Taille en pixels (defaut: 24)
	 * @default 24
	 */
	size?: number;
	/**
	 * Label pour lecteurs d'ecran (defaut: "Suivre sur TikTok")
	 */
	ariaLabel?: string;
	/**
	 * Masquer aux lecteurs d'ecran si l'icone est purement decorative
	 * @default false
	 */
	decorative?: boolean;
}

/**
 * Props pour InstagramIcon (logo Instagram minimaliste)
 */
export interface InstagramIconProps {
	/** Classes Tailwind additionnelles */
	className?: string;
	/**
	 * Taille en pixels (defaut: 24)
	 * @default 24
	 */
	size?: number;
	/**
	 * Label pour lecteurs d'ecran (defaut: "Suivre sur Instagram")
	 */
	ariaLabel?: string;
	/**
	 * Masquer aux lecteurs d'ecran si l'icone est purement decorative
	 * @default false
	 */
	decorative?: boolean;
}
