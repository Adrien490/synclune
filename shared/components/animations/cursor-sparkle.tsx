"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Sparkle {
	id: number;
	x: number;
	y: number;
	size: number;
	opacity: number;
	rotation: number;
}

/**
 * Trail de sparkles qui suit le curseur.
 * Effet magique/girly pour renforcer l'identité de marque.
 *
 * @example
 * ```tsx
 * // Dans layout.tsx
 * <CursorSparkle />
 * ```
 */
export function CursorSparkle() {
	const [sparkles, setSparkles] = useState<Sparkle[]>([]);
	const [mounted, setMounted] = useState(false);
	const [isTouch, setIsTouch] = useState(false);

	useEffect(() => {
		setMounted(true);

		// Détecter si c'est un appareil tactile
		const checkTouch = () => {
			setIsTouch(window.matchMedia("(hover: none)").matches);
		};
		checkTouch();
		window.addEventListener("resize", checkTouch);

		return () => window.removeEventListener("resize", checkTouch);
	}, []);

	useEffect(() => {
		if (!mounted || isTouch) return;

		// Vérifier prefers-reduced-motion
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			return;
		}

		let sparkleId = 0;
		let lastX = 0;
		let lastY = 0;
		let throttle = 0;

		const handleMouseMove = (e: MouseEvent) => {
			// Throttle pour performance
			const now = Date.now();
			if (now - throttle < 50) return;
			throttle = now;

			// Ne pas créer si le mouvement est trop petit
			const distance = Math.hypot(e.clientX - lastX, e.clientY - lastY);
			if (distance < 20) return;

			lastX = e.clientX;
			lastY = e.clientY;

			// Créer un nouveau sparkle
			const newSparkle: Sparkle = {
				id: sparkleId++,
				x: e.clientX,
				y: e.clientY,
				size: 8 + Math.random() * 8,
				opacity: 0.6 + Math.random() * 0.4,
				rotation: Math.random() * 360,
			};

			setSparkles(prev => [...prev.slice(-8), newSparkle]); // Garder max 8 sparkles

			// Supprimer après animation
			setTimeout(() => {
				setSparkles(prev => prev.filter(s => s.id !== newSparkle.id));
			}, 600);
		};

		window.addEventListener("mousemove", handleMouseMove, { passive: true });

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
		};
	}, [mounted, isTouch]);

	if (!mounted || isTouch || sparkles.length === 0) return null;

	return createPortal(
		<div className="fixed inset-0 pointer-events-none z-[9998]" aria-hidden="true">
			{sparkles.map((sparkle) => (
				<div
					key={sparkle.id}
					className="absolute animate-[sparkle-fade_0.6s_ease-out_forwards]"
					style={{
						left: sparkle.x,
						top: sparkle.y,
						transform: `translate(-50%, -50%) rotate(${sparkle.rotation}deg)`,
					}}
				>
					<svg
						width={sparkle.size}
						height={sparkle.size}
						viewBox="0 0 24 24"
						fill="none"
						style={{ opacity: sparkle.opacity }}
					>
						<path
							d="M12 2L13.09 8.26L18 6L14.74 11.09L21 12L14.74 12.91L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 12.91L3 12L9.26 11.09L6 6L10.91 8.26L12 2Z"
							fill="oklch(0.85 0.12 350)"
							className="drop-shadow-[0_0_4px_oklch(0.85_0.12_350/0.5)]"
						/>
					</svg>
				</div>
			))}
		</div>,
		document.body
	);
}
