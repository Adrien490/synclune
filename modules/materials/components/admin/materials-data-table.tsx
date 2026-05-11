import { CursorPagination } from "@/shared/components/cursor-pagination";
import {
	BulkSelectionHeaderCheckbox,
	BulkSelectionProvider,
	BulkSelectionRowCheckbox,
	TableEmptyState,
} from "@/shared/components/data-table";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import type { GetMaterialsReturn } from "@/modules/materials/data/get-materials";
import { MaterialActiveToggle } from "@/modules/materials/components/admin/material-active-toggle";
import { MaterialsBulkActionsBar } from "@/modules/materials/components/admin/materials-bulk-actions-bar";
import { Gem } from "lucide-react";
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
	const { materials, pagination } = use(materialsPromise);

	if (materials.length === 0) {
		return (
			<TableEmptyState
				className="hidden md:flex"
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
		);
	}

	const pageItemIds = materials.map((m) => m.id);

	return (
		<Card className="hidden md:block">
			<CardContent>
				<BulkSelectionProvider pageItemIds={pageItemIds}>
					<MaterialsBulkActionsBar />
					<TableScrollContainer>
						<Table
							role="table"
							aria-label="Liste des matériaux"
							caption="Liste des matériaux"
							className="min-w-full table-fixed"
						>
							<TableHeader>
								<TableRow>
									<TableHead key="select" scope="col" role="columnheader" className="w-[4%]">
										<BulkSelectionHeaderCheckbox itemsLabel="matériaux" />
										<span className="sr-only">Sélection</span>
									</TableHead>
									<TableHead key="name" scope="col" role="columnheader" className="w-[23%]">
										Nom
									</TableHead>
									<TableHead key="description" scope="col" role="columnheader" className="w-[28%]">
										Description
									</TableHead>
									<TableHead
										key="status"
										scope="col"
										role="columnheader"
										className="w-[10%] text-center"
									>
										Statut
									</TableHead>
									<TableHead
										key="skus"
										scope="col"
										role="columnheader"
										className="w-[10%] text-center"
									>
										Variantes
									</TableHead>
									<TableHead
										key="actions"
										scope="col"
										role="columnheader"
										className="w-[8%] text-right"
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
												<BulkSelectionRowCheckbox
													id={material.id}
													itemLabel={`Matériau ${material.name}`}
												/>
											</TableCell>
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
												<MaterialActiveToggle
													materialId={material.id}
													isActive={material.isActive}
												/>
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
						</Table>
					</TableScrollContainer>

					<div className="mt-4">
						<CursorPagination
							perPage={perPage}
							hasNextPage={pagination.hasNextPage}
							hasPreviousPage={pagination.hasPreviousPage}
							currentPageSize={materials.length}
							nextCursor={pagination.nextCursor}
							prevCursor={pagination.prevCursor}
						/>
					</div>
				</BulkSelectionProvider>
			</CardContent>
		</Card>
	);
}
