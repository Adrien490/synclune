"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import {
	FLY_HEART_EVENT,
	WISHLIST_BADGE_DATA_ATTR,
	type FlyHeartEventDetail,
} from "@/shared/components/animations/fly-heart-to-badge.constants";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";

interface FlyingHeart {
	id: number;
	from: { top: number; left: number; width: number; height: number };
	to: { top: number; left: number };
}

const HEART_SIZE = 16;
const MAX_CONCURRENT_HEARTS = 4;

/**
 * Layer global qui anime un mini-heart depuis le bouton wishlist déclencheur
 * vers le badge `<WishlistBadge data-wishlist-badge />` dans la navbar.
 *
 * Monté une seule fois (ex. dans `app/(shop)/layout.tsx`). Écoute l'event
 * `FLY_HEART_EVENT` dispatché par `useWishlistToggle` au moment de l'add.
 *
 * Comportement :
 * - Animation discrète : 400 ms en arc (offset Y vers le haut), fade dernière 100 ms.
 * - No-op si `prefers-reduced-motion` ou si le badge cible n'est pas trouvé.
 * - Plafond `MAX_CONCURRENT_HEARTS` pour éviter la sur-anim sur clics rapides.
 *
 * @example
 * ```tsx
 * // app/(shop)/layout.tsx
 * <FlyHeartToBadgeLayer />
 * ```
 */
export function FlyHeartToBadgeLayer() {
	const prefersReducedMotion = useReducedMotion();
	const [hearts, setHearts] = useState<FlyingHeart[]>([]);

	useEffect(() => {
		if (prefersReducedMotion) return;

		const handler = (event: Event) => {
			const customEvent = event as CustomEvent<FlyHeartEventDetail>;
			const detail = customEvent.detail;

			const badge = document.querySelector<HTMLElement>(`[${WISHLIST_BADGE_DATA_ATTR}]`);
			if (!badge) return;

			const badgeRect = badge.getBoundingClientRect();
			if (badgeRect.width === 0 || badgeRect.height === 0) return;

			const heart: FlyingHeart = {
				id: Date.now() + Math.random(),
				from: detail.fromRect,
				to: {
					top: badgeRect.top + badgeRect.height / 2,
					left: badgeRect.left + badgeRect.width / 2,
				},
			};

			setHearts((prev) => {
				const next = [...prev, heart];
				return next.length > MAX_CONCURRENT_HEARTS ? next.slice(-MAX_CONCURRENT_HEARTS) : next;
			});
		};

		window.addEventListener(FLY_HEART_EVENT, handler);
		return () => window.removeEventListener(FLY_HEART_EVENT, handler);
	}, [prefersReducedMotion]);

	if (prefersReducedMotion) return null;

	return (
		<div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60]">
			<AnimatePresence>
				{hearts.map((heart) => {
					const startX = heart.from.left + heart.from.width / 2 - HEART_SIZE / 2;
					const startY = heart.from.top + heart.from.height / 2 - HEART_SIZE / 2;
					const endX = heart.to.left - HEART_SIZE / 2;
					const endY = heart.to.top - HEART_SIZE / 2;
					// Arc : monter légèrement avant d'atteindre la cible (poétique).
					const midY = Math.min(startY, endY) - 40;

					return (
						<m.svg
							key={heart.id}
							width={HEART_SIZE}
							height={HEART_SIZE}
							viewBox="0 0 24 24"
							fill="var(--primary)"
							className="absolute drop-shadow-[0_2px_4px_color-mix(in_oklab,var(--primary)_40%,transparent)]"
							style={{ top: 0, left: 0 }}
							initial={{ x: startX, y: startY, scale: 1, opacity: 1 }}
							animate={{
								x: [startX, (startX + endX) / 2, endX],
								y: [startY, midY, endY],
								scale: [1, 1.05, 0.5],
								opacity: [1, 1, 0],
							}}
							exit={{ opacity: 0 }}
							transition={{
								duration: 0.4,
								ease: MOTION_CONFIG.easing.easeOut,
								times: [0, 0.6, 1],
							}}
							onAnimationComplete={() => {
								setHearts((prev) => prev.filter((h) => h.id !== heart.id));
							}}
						>
							<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
						</m.svg>
					);
				})}
			</AnimatePresence>
		</div>
	);
}
