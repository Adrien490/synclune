// Main component
export { ParticleSystem } from "./particle-system";

// Constants (pour usage avance)
export { SHAPE_CONFIGS, ANIMATION_PRESETS } from "./constants";

// Types
export type {
	AnimationStyle,
	Particle,
	ParticleShape,
	ParticleSystemProps,
	ShapeConfig,
} from "./types";

// Utils (for testing or advanced usage)
export {
	generateParticles,
	seededRandom,
	getShapeStyles,
	getSvgConfig,
	isSvgShape,
	getMultiLayerGlow,
} from "./utils";
