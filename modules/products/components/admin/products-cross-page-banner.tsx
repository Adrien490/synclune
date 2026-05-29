"use client";

import { ListChecks, Loader2 } from "lucide-react";
import { useTransition } from "react";

import { useBulkSelectionContext } from "@/shared/components/data-table";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { ActionStatus } from "@/shared/types/server-action";
import { cn } from "@/shared/utils/cn";
import { toast } from "@/shared/utils/toast";

import {
	getFilteredProductIds,
	type FilteredProductIdsData,
} from "../../actions/get-filtered-product-ids";
import { BULK_PRODUCT_ACTION_LIMIT } from "../../constants/product.constants";
import type { ProductFilters, SortField } from "../../types/product.types";

interface ProductsCrossPageBannerProps {
	/** Nombre total de produits matching le filtre courant (toutes pages). */
	totalCount: number;
	/** Snapshot des params filter/search/sort de l'URL. */
	filterParams: {
		search?: string;
		sortBy?: SortField;
		filters?: ProductFilters;
	};
	className?: string;
}

/**
 * Banner sticky mobile (au-dessus de la liste produits) qui propose de selectionner
 * **tous** les produits matching le filtre actuel — pas seulement ceux visibles
 * sur la page courante. Idiome Gmail / Mail "Selectionner les N conversations".
 *
 * Visible uniquement si :
 * - selectionMode === true
 * - tous les items de la page sont selectionnes (`pageState === "all"`)
 * - totalCount > pageItemIds.length (donc il existe d'autres pages)
 * - selectedCount < totalCount (sinon deja tout selectionne cross-page)
 */
export function ProductsCrossPageBanner({
	totalCount,
	filterParams,
	className,
}: ProductsCrossPageBannerProps) {
	const { selectionMode, pageState, pageItemIds, selectedCount, extendSelection } =
		useBulkSelectionContext();
	const [isFetching, startTransition] = useTransition();

	const hasMore = totalCount > pageItemIds.length;
	const isComplete = selectedCount >= totalCount;
	const visible = selectionMode && pageState === "all" && hasMore && !isComplete;
	const cappedTotal = Math.min(totalCount, BULK_PRODUCT_ACTION_LIMIT);
	const isAtCap = totalCount > BULK_PRODUCT_ACTION_LIMIT;

	const handleSelectAll = () => {
		triggerHaptic("medium");
		startTransition(async () => {
			const result = await getFilteredProductIds({
				search: filterParams.search,
				sortBy: filterParams.sortBy ?? "created-descending",
				filters: filterParams.filters ?? {},
			});
			if (result.status !== ActionStatus.SUCCESS) {
				toast.error(result.message);
				return;
			}
			const data = result.data as FilteredProductIdsData;
			extendSelection(data.ids);
			const verb = data.ids.length > 1 ? "ajoutés" : "ajouté";
			toast.success(
				`${data.ids.length} bijou${data.ids.length > 1 ? "x" : ""} ${verb} à la sélection`,
			);
		});
	};

	if (!visible) return null;

	return (
		<div
			className={cn(
				"bg-primary/5 border-primary/20 flex items-center justify-between gap-2 rounded-md border px-3 py-2 md:hidden",
				"motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-150",
				className,
			)}
			role="status"
			aria-live="polite"
		>
			<div className="flex min-w-0 items-center gap-2">
				<ListChecks className="text-primary size-4 shrink-0" aria-hidden="true" />
				<span className="text-sm">
					Les <strong>{pageItemIds.length}</strong> produits de cette page sont sélectionnés.
				</span>
			</div>
			<button
				type="button"
				onClick={handleSelectAll}
				disabled={isFetching}
				className={cn(
					"text-primary inline-flex min-h-11 shrink-0 items-center gap-1 rounded px-2 text-sm font-medium",
					"focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none",
					"transform-gpu active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-150",
					"touch-manipulation [-webkit-tap-highlight-color:transparent]",
					"disabled:opacity-60",
				)}
				aria-busy={isFetching || undefined}
			>
				{isFetching ? (
					<Loader2 className="size-3.5 motion-safe:animate-spin" aria-hidden="true" />
				) : null}
				Sélectionner les {cappedTotal}
				{isAtCap ? " (max)" : ""}
			</button>
		</div>
	);
}
