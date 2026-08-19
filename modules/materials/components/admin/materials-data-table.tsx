import { CreateTaxonomyButton } from "@/modules/taxonomies/components/taxonomy-list-controls";
import { AdminDataTable, TableEmptyState } from "@/shared/components/data-table";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import type { GetMaterialsReturn } from "@/modules/materials/data/get-materials";
import { SwatchesIcon } from "@phosphor-icons/react/ssr";
import { use } from "react";
import { MaterialsRowActions } from "@/modules/materials/components/materials-row-actions";

interface MaterialsDataTableProps {
	materialsPromise: Promise<GetMaterialsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function MaterialsDataTable({
	materialsPromise,
	perPage,
	hasActiveFilters,
}: MaterialsDataTableProps) {
	const { materials, pagination, totalCount } = use(materialsPromise);

	if (materials.length === 0) {
		return (
			<TableEmptyState
				className="hidden md:flex"
				icon={SwatchesIcon}
				title="Aucun matériau trouvé"
				description="Aucun matériau ne correspond aux critères de recherche."
				noItemsDescription="Aucun matériau pour l'instant."
				hasActiveFilters={hasActiveFilters}
				resetFiltersHref="/admin/catalogue/materiaux"
				actionElement={<CreateTaxonomyButton kind="material" />}
			/>
		);
	}

	return (
		<AdminDataTable
			caption="Liste des matériaux"
			pagination={{
				perPage,
				hasNextPage: pagination.hasNextPage,
				hasPreviousPage: pagination.hasPreviousPage,
				currentPageSize: materials.length,
				nextCursor: pagination.nextCursor,
				prevCursor: pagination.prevCursor,
				totalCount,
			}}
		>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[64%]">Nom</TableHead>
					<TableHead className="w-[16%] text-center">Variantes</TableHead>
					<TableHead
						className="w-[20%] text-right"
						aria-label="Actions disponibles pour chaque matériau"
					>
						Actions
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{materials.map((material) => {
					const variantCount = material._count.variants;

					return (
						<TableRow key={material.id}>
							<TableCell>
								<div className="overflow-hidden">
									<span
										className="text-foreground block truncate font-semibold"
										title={material.name}
									>
										{material.name}
									</span>
								</div>
							</TableCell>
							<TableCell className="text-center">
								<span className="text-sm font-medium">{variantCount}</span>
							</TableCell>
							<TableCell className="text-right">
								<MaterialsRowActions
									materialId={material.id}
									materialName={material.name}
									variantsCount={material._count.variants}
								/>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</AdminDataTable>
	);
}
