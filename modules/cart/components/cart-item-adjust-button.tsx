"use client";

import { Button } from "@/shared/components/ui/button";
import { useUpdateCartItem } from "../hooks/use-update-cart-item";
import { useTransition } from "react";

interface CartItemAdjustButtonProps {
	cartItemId: string;
	availableStock: number;
}

/**
 * Client Component pour le bouton "Ajuster à X"
 *
 * Permet d'ajuster automatiquement la quantité au stock disponible
 * en 1 clic au lieu de devoir le faire manuellement via le select
 */
export function CartItemAdjustButton({
	cartItemId,
	availableStock,
}: CartItemAdjustButtonProps) {
	const [isPending, startTransition] = useTransition();
	const { action: updateAction } = useUpdateCartItem();

	const handleAdjustToStock = () => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("cartItemId", cartItemId);
			formData.append("quantity", availableStock.toString());
			updateAction(formData);
		});
	};

	return (
		<Button
			data-pending={isPending ? "" : undefined}
			size="sm"
			variant="outline"
			onClick={handleAdjustToStock}
			disabled={isPending}
			className="text-xs h-8 border-destructive/30 text-destructive hover:bg-destructive/10"
		>
			Ajuster à {availableStock}
		</Button>
	);
}
