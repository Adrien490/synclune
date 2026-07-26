"use client";

import { useRef, useState } from "react";

import { Heart } from "lucide-react";

import { HeartBurst } from "@/shared/components/animations/heart-burst";
import { triggerHaptic } from "@/shared/hooks/use-haptic";

/** ≈ durée de vie du burst (0.7s) — anti-spam au clic répété. */
const BURST_COOLDOWN_MS = 600;

/**
 * Easter egg discret : le petit cœur du sous-titre hero éclate en mini-cœurs
 * au clic (HeartBurst, mécanique calquée sur wishlist-button) + haptic léger.
 *
 * A11y : contrôle PUREMENT décoratif et redondant — le sens est déjà porté par
 * le `sr-only` « avec amour » adjacent dans hero-section.tsx. Le combo
 * `aria-hidden` + `tabIndex={-1}` le sort du tab order ET de l'arbre
 * d'accessibilité (un « bouton mystère » annoncé aux SR serait du bruit).
 * HeartBurst et triggerHaptic gèrent déjà prefers-reduced-motion.
 */
export function HeroHeartEasterEgg() {
	const [burstKey, setBurstKey] = useState(0);
	const lastBurstAt = useRef(0);

	function handleClick() {
		const now = Date.now();
		if (now - lastBurstAt.current < BURST_COOLDOWN_MS) return;
		lastBurstAt.current = now;
		setBurstKey((k) => k + 1);
		triggerHaptic("light");
	}

	return (
		<span className="relative inline-flex align-[-0.15em]">
			<button
				type="button"
				tabIndex={-1}
				aria-hidden="true"
				onClick={handleClick}
				className="cursor-pointer touch-manipulation motion-safe:transition-transform motion-safe:duration-[var(--duration-fast)] motion-safe:active:scale-90"
			>
				<Heart fill="currentColor" className="text-primary inline-block size-[1.1em]" />
			</button>
			{burstKey > 0 && <HeartBurst key={burstKey} seed={burstKey} scale={0.8} />}
		</span>
	);
}
