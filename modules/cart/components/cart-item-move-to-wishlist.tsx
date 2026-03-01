"use client";

import { useActionState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Heart } from "lucide-react";
import { moveToWishlist } from "../actions/move-to-wishlist";

interface CartItemMoveToWishlistProps {
	cartItemId: string;
	itemName: string;
}

/**
 * Button to move a cart item to the wishlist
 * Compact design for the cart sheet
 */
export function CartItemMoveToWishlist({ cartItemId, itemName }: CartItemMoveToWishlistProps) {
	const [, action, isPending] = useActionState(moveToWishlist, undefined);

	return (
		<form action={action}>
			<input type="hidden" name="cartItemId" value={cartItemId} />
			<Button
				type="submit"
				variant="ghost"
				size="icon"
				disabled={isPending}
				className="text-muted-foreground size-8 hover:text-pink-600 dark:hover:text-pink-400"
				aria-label={`Déplacer ${itemName} vers les favoris`}
				title="Ajouter aux favoris"
			>
				<Heart className="size-3.5" aria-hidden="true" />
			</Button>
		</form>
	);
}
