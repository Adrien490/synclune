"use client";

import { Button } from "@/shared/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/shared/components/ui/button-group";
import { Minus, Plus } from "lucide-react";
import { useUpdateCartItemQuantity } from "@/modules/cart/hooks/use-update-cart-item-quantity";

interface CartItemQuantityControlsProps {
	cartItemId: string;
	currentQuantity: number;
	maxQuantity: number;
	isInactive: boolean;
}

export function CartItemQuantityControls({
	cartItemId,
	currentQuantity,
	maxQuantity,
	isInactive,
}: CartItemQuantityControlsProps) {
	const { action, isPending } = useUpdateCartItemQuantity();

	// Utilise directement currentQuantity (source de vérité: DB)
	// Pas d'optimistic update pour éviter les désynchronisations
	// Le feedback visuel est assuré par isPending + data-pending
	const quantity = currentQuantity;

	return (
		<ButtonGroup data-pending={isPending ? "" : undefined}>
			{/* Bouton diminuer */}
			<form action={action}>
				<input type="hidden" name="cartItemId" value={cartItemId} />
				<input
					type="hidden"
					name="quantity"
					value={Math.max(1, quantity - 1)}
				/>
				<Button
					type="submit"
					variant="outline"
					size="icon"
					disabled={isInactive || isPending || quantity <= 1}
					aria-label="Diminuer la quantité"
					className="h-10 w-10"
				>
					<Minus className="h-4 w-4" />
				</Button>
			</form>

			{/* Affichage de la quantité */}
			<ButtonGroupText className="h-10 min-w-[3rem] justify-center font-mono font-medium text-sm">
				{quantity}
			</ButtonGroupText>

			{/* Bouton augmenter */}
			<form action={action}>
				<input type="hidden" name="cartItemId" value={cartItemId} />
				<input
					type="hidden"
					name="quantity"
					value={Math.min(maxQuantity, quantity + 1)}
				/>
				<Button
					type="submit"
					variant="outline"
					size="icon"
					disabled={isInactive || isPending || quantity >= maxQuantity}
					aria-label="Augmenter la quantité"
					className="h-10 w-10"
				>
					<Plus className="h-4 w-4" />
				</Button>
			</form>
		</ButtonGroup>
	);
}
