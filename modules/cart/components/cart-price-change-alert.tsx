"use client";

import { useMemo } from "react";
import { formatEuro } from "@/shared/utils/format-euro";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import { Button } from "@/shared/components/ui/button";
import { useUpdateCartPrices } from "@/modules/cart/lib";
import { RefreshCw } from "lucide-react";

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

	// Memoize les calculs couteux pour eviter re-calcul a chaque render
	const { itemsWithPriceChange, itemsWithPriceDecrease, totalSavings } = useMemo(() => {
		const changed = items.filter(
			(item) => item.priceAtAdd !== item.sku.priceInclTax
		);
		const decreased = changed.filter(
			(item) => item.sku.priceInclTax < item.priceAtAdd
		);
		const savings = decreased.reduce(
			(sum, item) => sum + (item.priceAtAdd - item.sku.priceInclTax) * item.quantity,
			0
		);
		return { itemsWithPriceChange: changed, itemsWithPriceDecrease: decreased, totalSavings: savings };
	}, [items]);

	if (itemsWithPriceChange.length === 0) {
		return null;
	}

	const handleUpdatePrices = () => {
		action(new FormData());
	};

	return (
		<div
			className="w-full p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md text-xs sm:text-sm text-blue-700 dark:text-blue-300"
			role="alert"
			aria-live="polite"
		>
			<p className="font-medium mb-1">
				<span aria-hidden="true">💎</span>
				<span className="sr-only">Information :</span> Prix mis à jour
			</p>
			<ul className="list-disc list-inside space-y-0.5 text-blue-600/90 dark:text-blue-400/90">
				{itemsWithPriceChange.map((item) => {
					const priceIncrease = item.sku.priceInclTax > item.priceAtAdd;
					return (
						<li key={item.id} className="line-clamp-1">
							{item.sku.product.title}:{" "}
							<span className="line-through">{formatEuro(item.priceAtAdd)}</span> →{" "}
							<span
								className={priceIncrease ? "font-semibold text-orange-600" : "font-semibold text-green-600"}
							>
								{formatEuro(item.sku.priceInclTax)}
							</span>
							{priceIncrease ? (
								<span aria-label="prix en hausse"> 📈</span>
							) : (
								<span aria-label="prix en baisse"> 📉</span>
							)}
						</li>
					);
				})}
			</ul>
			<p className="mt-2 text-xs text-blue-600/80 dark:text-blue-400/80">
				Les prix ont changé depuis ton ajout au panier. Ton panier conserve les prix au moment de l'ajout pour éviter toute surprise.
			</p>

			{/* Bouton pour actualiser les prix si certains ont baissé */}
			{itemsWithPriceDecrease.length > 0 && (
				<div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
					<Button
						onClick={handleUpdatePrices}
						disabled={isPending}
						size="sm"
						variant="outline"
						className="w-full sm:w-auto border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
					>
						{isPending ? (
							<>
								<RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
								Mise à jour...
							</>
						) : (
							<>
								<RefreshCw className="w-3.5 h-3.5 mr-1.5" />
								Actualiser les prix
							</>
						)}
					</Button>
					<p className="text-xs text-green-600 dark:text-green-400 font-medium text-center sm:text-left">
						<span aria-hidden="true">💚</span> Économisez {formatEuro(totalSavings)} en actualisant !
					</p>
				</div>
			)}
		</div>
	);
}
