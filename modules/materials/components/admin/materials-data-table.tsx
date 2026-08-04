import { AdminDataTable, TableEmptyState } from "@/shared/components/data-table";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import type { GetMaterialsReturn } from "@/modules/materials/data/get-materials";
import { MaterialActiveToggle } from "@/modules/materials/components/admin/material-active-toggle";
import { SwatchesIcon } from "@phosphor-icons/react/ssr";
import { use } from "react";
import { MaterialsRowActions } from "@/modules/materials/components/materials-row-actions";
import { CreateMaterialButton } from "@/modules/materials/components/admin/create-material-button";

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
				actionElement={<CreateMaterialButton />}
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
					<TableHead className="w-[28%]">Nom</TableHead>
					<TableHead className="w-[36%]">Description</TableHead>
					<TableHead className="w-[12%] text-center">Statut</TableHead>
					<TableHead className="w-[12%] text-center">Variantes</TableHead>
					<TableHead
						className="w-[12%] text-right"
						aria-label="Actions disponibles pour chaque matériau"
					>
						Actions
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{materials.map((material) => {
					const skuCount = material._count.skus;

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
							<TableCell>
								<span className="text-muted-foreground line-clamp-2 text-sm">
									{material.description ?? "-"}
								</span>
							</TableCell>
							<TableCell className="text-center">
								<MaterialActiveToggle materialId={material.id} isActive={material.isActive} />
							</TableCell>
							<TableCell className="text-center">
								<span className="text-sm font-medium">{skuCount}</span>
							</TableCell>
							<TableCell className="text-right">
								<MaterialsRowActions
									materialId={material.id}
									materialName={material.name}
									materialSlug={material.slug}
									materialDescription={material.description}
									materialIsActive={material.isActive}
								/>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</AdminDataTable>
	);
}
