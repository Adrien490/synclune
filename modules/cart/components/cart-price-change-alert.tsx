"use client";

import { formatEuro } from "@/shared/utils/format-euro";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import { Button } from "@/shared/components/ui/button";
import { useUpdateCartPrices } from "@/modules/cart/hooks/use-update-cart-prices";
import { RefreshCw } from "lucide-react";
import {
	detectPriceChanges,
	isPriceIncrease,
} from "@/modules/cart/services/cart-pricing-calculator.service";

interface CartPriceChangeAlertProps {
	items: NonNullable<GetCartReturn>["items"];
}

/**
 * Alerte visuelle affichée quand le prix d'un ou plusieurs articles a changé
 * depuis leur ajout au panier.
 *
 * Compare priceAtAdd (snapshot) vs sku.priceInclTax (prix actuel)
 * Permet à l'utilisateur de mettre à jour les prix snapshot vers les prix actuels
 */
export function CartPriceChangeAlert({ items }: CartPriceChangeAlertProps) {
	const { action, isPending } = useUpdateCartPrices();

	// Calcul des changements de prix via le service
	const {
		itemsWithPriceChange,
		itemsWithPriceDecrease: _itemsWithPriceDecrease,
		totalSavings,
	} = detectPriceChanges(items);

	if (itemsWithPriceChange.length === 0) {
		return null;
	}

	const handleUpdatePrices = () => {
		action(new FormData());
	};

	return (
		<div
			className="border-b border-blue-200 bg-blue-50 px-6 py-2.5 text-xs text-blue-700 sm:text-sm dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-300"
			role="alert"
			aria-live="polite"
		>
			<p className="mb-1 font-medium">
				<span role="img" aria-hidden="true">
					💎
				</span>
				<span className="sr-only">Information :</span> Prix mis à jour
			</p>
			<ul className="list-inside list-disc space-y-0.5 text-blue-600/90 dark:text-blue-400/90">
				{itemsWithPriceChange.map((item) => {
					const priceIncreased = isPriceIncrease(item);
					return (
						<li key={item.id} className="line-clamp-1">
							{item.sku.product.title}:{" "}
							<span className="line-through">{formatEuro(item.priceAtAdd)}</span> →{" "}
							<span
								className={
									priceIncreased ? "font-semibold text-orange-600" : "font-semibold text-green-600"
								}
							>
								{formatEuro(item.sku.priceInclTax)}
							</span>
							{priceIncreased ? (
								<span role="img" aria-label="prix en hausse">
									{" "}
									📈
								</span>
							) : (
								<span role="img" aria-label="prix en baisse">
									{" "}
									📉
								</span>
							)}
						</li>
					);
				})}
			</ul>
			<p className="mt-2 text-xs text-blue-600/80 dark:text-blue-400/80">
				Les prix ont changé depuis votre ajout au panier. Votre panier conserve les prix au moment
				de l'ajout pour éviter toute surprise.
			</p>

			{/* Bouton pour actualiser les prix */}
			<div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
				<Button
					onClick={handleUpdatePrices}
					disabled={isPending}
					size="sm"
					variant="outline"
					className="w-full border-blue-300 text-blue-700 hover:bg-blue-100 sm:w-auto dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/30"
				>
					{isPending ? (
						<>
							<RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
							Mise à jour...
						</>
					) : (
						<>
							<RefreshCw className="mr-1.5 h-3.5 w-3.5" />
							Actualiser les prix
						</>
					)}
				</Button>
				{totalSavings > 0 && (
					<p className="text-center text-xs font-medium text-green-600 sm:text-left dark:text-green-400">
						<span role="img" aria-hidden="true">
							💚
						</span>{" "}
						Économise {formatEuro(totalSavings)} en actualisant !
					</p>
				)}
			</div>
		</div>
	);
}
