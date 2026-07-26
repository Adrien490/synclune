"use client";

import { Button } from "@/shared/components/ui/button";
import { ButtonGroup } from "@/shared/components/ui/button-group";
import { Input } from "@/shared/components/ui/input";
import { useUpdateCartItem } from "@/modules/cart/hooks/use-update-cart-item";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { Minus, Plus } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { useCartOptimisticSafe } from "../contexts/cart-optimistic-context";

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
 * - Optimistic UI via useOptimistic dans startTransition (pour l'input local)
 * - Intégré avec CartOptimisticContext pour mettre à jour le total du panier
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
	const [optimisticQuantity, setOptimisticQuantity] = useOptimistic(currentQuantity);
	const cartOptimistic = useCartOptimisticSafe();
	const haptic = useHaptic();

	const { action, isPending: isActionPending } = useUpdateCartItem();

	const handleQuantityChange = (newQuantity: number) => {
		if (isNaN(newQuantity)) return;
		const clampedQuantity = Math.max(1, Math.min(newQuantity, maxQuantity));
		if (clampedQuantity === optimisticQuantity) {
			// Value was clamped to current (e.g. user typed over max/under min)
			// Signal the limit with a short error pulse instead of silently ignoring.
			if (newQuantity !== optimisticQuantity) haptic("error");
			return;
		}
		haptic("selection");

		// Calculer le delta pour le badge navbar
		const delta = clampedQuantity - optimisticQuantity;

		// Créer le FormData
		const formData = new FormData();
		formData.set("cartItemId", cartItemId);
		formData.set("quantity", String(clampedQuantity));

		// Tout dans la même transition : optimistic UI + action
		startTransition(() => {
			setOptimisticQuantity(clampedQuantity);
			// Mettre à jour le total du cart via le contexte
			if (cartOptimistic) {
				cartOptimistic.updateOptimisticCart({
					type: "updateQuantity",
					itemId: cartItemId,
					quantity: clampedQuantity,
				});
			}
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

	// Si un seul article disponible, ne pas afficher les contrôles
	if (maxQuantity <= 1) {
		return null;
	}

	return (
		<div
			role="group"
			aria-label={`Quantité de l'article, actuellement ${optimisticQuantity}`}
			aria-busy={isLoading}
		>
			<ButtonGroup aria-label="Quantité">
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="size-11"
					onClick={() => handleQuantityChange(optimisticQuantity - 1)}
					disabled={isInactive || isLoading || optimisticQuantity <= 1}
					aria-label={
						optimisticQuantity <= 1 ? "Quantité minimale atteinte" : "Diminuer la quantité"
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
					className="h-11 min-h-0 w-14 p-0 text-center text-base"
					aria-label={`Quantité, entre 1 et ${maxQuantity}`}
					/*
					 * Pas d'`aria-live` sur un contrôle de formulaire focalisé : le lecteur
					 * d'écran annonce déjà la valeur du champ, et la région live la répète
					 * en parallèle — élocution doublée ou tronquée, et le comportement varie
					 * d'un lecteur à l'autre.
					 *
					 * Le changement de quantité est déjà annoncé correctement par les régions
					 * du panier, montées en permanence quand le sheet est ouvert :
					 * `cart-sheet.tsx` (nombre d'articles + sous-total) et
					 * `cart-sheet-footer.tsx` (sous-total).
					 */
				/>

				<Button
					type="button"
					variant="outline"
					size="icon"
					className="size-11"
					onClick={() => handleQuantityChange(optimisticQuantity + 1)}
					disabled={isInactive || isLoading || optimisticQuantity >= maxQuantity}
					aria-label={
						optimisticQuantity >= maxQuantity
							? "Quantité maximale atteinte"
							: "Augmenter la quantité"
					}
				>
					<Plus className="size-4" aria-hidden="true" />
				</Button>
			</ButtonGroup>
		</div>
	);
}
