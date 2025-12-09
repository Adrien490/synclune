"use client";

import { Button } from "@/shared/components/ui/button";
import { ButtonGroup } from "@/shared/components/ui/button-group";
import { Input } from "@/shared/components/ui/input";
import { useUpdateCartItem } from "@/modules/cart/hooks/use-update-cart-item";
import { Minus, Plus } from "lucide-react";
import { useOptimistic, useTransition } from "react";

interface CartItemQuantitySelectorProps {
	cartItemId: string;
	currentQuantity: number;
	maxQuantity: number;
	isInactive: boolean;
}

/**
 * Client Component pour le sélecteur de quantité d'un article du panier
 *
 * Pattern inspiré de useAddToCart :
 * - Optimistic UI via useOptimistic dans startTransition
 * - Pas de debounce : soumission immédiate pour lier useOptimistic à l'action
 * - Badge navbar mis à jour via le hook useUpdateCartItem
 */
export function CartItemQuantitySelector({
	cartItemId,
	currentQuantity,
	maxQuantity,
	isInactive,
}: CartItemQuantitySelectorProps) {
	const [isPending, startTransition] = useTransition();
	const [optimisticQuantity, setOptimisticQuantity] =
		useOptimistic(currentQuantity);

	const { action, isPending: isActionPending } = useUpdateCartItem();

	const handleQuantityChange = (newQuantity: number) => {
		if (isNaN(newQuantity)) return;
		const clampedQuantity = Math.max(1, Math.min(newQuantity, maxQuantity));
		if (clampedQuantity === optimisticQuantity) return;

		// Calculer le delta pour le badge navbar
		const delta = clampedQuantity - optimisticQuantity;

		// Créer le FormData
		const formData = new FormData();
		formData.set("cartItemId", cartItemId);
		formData.set("quantity", String(clampedQuantity));

		// Tout dans la même transition : optimistic UI + action
		startTransition(() => {
			setOptimisticQuantity(clampedQuantity);
			action(formData, delta);
		});
	};

	const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		const value = parseInt(e.target.value, 10);
		if (isNaN(value) || value < 1) {
			handleQuantityChange(1);
		}
	};

	const isLoading = isPending || isActionPending;
	const showQuantityControls = maxQuantity > 1;

	// Si un seul article disponible, afficher juste la quantité sans contrôles
	if (!showQuantityControls) {
		return (
			<div
				aria-label="Quantite"
				className="flex items-center justify-center h-11 sm:h-9 w-11 sm:w-9 border rounded-md text-base font-medium"
			>
				<span aria-label="Quantité: 1">1</span>
			</div>
		);
	}

	return (
		<div
			aria-label="Modifier la quantite"
			data-pending={isLoading ? "" : undefined}
			className="group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50"
		>
			<ButtonGroup aria-label="Quantite">
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="size-11 sm:size-9"
					onClick={() => handleQuantityChange(optimisticQuantity - 1)}
					disabled={isInactive || isLoading || optimisticQuantity <= 1}
					aria-label={
						optimisticQuantity <= 1
							? "Quantite minimale atteinte"
							: "Diminuer la quantite"
					}
				>
					<Minus className="size-4" aria-hidden="true" />
				</Button>

				<Input
					type="text"
					inputMode="numeric"
					pattern="[0-9]*"
					min={1}
					max={maxQuantity}
					value={optimisticQuantity}
					onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10))}
					onBlur={handleBlur}
					disabled={isInactive || isLoading}
					className="min-h-0 h-11 sm:h-9 w-12 sm:w-11 text-center text-base px-0 py-0"
					aria-label={`Quantite, entre 1 et ${maxQuantity}`}
					aria-valuemin={1}
					aria-valuemax={maxQuantity}
					aria-valuenow={optimisticQuantity}
				/>

				<Button
					type="button"
					variant="outline"
					size="icon"
					className="size-11 sm:size-9"
					onClick={() => handleQuantityChange(optimisticQuantity + 1)}
					disabled={isInactive || isLoading || optimisticQuantity >= maxQuantity}
					aria-label={
						optimisticQuantity >= maxQuantity
							? "Quantite maximale atteinte"
							: "Augmenter la quantite"
					}
				>
					<Plus className="size-4" aria-hidden="true" />
				</Button>
			</ButtonGroup>
		</div>
	);
}
