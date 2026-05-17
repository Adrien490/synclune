import { ParticleBackground } from "./particle-background";
import type { ParticleBackgroundProps, ParticleShape } from "./types";

/** Triplet de formes utilise sur les pages d'erreur "riches" (404 racine + shop error). */
export const RICH_ERROR_SHAPES = [
	"heart",
	"diamond",
	"circle",
] as const satisfies readonly ParticleShape[];

/** Props acceptees par ParticleBackgroundError : tout sauf les tokens visuels verrouilles par le preset. */
type ParticleBackgroundErrorProps = Omit<
	ParticleBackgroundProps,
	"animationStyle" | "opacity" | "blur"
>;

/**
 * Preset pour les pages d'erreur et 404.
 * Tonalite discrete, formes douces, animation "drift" lente.
 *
 * Verrouille `animationStyle`, `opacity` et `blur` pour garantir une coherence visuelle
 * sur toutes les pages d'erreur. Tous les autres props restent surchargeables.
 *
 * @example
 * // 404 globale (count 8, formes riches)
 * <ParticleBackgroundError count={8} shape={["heart", "diamond", "circle"]} />
 *
 * @example
 * // Page erreur generique (defaut : count 6, formes sobres)
 * <ParticleBackgroundError />
 */
export function ParticleBackgroundError({
	count = 6,
	shape = ["diamond", "circle"],
	...rest
}: ParticleBackgroundErrorProps) {
	return (
		<ParticleBackground
			count={count}
			shape={shape}
			animationStyle="drift"
			opacity={[0.15, 0.35]}
			blur={[8, 24]}
			{...rest}
		/>
	);
}
