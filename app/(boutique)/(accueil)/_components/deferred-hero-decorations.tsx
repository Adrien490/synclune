"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ParticleSystem = dynamic(
	() =>
		import("@/shared/components/animations/particle-system").then(
			(m) => m.ParticleSystem
		),
	{ ssr: false }
);

const GlitterSparkles = dynamic(
	() =>
		import("@/shared/components/animations/glitter-sparkles").then(
			(m) => m.GlitterSparkles
		),
	{ ssr: false }
);

/**
 * Décore la section Hero avec des particules et paillettes.
 * Chargement différé après le First Contentful Paint pour améliorer le FCP.
 * Utilise requestIdleCallback pour s'exécuter pendant les temps morts du navigateur.
 */
export function DeferredHeroDecorations() {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		// Attendre après le premier paint pour charger les animations
		if ("requestIdleCallback" in window) {
			const id = requestIdleCallback(() => setMounted(true), { timeout: 500 });
			return () => cancelIdleCallback(id);
		}
		// Fallback pour Safari (pas de requestIdleCallback)
		const timeout = setTimeout(() => setMounted(true), 100);
		return () => clearTimeout(timeout);
	}, []);

	if (!mounted) return null;

	return (
		<>
			{/* Couche 1: Particules décoratives - Multi-formes bijoux */}
			<ParticleSystem
				count={12}
				shape={["diamond", "crescent", "circle", "heart"]}
				colors={["var(--secondary)", "oklch(0.9 0.1 80)", "var(--primary)"]}
				opacity={[0.2, 0.45]}
				blur={[6, 24]}
				size={[25, 70]}
			/>

			{/* Couche 2: Glitter Sparkles (overlay scintillant) */}
			<GlitterSparkles sizeRange={[2, 4]} glowIntensity={0.4} />
		</>
	);
}
