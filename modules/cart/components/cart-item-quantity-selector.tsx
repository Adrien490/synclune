"use client";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Minus, Plus, Loader2 } from "lucide-react";
import { useCartItemQuantityForm } from "../hooks/use-cart-item-quantity-form";

interface CartItemQuantitySelectorProps {
	cartItemId: string;
	currentQuantity: number;
	maxQuantity: number;
	isInactive: boolean;
}

/**
 * Client Component pour le sélecteur de quantité d'un article du panier
 *
 * Fonctionnalités :
 * - Optimistic UI : mise à jour immédiate via TanStack Form
 * - Debounce : évite le spam d'appels serveur (300ms)
 * - Synchronisation : se met à jour quand la prop change (après succès serveur)
 * - Boutons +/- avec input numérique pour une meilleure UX
 */
export function CartItemQuantitySelector({
	cartItemId,
	currentQuantity,
	maxQuantity,
	isInactive,
}: CartItemQuantitySelectorProps) {
	const { form, formRef, action, isPending, debouncedSubmit } =
		useCartItemQuantityForm({
			cartItemId,
			currentQuantity,
		});

	const handleQuantityChange = (newQuantity: number) => {
		if (isNaN(newQuantity)) return;
		const clampedQuantity = Math.max(1, Math.min(newQuantity, maxQuantity));
		form.setFieldValue("quantity", clampedQuantity);
		debouncedSubmit();
	};

	return (
		<form ref={formRef} action={action}>
			<input type="hidden" name="cartItemId" value={cartItemId} />

			<form.Subscribe selector={(state) => [state.values.quantity]}>
				{([quantity]) => (
					<>
						<input type="hidden" name="quantity" value={quantity} />

						<div
							className="flex items-center gap-1"
							role="group"
							aria-label="Quantité"
						>
							<Button
								type="button"
								variant="outline"
								size="icon"
								className="h-8 w-8"
								onClick={() => handleQuantityChange(quantity - 1)}
								disabled={isPending || isInactive || quantity <= 1}
								aria-label="Diminuer la quantité"
							>
								<Minus className="h-3 w-3" />
							</Button>

							<Input
								type="number"
								min={1}
								max={maxQuantity}
								value={quantity}
								onChange={(e) =>
									handleQuantityChange(parseInt(e.target.value, 10))
								}
								onBlur={(e) => {
									// Assure une valeur valide au blur
									const value = parseInt(e.target.value, 10);
									if (isNaN(value) || value < 1) {
										form.setFieldValue("quantity", 1);
									}
								}}
								disabled={isPending || isInactive}
								className="h-8 w-12 text-center text-sm px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
								aria-label="Quantité"
							/>

							<Button
								type="button"
								variant="outline"
								size="icon"
								className="h-8 w-8"
								onClick={() => handleQuantityChange(quantity + 1)}
								disabled={isPending || isInactive || quantity >= maxQuantity}
								aria-label="Augmenter la quantité"
							>
								<Plus className="h-3 w-3" />
							</Button>

							{isPending && (
								<Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-1" />
							)}
						</div>
					</>
				)}
			</form.Subscribe>
		</form>
	);
}
