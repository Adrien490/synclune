"use client";

import { useState } from "react";
import { Heart, Share2, Eye } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";

import { useLongPress } from "@/shared/hooks";
import { cn } from "@/shared/utils/cn";

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
 * - 500ms hold → reveal action menu (Favoris, Partager, Voir)
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
	const prefersReducedMotion = useReducedMotion();

	const { bind, isPressing } = useLongPress(() => setIsOpen(true), {
		trackPressing: true,
		haptic: false,
	});

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
		onWishlist?.();
	};

	return (
		<div
			{...bind}
			className={cn(
				"relative",
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
