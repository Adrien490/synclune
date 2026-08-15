"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/shared/components/ui/button";
import { formatEuro } from "@/shared/utils/format-euro";
import { VARIANT_SELECTOR_TEXTS } from "@/modules/cart/constants/variant-selector-texts";

import { QUANTITY_BOUNDS_ID } from "./variant-selector-utils";

export interface QuantitySectionProps {
	quantity: number;
	maxQuantity: number;
	onQuantityChange: (quantity: number) => void;
	isPending: boolean;
	unitPrice: number;
}

/**
 * Sélecteur de quantité du dialog panier.
 *
 * Seul rescapé de `variant-selector-selectors.tsx` : les trois radiogroups (couleur,
 * matériau, taille) ont disparu avec le passage à une ligne par pièce.
 */
export function QuantitySection({
	quantity,
	maxQuantity,
	onQuantityChange,
	isPending,
	unitPrice,
}: QuantitySectionProps) {
	// Ce que la cliente est EN TRAIN de taper — `null` hors saisie. Les boutons
	// ± n'y touchent pas : cliquer l'un d'eux retire le focus du champ, donc le
	// blur remet l'affichage sur la valeur retenue.
	const [draft, setDraft] = useState<string | null>(null);

	return (
		<fieldset className="space-y-2" disabled={isPending}>
			<legend className="text-sm font-medium">{VARIANT_SELECTOR_TEXTS.QUANTITY_LEGEND}</legend>
			<div className="flex items-center gap-4 sm:gap-3">
				<Button
					type="button"
					variant="outline"
					size="icon"
					onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
					disabled={isPending || quantity <= 1}
					aria-label="Diminuer la quantité"
				>
					<MinusIcon className="size-4" aria-hidden="true" />
				</Button>
				{/* Brouillon local : l'ancien clamp à chaque frappe rendait le champ
				    invidable (effacer remettait 1, taper « 12 » passait par 1 puis sautait
				    au max). On affiche ce que tape la cliente, on propage la valeur clampée
				    dès qu'elle est un nombre, et le blur remet l'affichage sur la valeur
				    retenue. Pas de `min`/`max` : invalides sur `type="text"`, les bornes
				    vivent dans le `aria-describedby`. */}
				<input
					type="text"
					inputMode="numeric"
					pattern="[0-9]*"
					value={draft ?? String(quantity)}
					onChange={(e) => {
						const raw = e.target.value;
						if (!/^\d*$/.test(raw)) return;
						setDraft(raw);
						const parsed = parseInt(raw, 10);
						if (!Number.isNaN(parsed)) {
							onQuantityChange(Math.max(1, Math.min(maxQuantity, parsed)));
						}
					}}
					onBlur={() => setDraft(null)}
					disabled={isPending}
					className="focus-ring w-12 rounded-md bg-transparent text-center text-lg font-semibold tabular-nums"
					aria-label="Quantité à ajouter au panier"
					aria-describedby={QUANTITY_BOUNDS_ID}
				/>
				<span id={QUANTITY_BOUNDS_ID} className="sr-only">
					Minimum 1, maximum {maxQuantity}
				</span>
				<Button
					type="button"
					variant="outline"
					size="icon"
					onClick={() => onQuantityChange(Math.min(maxQuantity, quantity + 1))}
					disabled={isPending || quantity >= maxQuantity}
					aria-label="Augmenter la quantité"
				>
					<PlusIcon className="size-4" aria-hidden="true" />
				</Button>
			</div>
			{/* Pas d'aria-label : sur un <p> sans rôle, il est ignoré par la plupart des
			    lecteurs d'écran — le texte visible fait foi, avec un vrai « × ». */}
			{quantity > 1 && (
				<p className="text-muted-foreground text-xs">
					{quantity} × {formatEuro(unitPrice)}
				</p>
			)}
		</fieldset>
	);
}
