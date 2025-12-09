"use client";

import { Button } from "@/shared/components/ui/button";
import { ButtonGroup } from "@/shared/components/ui/button-group";
import { Input } from "@/shared/components/ui/input";
import { updateCartItem } from "@/modules/cart/actions/update-cart-item";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { Minus, Plus } from "lucide-react";
import { useActionState, useOptimistic, useRef, useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";

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
 * - Optimistic UI : mise à jour immédiate via useOptimistic
 * - Debounce : évite le spam d'appels serveur (300ms)
 * - ButtonGroup : UI cohérente avec hauteurs uniformes
 * - Pas de loader visible : l'UI optimiste suffit
 */
export function CartItemQuantitySelector({
	cartItemId,
	currentQuantity,
	maxQuantity,
	isInactive,
}: CartItemQuantitySelectorProps) {
	const formRef = useRef<HTMLFormElement>(null);
	const [isTransitionPending, startTransition] = useTransition();
	const [optimisticQuantity, setOptimisticQuantity] = useOptimistic(currentQuantity);

	const [, formAction, isActionPending] = useActionState(
		withCallbacks(
			updateCartItem,
			createToastCallbacks({
				showSuccessToast: false,
			})
		),
		undefined
	);

	const debouncedSubmit = useDebouncedCallback(() => {
		if (formRef.current) {
			formRef.current.requestSubmit();
		}
	}, 300);

	const handleQuantityChange = (newQuantity: number) => {
		if (isNaN(newQuantity)) return;
		const clampedQuantity = Math.max(1, Math.min(newQuantity, maxQuantity));

		// Optimistic update immédiat
		startTransition(() => {
			setOptimisticQuantity(clampedQuantity);
		});

		debouncedSubmit();
	};

	const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		const value = parseInt(e.target.value, 10);
		if (isNaN(value) || value < 1) {
			handleQuantityChange(1);
		}
	};

	return (
		<form ref={formRef} action={formAction}>
			<input type="hidden" name="cartItemId" value={cartItemId} />
			<input type="hidden" name="quantity" value={optimisticQuantity} />

			<ButtonGroup aria-label="Quantité">
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="h-8 w-8"
					onClick={() => handleQuantityChange(optimisticQuantity - 1)}
					disabled={isInactive || optimisticQuantity <= 1}
					aria-label="Diminuer la quantité"
				>
					<Minus className="h-3 w-3" />
				</Button>

				<Input
					type="number"
					min={1}
					max={maxQuantity}
					value={optimisticQuantity}
					onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10))}
					onBlur={handleBlur}
					disabled={isInactive}
					className="min-h-0 h-8 w-10 text-center text-sm px-0 py-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
					aria-label="Quantité"
				/>

				<Button
					type="button"
					variant="outline"
					size="icon"
					className="h-8 w-8"
					onClick={() => handleQuantityChange(optimisticQuantity + 1)}
					disabled={isInactive || optimisticQuantity >= maxQuantity}
					aria-label="Augmenter la quantité"
				>
					<Plus className="h-3 w-3" />
				</Button>
			</ButtonGroup>
		</form>
	);
}
