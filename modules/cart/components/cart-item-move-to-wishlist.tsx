"use client";

import { Button } from "@/shared/components/ui/button";
import { useActionWithToast } from "@/shared/hooks/use-action-with-toast";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addToWishlist } from "@/modules/wishlist/actions/add-to-wishlist";

interface CartItemMoveToWishlistProps {
	productId: string;
	itemName: string;
}

/**
 * Button to add a cart item's product to the wishlist (without removing from cart)
 * Compact design for the cart sheet
 */
export function CartItemMoveToWishlist({ productId, itemName }: CartItemMoveToWishlistProps) {
	const router = useRouter();

	const { action, isPending } = useActionWithToast(addToWishlist, {
		toastOptions: { showSuccessToast: false },
		onSuccess: (result) => {
			toast.success(result.message, {
				action: { label: "Voir", onClick: () => router.push("/favoris") },
			});
		},
	});

	return (
		<form action={action}>
			<input type="hidden" name="productId" value={productId} />
			<Button
				type="submit"
				variant="ghost"
				size="icon"
				disabled={isPending}
				className="text-muted-foreground size-8 hover:text-pink-600"
				aria-label={`Ajouter ${itemName} aux favoris`}
				title="Ajouter aux favoris"
			>
				<Heart className="size-3.5" aria-hidden="true" />
			</Button>
		</form>
	);
}
