"use client";

import { Filter } from "lucide-react";
import { Fab } from "@/shared/components/fab";
import { FAB_KEYS } from "@/shared/constants/fab";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { cn } from "@/shared/utils/cn";

/** ID du dialog pour le filter sheet produits (Zustand) */
export const PRODUCT_FILTER_DIALOG_ID = "product-filter-sheet";

interface ProductFilterFabProps {
	/** Etat initial de visibilite du FAB (depuis le cookie serveur) */
	initialHidden?: boolean;
	/** Nombre de filtres actifs (affiche un badge si > 0) */
	activeFiltersCount?: number;
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
 * <ProductFilterFab initialHidden={isFilterFabHidden} activeFiltersCount={3} />
 * ```
 */
export function ProductFilterFab({
	initialHidden = false,
	activeFiltersCount = 0,
}: ProductFilterFabProps) {
	const { open } = useDialog(PRODUCT_FILTER_DIALOG_ID);

	return (
		<div className="md:hidden">
			<Fab
				fabKey={FAB_KEYS.STOREFRONT}
				initialHidden={initialHidden}
				hideOnMobile={false}
				icon={
					<div className="relative">
						<Filter className="h-6 w-6" />
						{activeFiltersCount > 0 && (
							<span
								className={cn(
									"absolute -top-2 -right-2",
									"size-5 min-w-5",
									"bg-background text-primary",
									"text-[11px] font-bold",
									"rounded-full",
									"flex items-center justify-center",
									"ring-2 ring-primary",
									"animate-in zoom-in-50 duration-200"
								)}
								aria-hidden="true"
							>
								{activeFiltersCount > 9 ? "9+" : activeFiltersCount}
							</span>
						)}
					</div>
				}
				tooltip={{
					title: "Filtrer",
					description:
						activeFiltersCount > 0
							? `${activeFiltersCount} filtre${activeFiltersCount > 1 ? "s" : ""} actif${activeFiltersCount > 1 ? "s" : ""}`
							: "Filtrer les produits",
				}}
				ariaLabel={
					activeFiltersCount > 0
						? `Ouvrir les filtres (${activeFiltersCount} actif${activeFiltersCount > 1 ? "s" : ""})`
						: "Ouvrir les filtres"
				}
				ariaDescription="Ouvre un panneau avec les options de filtrage des produits"
				onClick={open}
			/>
		</div>
	);
}
