"use client";

import { SheetFooter } from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { formatEuro } from "@/shared/utils/format-euro";
import { AnimatedNumber } from "@/shared/components/animations/animated-number";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { SHIPPING_RATES } from "@/modules/orders/constants/shipping-rates";
import Link from "next/link";
import { STOCK_ISSUES_ALERT_ID } from "./stock-issues-alert-id";

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

	/**
	 * Renvoie vers l'explication au lieu de ne rien faire.
	 *
	 * Le CTA bloqué portait un `disabled` NATIF, ce qui le sortait du tab order — donc son
	 * `aria-describedby="stock-issues-alert"`, la seule chose qui dise POURQUOI la commande
	 * est impossible, n'était jamais annoncé. Ni survol ni tap non plus : aucun chemin, à
	 * aucune modalité, vers le motif du blocage.
	 *
	 * En `aria-disabled`, le bouton reste focusable et cliquable ; le clic déplace le focus
	 * sur l'alerte, qui liste les articles fautifs. Précédent du dépôt : `pay-button.tsx`.
	 */
	const handleBlockedClick = () => {
		haptic("error");
		const alert = document.getElementById(STOCK_ISSUES_ALERT_ID);
		if (!alert) return;
		alert.scrollIntoView({ block: "nearest" });
		alert.focus({ preventScroll: true });
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
				 * ⚠️ **Le montant n'est PAS en `--font-display`.** La display n'expose pas
				 * `tnum` — Winky Sans comme Fraunces avant elle (GSUB sans feature
				 * numérale), donc `tabular-nums` y est un no-op : mesuré sur Fraunces,
				 * « 111,11 € » et « 888,88 € » diffèrent de **16,14 px** à 24 px, à l'identique avec ou sans
				 * l'utilitaire. Comme `AnimatedNumber` traverse toutes les valeurs
				 * intermédiaires, le total se serait mis à gigoter à chaque changement de
				 * quantité — sur le seul chiffre transactionnel du panneau. La sans, elle,
				 * porte bien `tnum` — Figtree hier (Δ 24,11 → 0,00 px), Onest aujourd'hui (GSUB vérifié). La display reste sur le titre
				 * du panneau, où elle ne fait aucun travail numérique.
				 */}
				{/* `border` + `shadow-paper`, et non `border-2` : le cadre de l'étiquette était
				    à **1,23:1** contre le panneau depuis le retrait de `bg-muted` — deux pixels
				    d'un filet qu'on ne voyait pas. L'ombre décolle le récapitulatif comme elle
				    décolle les lignes, et le filet pointillé sous le total garde son rôle de
				    « ligne de conduite » d'étiquette. */}
				<div className="bg-card shadow-paper rounded-sm border px-4 py-3">
					<div className="flex items-baseline justify-between gap-3 border-b border-dotted pb-2">
						<span className="text-sm">
							Sous-total · {totalItems} article{totalItems > 1 ? "s" : ""}
						</span>
						<span
							aria-busy={isPending}
							className="text-2xl leading-none font-semibold tabular-nums transition-opacity duration-200 group-data-pending/sheet:opacity-50 group-data-pending/sheet:motion-safe:animate-pulse"
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
					/*
					 * ⚠️ `aria-disabled` SEUL, jamais `disabled` natif — et pas d'`opacity-*`.
					 *
					 * Deux raisons distinctes, toutes deux mesurées :
					 *
					 * 1. **Tab order.** Un `disabled` natif retire le bouton du parcours clavier,
					 *    donc `aria-describedby` ci-dessous n'est jamais lu : l'unique explication
					 *    du blocage devenait inatteignable au clavier comme au lecteur d'écran.
					 *
					 * 2. **Lisibilité.** Une opacité d'élément délave le texte ET son fond vers le
					 *    blanc : sur `--primary` (rose pastel), `opacity-50` met le libellé à
					 *    1,57:1 et `opacity-60` à 1,83:1 — un CTA illisible. C'est structurel, pas
					 *    une question de palier. D'où `variant="outline"` : le libellé passe en
					 *    `--foreground`, soit 19,54:1. Le filet tireté reprend la grammaire du
					 *    récapitulatif juste au-dessus (`border-dotted`) et dit « pas encore »
					 *    plutôt que « raté ». Le filet lui-même n'a pas à tenir 3:1 — WCAG 1.4.11
					 *    exempte explicitement les composants inactifs.
					 */
					<Button
						variant="outline"
						size="lg"
						className="w-full border-2 border-dashed"
						aria-disabled="true"
						aria-describedby={STOCK_ISSUES_ALERT_ID}
						onClick={handleBlockedClick}
					>
						Passer commande
					</Button>
				) : (
					<Button
						render={<Link href="/paiement" onClick={handleCheckoutClick} />}
						size="lg"
						className="can-hover:hover:shadow-lg w-full shadow-md transition-shadow group-data-pending/sheet:pointer-events-none group-data-pending/sheet:opacity-50"
					>
						Passer commande
					</Button>
				)}

				{/* Secondary link */}
				<div className="text-center">
					<button
						type="button"
						onClick={onClose}
						className="focus-ring text-muted-foreground can-hover:hover:text-foreground rounded-sm text-sm underline underline-offset-4 transition-colors group-data-pending/sheet:pointer-events-none group-data-pending/sheet:opacity-50"
					>
						Continuer mes achats
					</button>
				</div>
			</div>
		</SheetFooter>
	);
}
