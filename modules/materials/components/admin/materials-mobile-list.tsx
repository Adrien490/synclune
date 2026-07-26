import { use } from "react";
import { Gem } from "lucide-react";

import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { AdminMobileListPagination } from "@/shared/components/cursor-pagination";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";

import type { GetMaterialsReturn } from "@/modules/materials/types/materials.types";
import { CreateMaterialButton } from "@/modules/materials/components/admin/create-material-button";
import { MaterialMobileItem } from "./material-mobile-item";

interface MaterialsMobileListProps {
	materialsPromise: Promise<GetMaterialsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function MaterialsMobileList({
	materialsPromise,
	perPage,
	hasActiveFilters,
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
							: "Aucune matière à l'établi pour l'instant."
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

	return (
		<div className="space-y-4 overscroll-contain pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
			<AdminListLiveCount count={materials.length} singular="matériau" plural="matériaux" />
			<ItemGroup aria-label="Materiaux" className="gap-2">
				{materials.map((material) => (
					<li key={material.id}>
						<MaterialMobileItem material={material} />
					</li>
				))}
			</ItemGroup>

			<AdminMobileListPagination
				perPage={perPage}
				hasNextPage={pagination.hasNextPage}
				hasPreviousPage={pagination.hasPreviousPage}
				currentPageSize={materials.length}
				nextCursor={pagination.nextCursor}
				prevCursor={pagination.prevCursor}
				totalCount={totalCount}
			/>
		</div>
	);
}
