"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";
import {
	useSwipeToRemove,
	SWIPE_REMOVE_THRESHOLD,
} from "@/modules/wishlist/hooks/use-swipe-to-remove";
import { useRemoveFromWishlist } from "@/modules/wishlist/hooks/use-remove-from-wishlist";
import { useWishlistListOptimistic } from "@/modules/wishlist/contexts/wishlist-list-optimistic-context";

interface SwipeableWishlistItemProps {
	productId: string;
	itemName?: string;
	children: React.ReactNode;
}

/**
 * Wrapper for wishlist grid items that adds swipe-to-remove on touch devices.
 *
 * - Left swipe reveals red delete zone beneath the card
 * - Exceeding threshold triggers direct removal (no confirmation dialog)
 * - Only active on touch devices via @media(hover: none)
 * - Snaps back if threshold not met
 *
 * Suppression directe : le retrait est appliqué optimistiquement via
 * `WishlistListOptimisticContext` (`onItemRemoved`), sans fenêtre d'annulation.
 */
export function SwipeableWishlistItem({ productId, children }: SwipeableWishlistItemProps) {
	const itemRef = useRef<HTMLDivElement>(null);
	const wishlistListOptimistic = useWishlistListOptimistic();

	const { action } = useRemoveFromWishlist({
		onOptimisticRemove: (id) => wishlistListOptimistic?.onItemRemoved(id),
	});

	const handleRemove = () => {
		const formData = new FormData();
		formData.set("productId", productId);
		action(formData);
	};

	const { swipeOffset, isSwiping } = useSwipeToRemove({
		elementRef: itemRef,
		enabled: true,
		onRemove: handleRemove,
	});

	// Progress toward threshold (0 to 1)
	const progress = Math.min(1, Math.abs(swipeOffset) / SWIPE_REMOVE_THRESHOLD);

	return (
		<div ref={itemRef} className="relative touch-pan-y overflow-hidden rounded-lg">
			{/* Delete zone revealed behind the card */}
			<div
				className="bg-destructive/90 absolute inset-0 flex items-center justify-end pr-6"
				aria-hidden="true"
				style={{ opacity: progress }}
			>
				<Trash2 className="text-destructive-foreground size-6" />
			</div>

			{/* Sliding card content */}
			<div
				style={{
					transform: `translateX(${swipeOffset}px)`,
					transition: isSwiping ? "none" : "transform var(--duration-normal) ease-out",
				}}
			>
				{children}
			</div>
		</div>
	);
}
