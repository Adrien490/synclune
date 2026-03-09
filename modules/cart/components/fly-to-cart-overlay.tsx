"use client";

import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import {
	CART_TARGET_ATTR,
	FLY_TO_CART_EVENT,
	type FlyToCartDetail,
} from "@/modules/cart/lib/fly-to-cart";
import { m, AnimatePresence, useReducedMotion } from "motion/react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { useMounted } from "@/shared/hooks/use-mounted";

interface FlyDot {
	id: number;
	from: { x: number; y: number };
	to: { x: number; y: number };
}

/**
 * Global overlay that listens for fly-to-cart events and renders
 * animated dots flying from the source button to the cart icon.
 *
 * Mount once in the provider tree. Respects prefers-reduced-motion.
 */
export function FlyToCartOverlay() {
	const [dots, setDots] = useState<FlyDot[]>([]);
	const prefersReducedMotion = useReducedMotion();
	const mounted = useMounted();
	const dotIdRef = useRef(0);

	useEffect(() => {
		function handleFlyToCart(e: Event) {
			const { fromX, fromY } = (e as CustomEvent<FlyToCartDetail>).detail;

			const target = document.querySelector(`[${CART_TARGET_ATTR}]`);
			if (!target) return;
			const targetRect = target.getBoundingClientRect();

			dotIdRef.current += 1;
			const id = dotIdRef.current;
			setDots((prev) => [
				...prev,
				{
					id,
					from: { x: fromX, y: fromY },
					to: {
						x: targetRect.left + targetRect.width / 2,
						y: targetRect.top + targetRect.height / 2,
					},
				},
			]);
		}

		window.addEventListener(FLY_TO_CART_EVENT, handleFlyToCart);
		return () => window.removeEventListener(FLY_TO_CART_EVENT, handleFlyToCart);
	}, []);

	if (!mounted || prefersReducedMotion) return null;

	return createPortal(
		<AnimatePresence>
			{dots.map((dot) => (
				<FlyDotComponent
					key={dot.id}
					from={dot.from}
					to={dot.to}
					onComplete={() => setDots((prev) => prev.filter((d) => d.id !== dot.id))}
				/>
			))}
		</AnimatePresence>,
		document.body,
	);
}

// Dot radius for centering (size-3 = 12px, radius = 6px)
const DOT_RADIUS = 6;

function FlyDotComponent({
	from,
	to,
	onComplete,
}: {
	from: { x: number; y: number };
	to: { x: number; y: number };
	onComplete: () => void;
}) {
	// Curved midpoint — arc above the shortest path
	const midX = (from.x + to.x) / 2 - 50;
	const midY = Math.min(from.y, to.y) - 80;

	return (
		<m.div
			className="bg-primary shadow-primary/50 pointer-events-none fixed z-[9999] size-3 rounded-full shadow-lg"
			initial={{
				x: from.x - DOT_RADIUS,
				y: from.y - DOT_RADIUS,
				scale: 1,
				opacity: 1,
			}}
			animate={{
				x: [from.x - DOT_RADIUS, midX - DOT_RADIUS, to.x - DOT_RADIUS],
				y: [from.y - DOT_RADIUS, midY - DOT_RADIUS, to.y - DOT_RADIUS],
				scale: [1, 1.2, 0.5],
				opacity: [1, 1, 0],
			}}
			transition={{
				duration: 0.6,
				ease: MOTION_CONFIG.easing.easeInOut,
				times: [0, 0.5, 1],
			}}
			exit={{ opacity: 0 }}
			onAnimationComplete={onComplete}
		/>
	);
}
