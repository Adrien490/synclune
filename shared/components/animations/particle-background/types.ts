import type { MotionValue, TargetAndTransition } from "motion/react";

/** Formes des particules */
export type ParticleShape =
	| "circle"
	| "diamond"
	| "heart"
	| "crescent"
	| "pearl"
	| "drop"
	| "sparkle-4"
	| "star"
	| "hexagon";

/** Styles d'animation */
export type AnimationStyle =
	| "float"
	| "drift"
	| "rise"
	| "orbit"
	| "breathe"
	| "sparkle"
	| "cascade"
	| "twinkle";

/** Props du composant ParticleBackground */
export interface ParticleBackgroundProps {
	/** Nombre de particules (défaut: 6 ; sur mobile: ceil(count * mobileCountRatio), défaut ratio 0.5) */
	count?: number;
	/** Taille min/max en pixels (défaut: [8, 64]) */
	size?: [number, number];
	/** Opacité min/max (défaut: [0.1, 0.4]) */
	opacity?: [number, number];
	/** Couleurs CSS des particules */
	colors?: string[];
	/**
	 * Blur en pixels pour effet de profondeur (défaut: [12, 32]).
	 * Accepte un scalaire (blur uniforme) ou un tuple [min, max] (blur corrélé inversement à la taille :
	 * les grosses particules sont nettes, les petites sont floues).
	 * Contrairement à size/opacity qui n'acceptent que des tuples, le scalaire permet un shortcut
	 * quand toutes les particules doivent avoir le même blur.
	 */
	blur?: number | [number, number];
	/** Forme(s) des particules - une forme ou un tableau pour mixer (défaut: "circle") */
	shape?: ParticleShape | readonly ParticleShape[];
	/** Classes additionnelles */
	className?: string;
	/** Style d'animation (défaut: "float") */
	animationStyle?: AnimationStyle;
	/** Activer le parallax (particules floues bougent plus lentement) (défaut: true) */
	depthParallax?: boolean;
	/** Multiplicateur de vitesse d'animation (défaut: 1, plus bas = plus lent) */
	speed?: number;
	/** Désactiver sur appareils tactiles - rend null (défaut: false) */
	disableOnTouch?: boolean;
	/**
	 * Fade progressif des particules au scroll au lieu du on/off binaire (défaut: false).
	 * ⚠️ Nécessite un conteneur dans le flux de scroll : sans effet si le conteneur est `fixed`.
	 */
	scrollFade?: boolean;
	/**
	 * Parallax scroll vertical proportionnel à la profondeur (défaut: false).
	 * ⚠️ Nécessite un conteneur dans le flux de scroll : sans effet si le conteneur est `fixed`.
	 */
	scrollParallax?: boolean;
	/**
	 * Ratio du nombre de particules sur mobile par rapport au desktop.
	 * Défaut: 0.5 (count/2). Clamp à [0.25, 1].
	 */
	mobileCountRatio?: number;
	/**
	 * Adaptativité hardware : réduit automatiquement le nombre de particules et le blur
	 * sur appareils contraints (deviceMemory/cœurs faibles, Save-Data / prefers-reduced-data).
	 * Défaut: true. Mettre `false` pour forcer le rendu complet.
	 */
	adaptive?: boolean;
	/** Remplissage radial dégradé des particules (volume/profondeur) (défaut: false) */
	gradient?: boolean;
	/**
	 * Mode constellation : trace des lignes entre particules proches (effet réseau).
	 * Desktop uniquement, désactivé en reduced-motion. Le nombre de particules est plafonné
	 * (≤12) quand activé, car le calcul des liens est en O(n²).
	 * - `maxDistance` : distance max entre 2 particules pour les relier, en % du conteneur (défaut: 25)
	 * - `color` : couleur CSS des lignes (défaut: var(--color-particle-lavender))
	 */
	connect?: { maxDistance?: number; color?: string };
	/**
	 * Densité automatique : dérive le nombre de particules de l'aire du conteneur
	 * (particules par mégapixel). Prioritaire sur `count` quand défini. Clamp à MAX_PARTICLES.
	 */
	density?: number;
}

/** Données d'une particule générée */
export interface Particle {
	id: number;
	size: number;
	opacity: number;
	x: number;
	y: number;
	color: string;
	duration: number;
	delay: number;
	blur: number;
	/** Facteur de profondeur 0-1 (0=proche, 1=loin) pour parallax */
	depthFactor: number;
	/** Forme de cette particule (pour support multi-formes) */
	shape: ParticleShape;
}

/** Type de configuration de forme */
export type ShapeConfig =
	| { type: "css"; styles: React.CSSProperties }
	| { type: "clipPath"; clipPath: string }
	| { type: "svg"; viewBox: string; path: string; fillRule?: "evenodd" | "nonzero" };

/** Props du sous-composant ParticleSet */
export interface ParticleSetProps {
	particles: Particle[];
	isInView: boolean;
	reducedMotion: boolean | null;
	animationStyle: AnimationStyle;
	/** High contrast mode: reduce opacity 50%, increase blur 50% */
	highContrast?: boolean;
	/** Scroll-linked opacity (0-1) for progressive fade. When provided, multiplies particle opacity. */
	scrollOpacity?: MotionValue<number>;
	/** Scroll progress (0-1) for depth-based scroll parallax */
	scrollYProgress?: MotionValue<number>;
	/** Whether scroll parallax is active (controls computation, not just MotionValue presence) */
	scrollParallax?: boolean;
	/** Radial-gradient fill for CSS/clipPath shapes (adds volume/depth) */
	gradient?: boolean;
}

/** Type pour les presets d'animation */
export type AnimationPreset = (p: Particle) => TargetAndTransition;
