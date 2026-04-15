import { use } from "react";
import { Gem } from "lucide-react";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "@/shared/components/ui/item";
import { Badge } from "@/shared/components/ui/badge";
import type { GetMaterialsReturn } from "@/modules/materials/types/materials.types";
import { MaterialsRowActions } from "@/modules/materials/components/materials-row-actions";
import { MaterialsSelectionToolbar } from "@/modules/materials/components/materials-selection-toolbar";
import { CreateMaterialButton } from "@/modules/materials/components/admin/create-material-button";

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
				{materials.map((material) => {
					const skuCount = material._count.skus || 0;

					return (
						<div key={material.id} role="listitem">
							<Item
								variant="outline"
								size="sm"
								className="gap-3"
								aria-roledescription="carte materiau"
							>
								<ItemContent className="min-w-0">
									<ItemTitle>
										<span className="truncate font-semibold">{material.name}</span>
										<Badge variant={material.isActive ? "default" : "secondary"}>
											{material.isActive ? "Actif" : "Inactif"}
										</Badge>
									</ItemTitle>
									{material.description && (
										<ItemDescription className="line-clamp-1">
											{material.description}
										</ItemDescription>
									)}
									<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
										<span>
											{skuCount} variante{skuCount !== 1 ? "s" : ""}
										</span>
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<MaterialsRowActions
										materialId={material.id}
										materialName={material.name}
										materialSlug={material.slug}
										materialDescription={material.description}
										materialIsActive={material.isActive}
									/>
								</ItemActions>
							</Item>
						</div>
					);
				})}
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
