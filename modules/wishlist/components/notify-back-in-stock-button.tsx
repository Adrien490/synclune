"use client";

import { Bell, Check } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useWishlistToggle } from "@/modules/wishlist/hooks/use-wishlist-toggle";

interface NotifyBackInStockButtonProps {
	productId: string;
	productTitle: string;
	isInWishlist: boolean;
}

/**
 * CTA button for out-of-stock products that adds the product to the wishlist
 * so the user gets notified when stock is restored.
 *
 * Uses the existing wishlist + back-in-stock notification pipeline.
 */
export function NotifyBackInStockButton({
	productId,
	productTitle,
	isInWishlist: initialIsInWishlist,
}: NotifyBackInStockButtonProps) {
	const { isInWishlist, action, isPending } = useWishlistToggle({
		initialIsInWishlist,
	});

	if (isInWishlist) {
		return (
			<div className="flex items-center gap-2 text-sm">
				<Check className="text-foreground size-4" />
				<span className="text-foreground font-medium">
					Vous serez notifié(e) du retour en stock
				</span>
			</div>
		);
	}

	return (
		<form action={action}>
			<input type="hidden" name="productId" value={productId} />
			<Button
				type="submit"
				variant="outline"
				size="lg"
				disabled={isPending}
				aria-busy={isPending}
				aria-label={`M'alerter quand ${productTitle} sera disponible`}
				className="w-full gap-2"
			>
				<Bell className="size-4" />
				{isPending ? "Enregistrement..." : "M'alerter quand disponible"}
			</Button>
		</form>
	);
}
