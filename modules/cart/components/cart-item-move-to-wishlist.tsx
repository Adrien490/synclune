"use client";

import { Button } from "@/shared/components/ui/button";
import { useActionWithToast } from "@/shared/hooks/use-action-with-toast";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
	const router = useRouter();

	const { action, isPending } = useActionWithToast(moveToWishlist, {
		toastOptions: { showSuccessToast: false },
		onSuccess: () => {
			toast.success("Déplacé vers vos favoris", {
				action: { label: "Voir", onClick: () => router.push("/favoris") },
			});
		},
	});

	return (
		<form action={action}>
			<input type="hidden" name="cartItemId" value={cartItemId} />
			<Button
				type="submit"
				variant="ghost"
				size="icon"
				disabled={isPending}
				className="text-muted-foreground size-8 hover:text-pink-600"
				aria-label={`Déplacer ${itemName} vers les favoris`}
				title="Ajouter aux favoris"
			>
				<Heart className="size-3.5" aria-hidden="true" />
			</Button>
		</form>
	);
}
