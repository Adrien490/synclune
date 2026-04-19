"use client";

import { useRef, useState } from "react";
import { Heart, Share2, Eye } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";

import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

const LONG_PRESS_DELAY = 500;
const LONG_PRESS_MOVE_TOLERANCE = 10;

interface ProductCardLongPressProps {
	productTitle: string;
	productUrl: string;
	onWishlist?: () => void;
	onShare?: () => void;
	children: React.ReactNode;
}

/**
 * Client wrapper adding a long-press quick-action overlay on a product card.
 *
 * - 500ms hold → haptic feedback + reveal action menu (Favoris, Partager, Voir)
 * - Dismissed on tap outside or after action
 * - Visual press feedback via scale + shadow
 * - Respects prefers-reduced-motion
 */
export function ProductCardLongPress({
	productTitle,
	productUrl,
	onWishlist,
	onShare,
	children,
}: ProductCardLongPressProps) {
	const [isOpen, setIsOpen] = useState(false);
	const haptic = useHaptic();
	const prefersReducedMotion = useReducedMotion();

	const [isPressing, setIsPressing] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
	const startPosRef = useRef<{ x: number; y: number } | null>(null);
	const didLongPressRef = useRef(false);
	const onLongPressRef = useRef<() => void>(() => {});

	// Keep ref in sync with the latest callback without triggering re-renders
	// eslint-disable-next-line react-hooks/refs -- intentional ref write during render to keep callback in sync (standard React pattern)
	onLongPressRef.current = () => {
		haptic("medium");
		setIsOpen(true);
	};

	function clearLongPress() {
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = null;
		setIsPressing(false);
	}

	function handleTouchStart(e: React.TouchEvent) {
		const touch = e.touches[0];
		if (!touch) return;

		startPosRef.current = { x: touch.clientX, y: touch.clientY };
		didLongPressRef.current = false;
		setIsPressing(true);

		timerRef.current = setTimeout(() => {
			didLongPressRef.current = true;
			setIsPressing(false);
			onLongPressRef.current();
		}, LONG_PRESS_DELAY);
	}

	function handleTouchMove(e: React.TouchEvent) {
		if (!startPosRef.current || !timerRef.current) return;

		const touch = e.touches[0];
		if (!touch) return;

		const dx = Math.abs(touch.clientX - startPosRef.current.x);
		const dy = Math.abs(touch.clientY - startPosRef.current.y);

		if (dx > LONG_PRESS_MOVE_TOLERANCE || dy > LONG_PRESS_MOVE_TOLERANCE) {
			clearLongPress();
		}
	}

	function handleTouchEnd() {
		clearLongPress();
	}

	function handleLongPressClick(e: React.MouseEvent) {
		if (didLongPressRef.current) {
			e.preventDefault();
			e.stopPropagation();
			didLongPressRef.current = false;
		}
	}

	const handleShare = async () => {
		setIsOpen(false);
		if (onShare) {
			onShare();
			return;
		}
		if (typeof navigator !== "undefined" && "share" in navigator) {
			try {
				await navigator.share({
					title: productTitle,
					url:
						typeof window !== "undefined"
							? new URL(productUrl, window.location.origin).href
							: productUrl,
				});
			} catch {
				// User cancelled share or share unsupported — no-op
			}
		}
	};

	const handleWishlist = () => {
		setIsOpen(false);
		haptic("light");
		onWishlist?.();
	};

	return (
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- wrapper captures long-press gestures; keyboard-accessible action buttons are rendered inside
		<div
			onTouchStart={handleTouchStart}
			onTouchMove={handleTouchMove}
			onTouchEnd={handleTouchEnd}
			onTouchCancel={handleTouchEnd}
			onClick={handleLongPressClick}
			className={cn(
				"relative touch-manipulation",
				isPressing && "motion-safe:scale-[0.98]",
				"transition-transform duration-150",
			)}
		>
			{children}

			<AnimatePresence>
				{isOpen && (
					<>
						{/* Backdrop */}
						<m.button
							type="button"
							aria-label="Fermer le menu"
							className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
							initial={prefersReducedMotion ? false : { opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={prefersReducedMotion ? undefined : { opacity: 0 }}
							transition={{ duration: 0.15 }}
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								setIsOpen(false);
							}}
						/>
						{/* Quick action sheet */}
						<m.div
							role="menu"
							aria-label={`Actions rapides pour ${productTitle}`}
							className={cn(
								"absolute top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
								"bg-background/95 border-border/60 backdrop-blur-md",
								"flex items-center gap-2 rounded-full border p-2 shadow-2xl",
							)}
							initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.85 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.85 }}
							transition={{ duration: 0.15 }}
						>
							{onWishlist && (
								<button
									type="button"
									role="menuitem"
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										handleWishlist();
									}}
									className="hover:bg-accent focus-visible:ring-ring flex size-12 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
									aria-label="Ajouter aux favoris"
								>
									<Heart className="size-5" aria-hidden="true" />
								</button>
							)}
							<a
								role="menuitem"
								href={productUrl}
								className="hover:bg-accent focus-visible:ring-ring flex size-12 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
								aria-label="Voir le produit"
								onClick={() => setIsOpen(false)}
							>
								<Eye className="size-5" aria-hidden="true" />
							</a>
							<button
								type="button"
								role="menuitem"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									void handleShare();
								}}
								className="hover:bg-accent focus-visible:ring-ring flex size-12 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
								aria-label="Partager"
							>
								<Share2 className="size-5" aria-hidden="true" />
							</button>
						</m.div>
					</>
				)}
			</AnimatePresence>
		</div>
	);
}
