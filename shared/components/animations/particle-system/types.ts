import type { TargetAndTransition } from "framer-motion";

/** Formes des particules */
export type ParticleShape =
	| "circle"
	| "diamond"
	| "soft-square"
	| "star"
	| "hexagon"
	| "ring"
	| "heart"
	| "crescent";

/** Styles d'animation */
export type AnimationStyle = "float" | "twinkle" | "drift" | "pulse";

/** Props du composant ParticleSystem */
export interface ParticleSystemProps {
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
	/** Durée de l'animation en secondes (défaut: 20) */
	duration?: number;
	/** Forme des particules (défaut: "circle") */
	shape?: ParticleShape;
	/** Classes additionnelles */
	className?: string;
	/** Style d'animation (défaut: "float") */
	animationStyle?: AnimationStyle;
	/** Activer la rotation des particules (défaut: false) */
	rotation?: boolean;
	/** Intensité globale de l'animation 0.5-2 (défaut: 1) */
	intensity?: number;
	/** Activer l'effet de glow/lueur - desktop uniquement (défaut: false) */
	glow?: boolean;
	/** Intensité du glow 0-1 (défaut: 0.5) */
	glowIntensity?: number;
	/** Utiliser la physique spring pour un mouvement naturel (défaut: false) */
	springPhysics?: boolean;
	/** Activer le parallax (particules floues bougent plus lentement) (défaut: true) */
	depthParallax?: boolean;
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
}

/** Type de configuration de forme */
export type ShapeConfig =
	| { type: "css"; styles: React.CSSProperties }
	| { type: "clipPath"; clipPath: string }
	| { type: "ring" };

/** Props du sous-composant ParticleSet */
export interface ParticleSetProps {
	particles: Particle[];
	shape: ParticleShape;
	isInView: boolean;
	reducedMotion: boolean | null;
	animationStyle: AnimationStyle;
	rotation: boolean;
	intensity: number;
	glow: boolean;
	glowIntensity: number;
	springPhysics: boolean;
}

/** Type pour les presets d'animation */
export type AnimationPreset = (
	p: Particle,
	intensity: number,
	rotation: boolean
) => TargetAndTransition;
