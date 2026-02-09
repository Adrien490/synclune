/** Deterministic pseudo-random generator (seeded) */
export function seededRandom(seed: number): number {
	const x = Math.sin(seed) * 10000;
	return x - Math.floor(x);
}
