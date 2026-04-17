import { use } from "react";
import { Gem } from "lucide-react";

import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";

import type { GetMaterialsReturn } from "@/modules/materials/types/materials.types";
import { MaterialsSelectionToolbar } from "@/modules/materials/components/materials-selection-toolbar";
import { CreateMaterialButton } from "@/modules/materials/components/admin/create-material-button";
import { MaterialMobileItem } from "./material-mobile-item";

interface MaterialsMobileListProps {
	materialsPromise: Promise<GetMaterialsReturn>;
	perPage: number;
}

export function MaterialsMobileList({ materialsPromise, perPage }: MaterialsMobileListProps) {
	const { materials, pagination } = use(materialsPromise);

	if (materials.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={Gem}
					title="Aucun materiau trouve"
					description="Aucun materiau ne correspond aux criteres de recherche."
					actionElement={<CreateMaterialButton />}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4 pb-20 md:hidden md:pb-0">
			<MaterialsSelectionToolbar />

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
	);
}
