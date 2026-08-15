"use client";

import { formatEuro } from "@/shared/utils/format-euro";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import { Button } from "@/shared/components/ui/button";
import { useUpdateCartPrices } from "@/modules/cart/hooks/use-update-cart-prices";
import { ArrowsClockwiseIcon, PiggyBankIcon, WarningIcon } from "@phosphor-icons/react/ssr";
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
 * Compare priceAtAdd (snapshot) vs variant.priceCents (prix actuel).
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
		/*
		 * ⚠️ Le texte est en `--foreground`, pas dans la couleur de l'état.
		 *
		 * Ce conteneur portait `text-destructive-foreground` — qui vaut
		 * `oklch(1 0 0)`, donc BLANC : c'est la couleur du texte posé sur
		 * `--destructive` PLEIN, jamais sur une de ses teintes. Sur
		 * `bg-destructive/5` (#f8f3f6), le titre — seul nœud à ne pas redéfinir
		 * sa couleur, là où le `<ul>` et le paragraphe final le font — s'affichait
		 * à **1,10:1**. L'avertissement était littéralement invisible.
		 *
		 * `role="alert"` implique déjà `aria-live="assertive"` : le
		 * `aria-live="polite"` qui l'accompagnait dégradait l'urgence qu'on venait
		 * de déclarer. La branche « baisse » garde `role="status"` (poli par
		 * définition), sans redondance non plus.
		 */
		<div
			className={cn(
				"text-foreground border-b border-l-4 px-6 py-2.5 text-xs sm:text-sm",
				hasIncrease ? "border-l-destructive bg-destructive/10" : "border-l-success bg-success/10",
			)}
			role={hasIncrease ? "alert" : "status"}
		>
			<p className="mb-1 flex items-center gap-1.5 font-semibold">
				{hasIncrease ? (
					<WarningIcon className="text-destructive size-4 shrink-0" aria-hidden="true" />
				) : (
					<PiggyBankIcon className="text-success size-4 shrink-0" aria-hidden="true" />
				)}
				<span className="sr-only">{hasIncrease ? "Attention :" : "Bonne nouvelle :"}</span>
				{hasIncrease ? "Des prix ont changé" : "Des prix ont baissé !"}
			</p>
			<ul className="list-inside list-disc space-y-0.5">
				{itemsWithPriceChange.map((item) => {
					const priceIncreased = isPriceIncrease(item);
					return (
						<li key={item.id} className="line-clamp-1">
							{item.variant.product.name}:{" "}
							<span className="text-muted-foreground line-through">
								{formatEuro(item.priceAtAdd)}
							</span>{" "}
							→{" "}
							<span className="font-semibold">
								{priceIncreased ? "↑ " : "↓ "}
								{formatEuro(item.variant.priceCents ?? item.variant.product.priceCents)}
							</span>
							<span className="sr-only">
								{priceIncreased ? " (prix en hausse)" : " (prix en baisse)"}
							</span>
						</li>
					);
				})}
			</ul>
			<p className="text-muted-foreground mt-2 text-xs">
				{hasIncrease
					? "Ton panier garde le prix du jour où tu les as ajoutées, pour éviter toute surprise."
					: "Tu peux actualiser ton panier pour profiter des nouveaux prix."}
			</p>

			{/* Bouton pour actualiser les prix */}
			<div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
				<Button
					onClick={handleUpdatePrices}
					disabled={isPending}
					size="sm"
					variant="outline"
					// Pas de `text-destructive` ici : sur le fond du panneau il vaut
					// 4,34:1, juste sous le seuil AA de 4,5:1 pour du texte de 14 px.
					// La teinte reste portée par la bordure, le libellé par --foreground.
					className={cn(
						"w-full sm:w-auto",
						hasIncrease ? "border-destructive/40" : "border-success/40",
					)}
				>
					{isPending ? (
						<>
							<ArrowsClockwiseIcon
								className="mr-1.5 size-3.5 motion-safe:animate-spin"
								aria-hidden="true"
							/>
							Mise à jour…
						</>
					) : (
						<>
							<ArrowsClockwiseIcon className="mr-1.5 size-3.5" aria-hidden="true" />
							Actualiser les prix
						</>
					)}
				</Button>
				{!hasIncrease && totalSavings > 0 && (
					<p className="text-success text-center text-xs font-medium sm:text-left">
						Économise {formatEuro(totalSavings)} en actualisant !
					</p>
				)}
			</div>
		</div>
	);
}
