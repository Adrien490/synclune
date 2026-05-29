"use client";

import type { Particle } from "./types";

/** Nombre maximum de particules reliées (le calcul des liens est en O(n²)) */
export const MAX_CONNECT_PARTICLES = 12;

/** Opacité maximale d'une ligne (proche), s'atténue avec la distance */
const MAX_LINE_OPACITY = 0.3;

interface ParticleConnectionsProps {
	particles: Particle[];
	/** Distance max entre 2 particules pour les relier, en % du conteneur (0-100) */
	maxDistance: number;
	/** Couleur CSS des lignes */
	color: string;
}

/**
 * Overlay SVG « constellation » : relie par des lignes les particules dont la distance
 * (en pourcentage du conteneur) est inférieure à `maxDistance`. L'opacité décroît avec
 * la distance. Les lignes sont tracées sur les positions de base des particules.
 *
 * Rendu unique (un seul `<svg>`), `viewBox` 0-100 mappé sur le conteneur via
 * `preserveAspectRatio="none"`. Décoratif → `aria-hidden`.
 */
export function ParticleConnections({ particles, maxDistance, color }: ParticleConnectionsProps) {
	const lines: { x1: number; y1: number; x2: number; y2: number; opacity: number }[] = [];

	for (let i = 0; i < particles.length; i++) {
		for (let j = i + 1; j < particles.length; j++) {
			const a = particles[i]!;
			const b = particles[j]!;
			const dx = a.x - b.x;
			const dy = a.y - b.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist <= maxDistance) {
				lines.push({
					x1: a.x,
					y1: a.y,
					x2: b.x,
					y2: b.y,
					opacity: (1 - dist / maxDistance) * MAX_LINE_OPACITY,
				});
			}
		}
	}

	return (
		<svg
			className="absolute inset-0 h-full w-full"
			viewBox="0 0 100 100"
			preserveAspectRatio="none"
			aria-hidden="true"
			role="presentation"
		>
			{lines.map((l, idx) => (
				<line
					// Lines are positional & order-stable for a given particle set
					key={`${l.x1}-${l.y1}-${l.x2}-${l.y2}-${idx}`}
					x1={l.x1}
					y1={l.y1}
					x2={l.x2}
					y2={l.y2}
					stroke={color}
					strokeWidth={1}
					strokeOpacity={l.opacity}
					vectorEffect="non-scaling-stroke"
				/>
			))}
		</svg>
	);
}
