"use client";

import { SheetFooter } from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { formatEuro } from "@/shared/utils/format-euro";
import { AnimatedNumber } from "@/shared/components/animations/animated-number";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { SHIPPING_RATES } from "@/modules/orders/constants/shipping-rates";
import Link from "next/link";

interface CartSheetFooterProps {
	totalItems: number;
	subtotal: number;
	isPending: boolean;
	hasStockIssues: boolean;
	onClose: () => void;
}

export function CartSheetFooter({
	totalItems,
	subtotal,
	isPending,
	hasStockIssues,
	onClose,
}: CartSheetFooterProps) {
	const haptic = useHaptic();

	const handleCheckoutClick = () => {
		haptic("medium");
		onClose();
	};

	return (
		/*
		 * `pb-[max(1rem,env(safe-area-inset-bottom))]` — le footer est le PROPRIÉTAIRE
		 * UNIQUE de la marge basse du panier, sur les deux formats. Les deux popups
		 * posent `pb-0` : avant, la primitive `DrawerContent` ajoutait la sienne au
		 * `pb-4` d'ici, soit ≥ 32 px de vide sous « Continuer mes achats » sur un
		 * panneau borné à 85 dvh. Garder la formule `max()` et non un `pb-4` nu :
		 * c'est elle qui empêche le CTA de passer sous la barre d'accueil iPhone.
		 */
		<SheetFooter className="bg-background mt-auto shrink-0 border-t px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
			<div className="w-full space-y-2.5">
				{/*
				 * Le récapitulatif est une ÉTIQUETTE, pas une suite de lignes : un cadre
				 * et une ligne de conduite pointillée sous le total.
				 *
				 * ⚠️ **Le montant n'est PAS en `--font-display`.** Fraunces n'expose ni
				 * `tnum` ni `pnum` (sa table GSUB ne porte que `kern` et `liga`), donc
				 * `tabular-nums` y est un no-op : mesuré, « 111,11 € » et « 888,88 € »
				 * diffèrent de **16,14 px** en Fraunces 24 px, à l'identique avec ou sans
				 * l'utilitaire. Comme `AnimatedNumber` traverse toutes les valeurs
				 * intermédiaires, le total se serait mis à gigoter à chaque changement de
				 * quantité — sur le seul chiffre transactionnel du panneau. Figtree, elle,
				 * porte bien `tnum` (Δ 24,11 px → 0,00 px). La display reste sur le titre
				 * du panneau, où elle ne fait aucun travail numérique.
				 */}
				<div className="bg-card rounded-sm border-2 px-4 py-3">
					<div className="flex items-baseline justify-between gap-3 border-b border-dotted pb-2">
						<span className="text-sm">
							Sous-total · {totalItems} article{totalItems > 1 ? "s" : ""}
						</span>
						<span
							aria-busy={isPending}
							className="text-2xl leading-none font-semibold tabular-nums transition-opacity duration-200 group-has-[[data-pending]]/sheet:opacity-50 group-has-[[data-pending]]/sheet:motion-safe:animate-pulse"
						>
							{/* startValue={subtotal} : sans lui le spring part de 0 et le
							    sous-total COMPTE de 0,00 € au montant réel à chaque ouverture
							    du panier (montant transactionnel faux ~1 s). Ainsi le mount
							    affiche la vraie valeur ; seuls les changements de quantité
							    animent, de l'ancien montant vers le nouveau. */}
							<AnimatedNumber value={subtotal} startValue={subtotal} formatter={formatEuro} />
						</span>
					</div>
					{/* Hint frais postaux — réduit la friction à l'étape paiement */}
					<p className="text-muted-foreground mt-2 flex items-baseline justify-between gap-3 text-xs">
						<span>Frais postaux dès</span>
						<span className="tabular-nums">{formatEuro(SHIPPING_RATES.FR.amount)}</span>
					</p>
					<p className="text-muted-foreground mt-1 text-xs">Calculés à l&apos;étape suivante.</p>
				</div>
				{/* Pas de région live ici : la région différée de cart-sheet.tsx annonce
				    déjà « N articles, sous-total X » — deux régions sur la même valeur
				    = double vocalisation. */}

				{/* Primary CTA */}
				{hasStockIssues ? (
					<Button
						size="lg"
						className="w-full"
						disabled
						aria-disabled="true"
						aria-describedby="stock-issues-alert"
					>
						Passer commande
					</Button>
				) : (
					<Button
						render={<Link href="/paiement" onClick={handleCheckoutClick} />}
						size="lg"
						className="can-hover:hover:shadow-lg w-full shadow-md transition-shadow group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50"
					>
						Passer commande
					</Button>
				)}

				{/* Secondary link */}
				<div className="text-center">
					<button
						type="button"
						onClick={onClose}
						className="text-muted-foreground can-hover:hover:text-foreground focus-visible:ring-ring rounded-sm text-sm underline underline-offset-4 transition-colors group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
					>
						Continuer mes achats
					</button>
				</div>
			</div>
		</SheetFooter>
	);
}
