"use client";

import { startTransition } from "react";
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
	const { action: removeUnavailableAction, isPending: isRemovingUnavailable } =
		useRemoveUnavailableItems();

	const handleRemoveUnavailable = () => {
		startTransition(() => {
			removeUnavailableAction(new FormData());
		});
	};

	return (
		<Button
			onClick={handleRemoveUnavailable}
			disabled={isRemovingUnavailable}
			size="sm"
			variant="destructive"
			className="w-full text-xs h-9"
		>
			{isRemovingUnavailable
				? "Suppression en cours..."
				: `Retirer les articles indisponibles (${itemsCount})`}
		</Button>
	);
}
