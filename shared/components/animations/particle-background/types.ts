import type { MotionValue, TargetAndTransition } from "motion/react";

/** Formes des particules */
export type ParticleShape =
	| "circle"
	| "diamond"
	| "heart"
	| "crescent"
	| "pearl"
	| "drop"
	| "sparkle-4";

/** Styles d'animation */
export type AnimationStyle = "float" | "drift" | "rise" | "orbit" | "breathe" | "sparkle";

/** Props du composant ParticleBackground */
export interface ParticleBackgroundProps {
	/** Nombre de particules (défaut: 6, mobile: divisé par 2) */
	count?: number;
	/** Taille min/max en pixels (défaut: [8, 64]) */
	size?: [number, number];
	/** Opacité min/max (défaut: [0.1, 0.4]) */
	opacity?: [number, number];
	/** Couleurs CSS des particules */
	colors?: string[];
	/** Blur min/max en pixels pour effet de profondeur (défaut: [12, 32]) */
	blur?: number | [number, number];
	/** Forme(s) des particules - une forme ou un tableau pour mixer (défaut: "circle") */
	shape?: ParticleShape | ParticleShape[];
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
	/** Fade progressif des particules au scroll au lieu du on/off binaire (défaut: false) */
	scrollFade?: boolean;
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
	/** Mouse position as pixel offset for parallax, range ±PARALLAX_STRENGTH (desktop only) */
	mouseX?: MotionValue<number>;
	mouseY?: MotionValue<number>;
	/** High contrast mode: reduce opacity 50%, increase blur 50% */
	highContrast?: boolean;
	/** Scroll-linked opacity (0-1) for progressive fade. When provided, multiplies particle opacity. */
	scrollOpacity?: MotionValue<number>;
}

/** Type pour les presets d'animation */
export type AnimationPreset = (p: Particle) => TargetAndTransition;
