// Main component
export { ParticleSystem } from "./particle-system";

// Presets
export { PARTICLE_PRESETS } from "./constants";

// Types
export type {
	AnimationStyle,
	Particle,
	ParticleShape,
	ParticleSystemProps,
} from "./types";

// Utils (for testing or advanced usage)
export { generateParticles, seededRandom } from "./utils";
