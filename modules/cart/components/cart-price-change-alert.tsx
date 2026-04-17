"use client";

import { formatEuro } from "@/shared/utils/format-euro";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import { Button } from "@/shared/components/ui/button";
import { useUpdateCartPrices } from "@/modules/cart/hooks/use-update-cart-prices";
import { RefreshCw } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import {
	detectPriceChanges,
	isPriceIncrease,
} from "@/modules/cart/services/cart-pricing-calculator.service";

interface CartPriceChangeAlertProps {
	items: NonNullable<GetCartReturn>["items"];
}

/**
 * Alerte visuelle quand le prix d'un ou plusieurs articles a changé
 * depuis leur ajout au panier.
 *
 * UI séparée selon le type de changement :
 * - Hausses présentes → alerte destructive/10 (sérieuse) avec role="alert"
 * - Baisses uniquement → alerte verte positive "bonne nouvelle" avec role="status"
 *
 * Compare priceAtAdd (snapshot) vs sku.priceInclTax (prix actuel).
 * Permet à l'utilisateur de mettre à jour les prix snapshot vers les prix actuels.
 */
export function CartPriceChangeAlert({ items }: CartPriceChangeAlertProps) {
	const { action, isPending } = useUpdateCartPrices();

	const { itemsWithPriceChange, itemsWithPriceIncrease, totalSavings } = detectPriceChanges(items);

	if (itemsWithPriceChange.length === 0) {
		return null;
	}

	const hasIncrease = itemsWithPriceIncrease.length > 0;

	const handleUpdatePrices = () => {
		action(new FormData());
	};

	return (
		<div
			className={cn(
				"border-b px-6 py-2.5 text-xs sm:text-sm",
				hasIncrease
					? "border-destructive/20 bg-destructive/5 text-destructive-foreground"
					: "border-green-200 bg-green-50 text-green-900",
			)}
			role={hasIncrease ? "alert" : "status"}
			aria-live="polite"
		>
			<p className="mb-1 font-medium">
				<span role="img" aria-hidden="true">
					{hasIncrease ? "⚠️" : "💚"}
				</span>
				<span className="sr-only">{hasIncrease ? "Attention :" : "Bonne nouvelle :"}</span>{" "}
				{hasIncrease ? "Des prix ont changé" : "Des prix ont baissé !"}
			</p>
			<ul
				className={cn(
					"list-inside list-disc space-y-0.5",
					hasIncrease ? "text-destructive" : "text-green-800",
				)}
			>
				{itemsWithPriceChange.map((item) => {
					const priceIncreased = isPriceIncrease(item);
					return (
						<li key={item.id} className="line-clamp-1">
							{item.sku.product.title}:{" "}
							<span className="line-through">{formatEuro(item.priceAtAdd)}</span> →{" "}
							<span
								className={
									priceIncreased ? "text-destructive font-semibold" : "font-semibold text-green-800"
								}
							>
								{priceIncreased ? "↑ " : "↓ "}
								{formatEuro(item.sku.priceInclTax)}
							</span>
							<span className="sr-only">
								{priceIncreased ? " (prix en hausse)" : " (prix en baisse)"}
							</span>
						</li>
					);
				})}
			</ul>
			<p className={cn("mt-2 text-xs", hasIncrease ? "text-destructive/90" : "text-green-800/90")}>
				{hasIncrease
					? "Votre panier conserve les prix au moment de l'ajout pour éviter toute surprise."
					: "Vous pouvez actualiser votre panier pour profiter des nouveaux prix."}
			</p>

			{/* Bouton pour actualiser les prix */}
			<div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
				<Button
					onClick={handleUpdatePrices}
					disabled={isPending}
					size="sm"
					variant="outline"
					className={cn(
						"w-full sm:w-auto",
						hasIncrease
							? "border-destructive/30 text-destructive hover:bg-destructive/10"
							: "border-green-300 text-green-900 hover:bg-green-100",
					)}
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
				{!hasIncrease && totalSavings > 0 && (
					<p className="text-center text-xs font-medium text-green-800 sm:text-left">
						Économise {formatEuro(totalSavings)} en actualisant !
					</p>
				)}
			</div>
		</div>
	);
}
