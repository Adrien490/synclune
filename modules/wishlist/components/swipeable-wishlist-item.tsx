"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
	useSwipeToRemove,
	SWIPE_REMOVE_THRESHOLD,
} from "@/modules/wishlist/hooks/use-swipe-to-remove";
import { useRemoveFromWishlist } from "@/modules/wishlist/hooks/use-remove-from-wishlist";
import { useWishlistListOptimistic } from "@/modules/wishlist/contexts/wishlist-list-optimistic-context";
import { addToWishlist } from "@/modules/wishlist/actions/add-to-wishlist";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { ActionStatus } from "@/shared/types/server-action";
import { toast } from "@/shared/utils/toast";

interface SwipeableWishlistItemProps {
	productId: string;
	children: React.ReactNode;
}

/**
 * Wrapper for wishlist grid items that adds swipe-to-remove on touch devices.
 *
 * - Left swipe reveals red delete zone beneath the card
 * - Exceeding threshold triggers direct removal (no confirmation dialog)
 * - Only active on touch devices via @media(hover: none)
 * - Snaps back if threshold not met
 */
export function SwipeableWishlistItem({ productId, children }: SwipeableWishlistItemProps) {
	const itemRef = useRef<HTMLDivElement>(null);
	const router = useRouter();
	const wishlistListOptimistic = useWishlistListOptimistic();
	const incrementWishlist = useBadgeCountsStore((state) => state.incrementWishlist);
	const [, startUndoTransition] = useTransition();

	const handleUndo = () => {
		incrementWishlist();
		const fd = new FormData();
		fd.set("productId", productId);
		startUndoTransition(async () => {
			const result = await addToWishlist(undefined, fd);
			if (result.status === ActionStatus.SUCCESS) {
				router.refresh();
				toast.success("Article restauré");
			} else {
				toast.error(result.message);
			}
		});
	};

	const { action } = useRemoveFromWishlist({
		onOptimisticRemove: wishlistListOptimistic?.onItemRemoved,
		onSuccess: () => {
			toast.success("Article retiré de votre wishlist", {
				description: "Vous pourrez toujours le retrouver dans nos créations.",
				duration: 5000,
				action: {
					label: "Annuler",
					onClick: handleUndo,
				},
			});
		},
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
