import { use } from "react";
import { Gem } from "lucide-react";

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
import { AdminListPendingProvider } from "@/shared/contexts/admin-list-pending-context";

import type {
	GetMaterialsParams,
	GetMaterialsReturn,
	MaterialFilters,
} from "@/modules/materials/types/materials.types";
import { CreateMaterialButton } from "@/modules/materials/components/admin/create-material-button";
import { MaterialMobileItem } from "./material-mobile-item";
import { MaterialsBulkActionsBar } from "./materials-bulk-actions-bar";
import { MaterialsCrossPageBanner } from "./materials-cross-page-banner";

interface MaterialsMobileListProps {
	materialsPromise: Promise<GetMaterialsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
	filterParams?: {
		search?: string;
		sortBy?: GetMaterialsParams["sortBy"];
		filters?: MaterialFilters;
	};
}

export function MaterialsMobileList({
	materialsPromise,
	perPage,
	hasActiveFilters,
	filterParams,
}: MaterialsMobileListProps) {
	const { materials, pagination, totalCount } = use(materialsPromise);

	if (materials.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={Gem}
					title="Aucun matériau trouvé"
					description={
						hasActiveFilters
							? "Aucun matériau ne correspond aux critères de recherche."
							: "Aucun matériau pour l'instant."
					}
					actionElement={
						hasActiveFilters ? (
							<EmptyResetFiltersAction href="/admin/catalogue/materiaux" />
						) : (
							<CreateMaterialButton />
						)
					}
				/>
			</div>
		);
	}

	const pageItemIds = materials.map((m) => m.id);

	return (
		<AdminListPendingProvider>
			<BulkSelectionProvider pageItemIds={pageItemIds}>
				<div className="space-y-4 pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
					<MobileSelectionHeader itemsLabel={{ singular: "matériau", plural: "matériaux" }} />
					{filterParams ? (
						<MaterialsCrossPageBanner totalCount={totalCount} filterParams={filterParams} />
					) : null}
					<AdminListLiveCount count={materials.length} singular="matériau" plural="matériaux" />
					<ItemGroup aria-label="Materiaux" className="gap-2">
						{materials.map((material) => (
							<div key={material.id} role="listitem">
								<MaterialMobileItem material={material} />
							</div>
						))}
					</ItemGroup>

					<CursorPagination
						perPage={perPage}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						currentPageSize={materials.length}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
					/>
				</div>
				<MobileSelectionBottomBar>
					<MaterialsBulkActionsBar presentation="bottom-bar" />
				</MobileSelectionBottomBar>
			</BulkSelectionProvider>
		</AdminListPendingProvider>
	);
}
