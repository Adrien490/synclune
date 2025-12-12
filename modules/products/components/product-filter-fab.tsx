"use client";

import { Filter } from "lucide-react";
import { Fab, FAB_KEYS } from "@/shared/features/fab";
import { useDialog } from "@/shared/providers/dialog-store-provider";

/** ID du dialog pour le filter sheet produits (Zustand) */
export const PRODUCT_FILTER_DIALOG_ID = "product-filter-sheet";

interface ProductFilterFabProps {
	/** Etat initial de visibilite du FAB (depuis le cookie serveur) */
	initialHidden?: boolean;
}

/**
 * FAB (Floating Action Button) pour les filtres produits sur mobile
 *
 * Affiche un bouton flottant en bas a droite qui ouvre le sheet de filtres.
 * Visible uniquement sur mobile, masquable par l'utilisateur avec persistance cookie.
 * Utilise Zustand (dialog store) pour communiquer avec le ProductFilterSheet.
 *
 * @example
 * ```tsx
 * <ProductFilterFab initialHidden={isFilterFabHidden} />
 * ```
 */
export function ProductFilterFab({
	initialHidden = false,
}: ProductFilterFabProps) {
	const { open } = useDialog(PRODUCT_FILTER_DIALOG_ID);

	return (
		<div className="md:hidden">
			<Fab
				fabKey={FAB_KEYS.STOREFRONT}
				initialHidden={initialHidden}
				hideOnMobile={false}
				icon={<Filter className="h-6 w-6" />}
				tooltip={{
					title: "Filtrer",
					description: "Filtrer les produits",
				}}
				ariaLabel="Ouvrir les filtres"
				ariaDescription="Ouvre un panneau avec les options de filtrage des produits"
				onClick={open}
			/>
		</div>
	);
}
