import { CursorPagination } from "@/shared/components/cursor-pagination";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import type { GetMaterialsReturn } from "@/modules/materials/data/get-materials";
import { Gem } from "lucide-react";
import { use, ViewTransition } from "react";
import { MaterialsRowActions } from "@/modules/materials/components/materials-row-actions";
import { MaterialsSelectionToolbar } from "@/modules/materials/components/materials-selection-toolbar";
import { MaterialsTableSelectionCell } from "@/modules/materials/components/materials-table-selection-cell";

interface MaterialsDataTableProps {
	materialsPromise: Promise<GetMaterialsReturn>;
}

export function MaterialsDataTable({ materialsPromise }: MaterialsDataTableProps) {
	const { materials, pagination } = use(materialsPromise);
	const materialIds = materials.map((material) => material.id);

	if (materials.length === 0) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Gem />
					</EmptyMedia>
					<EmptyTitle>Aucun matériau trouvé</EmptyTitle>
					<EmptyDescription>
						Aucun matériau ne correspond aux critères de recherche.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<Card>
			<CardContent>
				<MaterialsSelectionToolbar materialIds={materialIds} />
				<div className="overflow-x-auto">
					<Table role="table" aria-label="Liste des matériaux" className="min-w-full table-fixed">
						<TableHeader>
							<TableRow>
								<TableHead key="select" scope="col" role="columnheader" className="w-[5%]">
									<MaterialsTableSelectionCell type="header" materialIds={materialIds} />
								</TableHead>
								<TableHead
									key="name"
									scope="col"
									role="columnheader"
									className="w-[35%] sm:w-[30%]"
								>
									Nom
								</TableHead>
								<TableHead
									key="description"
									scope="col"
									role="columnheader"
									className="hidden md:table-cell w-[30%]"
								>
									Description
								</TableHead>
								<TableHead
									key="status"
									scope="col"
									role="columnheader"
									className="hidden sm:table-cell text-center w-[10%]"
								>
									Statut
								</TableHead>
								<TableHead
									key="skus"
									scope="col"
									role="columnheader"
									className="hidden sm:table-cell text-center w-[10%]"
								>
									Variantes
								</TableHead>
								<TableHead
									key="actions"
									scope="col"
									role="columnheader"
									className="w-[15%] sm:w-[10%] text-right"
								>
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
								{materials.map((material) => {
								const skuCount = material._count?.skus || 0;

								return (
									<TableRow key={material.id}>
										<TableCell role="gridcell">
											<MaterialsTableSelectionCell type="row" materialId={material.id} />
										</TableCell>
										<TableCell role="gridcell">
											<ViewTransition name={`admin-material-name-${material.id}`}>
												<div className="overflow-hidden">
													<span
														className="font-semibold text-foreground truncate block"
														title={material.name}
													>
														{material.name}
													</span>
												</div>
											</ViewTransition>
										</TableCell>
										<TableCell role="gridcell" className="hidden md:table-cell">
											<span className="text-sm text-muted-foreground line-clamp-2">
												{material.description || "-"}
											</span>
										</TableCell>
										<TableCell
											role="gridcell"
											className="hidden sm:table-cell text-center"
										>
											<Badge variant={material.isActive ? "default" : "secondary"}>
												{material.isActive ? "Actif" : "Inactif"}
											</Badge>
										</TableCell>
										<TableCell
											role="gridcell"
											className="hidden sm:table-cell text-center"
										>
											<span className="text-sm font-medium">{skuCount}</span>
										</TableCell>
										<TableCell role="gridcell" className="text-right">
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
				</div>

				<div className="mt-4">
					<CursorPagination
						perPage={materials.length}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						currentPageSize={materials.length}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
