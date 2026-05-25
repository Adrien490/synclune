import { use } from "react";
import Link from "next/link";
import { Package } from "lucide-react";

import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { BulkSelectionProvider } from "@/shared/components/data-table";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	MobileSelectionBottomBar,
	MobileSelectionHeader,
} from "@/shared/components/mobile-selection";
import { ItemGroup } from "@/shared/components/ui/item";

import type { GetProductSkusReturn } from "@/modules/skus/types/skus.types";

import { SkuMobileItem } from "./sku-mobile-item";
import { SkusBulkActionsBar } from "./skus-bulk-actions-bar";

interface SkusMobileListProps {
	skusPromise: Promise<GetProductSkusReturn>;
	productSlug: string;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function SkusMobileList({
	skusPromise,
	productSlug,
	perPage,
	hasActiveFilters,
}: SkusMobileListProps) {
	const { productSkus, pagination } = use(skusPromise);

	if (productSkus.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={Package}
					title="Aucune variante"
					description={
						hasActiveFilters
							? "Aucune variante ne correspond aux critères."
							: "Ce produit n'a pas encore de variante."
					}
					actionElement={
						hasActiveFilters ? (
							<EmptyResetFiltersAction
								href={`/admin/catalogue/produits/${productSlug}/variantes`}
							/>
						) : (
							<Link
								href={`/admin/catalogue/produits/${productSlug}/variantes/nouveau`}
								className="bg-primary text-primary-foreground inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium"
							>
								Créer une variante
							</Link>
						)
					}
				/>
			</div>
		);
	}

	const pageItemIds = productSkus.map((s) => s.id);

	return (
		<BulkSelectionProvider pageItemIds={pageItemIds}>
			<div className="space-y-4 pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
				<MobileSelectionHeader itemsLabel={{ singular: "variante", plural: "variantes" }} />
				<AdminListLiveCount count={productSkus.length} singular="variante" plural="variantes" />
				<ItemGroup aria-label="Variantes" className="gap-2">
					{productSkus.map((sku, index) => (
						<div key={sku.id} role="listitem">
							<SkuMobileItem sku={sku} productSlug={productSlug} preload={index === 0} />
						</div>
					))}
				</ItemGroup>

				<CursorPagination
					perPage={perPage}
					hasNextPage={pagination.hasNextPage}
					hasPreviousPage={pagination.hasPreviousPage}
					currentPageSize={productSkus.length}
					nextCursor={pagination.nextCursor}
					prevCursor={pagination.prevCursor}
				/>
			</div>
			<MobileSelectionBottomBar emptyHint="Tape sur les variantes à sélectionner">
				<SkusBulkActionsBar presentation="bottom-bar" />
			</MobileSelectionBottomBar>
		</BulkSelectionProvider>
	);
}
