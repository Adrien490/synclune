"use client";

import { Button } from "@/shared/components/ui/button";
import { useRemoveUnavailableItems } from "@/modules/cart/hooks/use-remove-unavailable-items";

interface RemoveUnavailableItemsButtonProps {
	itemsCount: number;
}

/**
 * Client Component pour le bouton de suppression des articles indisponibles
 * Utilisé dans le cart-summary quand des articles ont des problèmes de stock
 */
export function RemoveUnavailableItemsButton({
	itemsCount,
}: RemoveUnavailableItemsButtonProps) {
	const { action, isPending } = useRemoveUnavailableItems();

	const handleRemoveUnavailable = () => {
		action(new FormData());
	};

	return (
		<Button
			onClick={handleRemoveUnavailable}
			disabled={isPending}
			size="sm"
			variant="destructive"
			className="w-full text-xs h-9"
		>
			{isPending
				? "Suppression en cours..."
				: `Retirer les articles indisponibles (${itemsCount})`}
		</Button>
	);
}
