import type { TargetAndTransition } from "motion/react";

/** Formes des particules */
export type ParticleShape = "circle" | "diamond" | "heart" | "pearl" | "drop";

/** Styles d'animation */
export type AnimationStyle = "float" | "drift" | "breathe";

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
	 * Graine de génération : deux instances avec les mêmes params mais des `seed` différents
	 * produisent des layouts différents (défaut: 0). À utiliser quand deux pages/sections
	 * partagent les mêmes props pour éviter des positions strictement identiques.
	 */
	seed?: number;
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
	{ type: "css"; styles: React.CSSProperties } | { type: "clipPath"; clipPath: string };

/** Props du sous-composant ParticleSet */
export interface ParticleSetProps {
	particles: Particle[];
	isInView: boolean;
	reducedMotion: boolean | null;
	animationStyle: AnimationStyle;
	/** High contrast mode: reduce opacity 50%, increase blur 50% */
	highContrast?: boolean;
	/** Radial-gradient fill for CSS/clipPath shapes (adds volume/depth) */
	gradient?: boolean;
}

/** Type pour les presets d'animation */
export type AnimationPreset = (p: Particle) => TargetAndTransition;
