"use client";

import { useMemo } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { Loader2 } from "lucide-react";
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

	// Memoize quantity options pour eviter re-calcul a chaque render
	const quantityOptions = useMemo(
		() => Array.from({ length: Math.min(99, maxQuantity) }, (_, i) => i + 1),
		[maxQuantity]
	);

	return (
		<form ref={formRef} action={action}>
			{/* Hidden field for cartItemId */}
			<input type="hidden" name="cartItemId" value={cartItemId} />

			<div className="flex items-center gap-2">
				<label
					htmlFor={`qty-${cartItemId}`}
					className="text-sm text-muted-foreground font-medium"
				>
					Qté
				</label>

				{/* Subscribe to quantity field to render Select */}
				<form.Subscribe selector={(state) => [state.values.quantity]}>
					{([quantity]) => (
						<Select
							name="quantity"
							value={quantity.toString()}
							onValueChange={(value) => {
								const newQuantity = parseInt(value, 10);
								// Update form state (optimistic UI)
								form.setFieldValue("quantity", newQuantity);
								// Trigger debounced submit
								debouncedSubmit();
							}}
							disabled={isPending || isInactive}
						>
							<SelectTrigger
								id={`qty-${cartItemId}`}
								className="w-24 sm:w-20 h-11"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{quantityOptions.map((qty) => (
									<SelectItem key={qty} value={qty.toString()}>
										{qty}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</form.Subscribe>

				{/* Spinner visible pendant le chargement */}
				{isPending && (
					<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
				)}
			</div>
		</form>
	);
}
