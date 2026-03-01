import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Card, CardContent } from "@/shared/components/ui/card";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import { Palette } from "lucide-react";
import { use } from "react";
import { ColorActiveToggle } from "@/modules/colors/components/admin/color-active-toggle";
import { ColorsRowActions } from "@/modules/colors/components/colors-row-actions";
import { ColorsSelectionToolbar } from "@/modules/colors/components/colors-selection-toolbar";
import { CreateColorButton } from "@/modules/colors/components/admin/create-color-button";
import { TableSelectionCell } from "@/shared/components/table-selection-cell";

interface ColorsDataTableProps {
	colorsPromise: Promise<GetColorsReturn>;
	perPage: number;
}

export function ColorsDataTable({ colorsPromise, perPage }: ColorsDataTableProps) {
	const { colors, pagination } = use(colorsPromise);
	const colorIds = colors.map((color) => color.id);

	if (colors.length === 0) {
		return (
			<TableEmptyState
				icon={Palette}
				title="Aucune couleur trouvee"
				description="Aucune couleur ne correspond aux criteres de recherche."
				actionElement={<CreateColorButton />}
			/>
		);
	}

	return (
		<Card>
			<CardContent>
				<ColorsSelectionToolbar />
				<TableScrollContainer>
					<Table
						role="table"
						aria-label="Liste des couleurs"
						caption="Liste des couleurs"
						className="min-w-full table-fixed"
					>
						<TableHeader>
							<TableRow>
								<TableHead key="select" scope="col" role="columnheader" className="w-[5%]">
									<TableSelectionCell type="header" itemIds={colorIds} />
								</TableHead>
								<TableHead
									key="preview"
									scope="col"
									role="columnheader"
									className="hidden w-[10%] md:table-cell"
								>
									Aperçu
								</TableHead>
								<TableHead
									key="name"
									scope="col"
									role="columnheader"
									className="w-[50%] sm:w-[30%]"
								>
									Nom
								</TableHead>
								<TableHead
									key="skus"
									scope="col"
									role="columnheader"
									className="hidden w-[10%] text-center sm:table-cell"
								>
									Variantes
								</TableHead>
								<TableHead
									key="active"
									scope="col"
									role="columnheader"
									className="hidden w-[10%] text-center sm:table-cell"
								>
									Actif
								</TableHead>
								<TableHead
									key="actions"
									scope="col"
									role="columnheader"
									className="w-[15%] text-right sm:w-[10%]"
									aria-label="Actions disponibles pour chaque couleur"
								>
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{colors.map((color) => {
								const skuCount = color._count.skus || 0;

								return (
									<TableRow key={color.id}>
										<TableCell role="gridcell">
											<TableSelectionCell type="row" itemId={color.id} />
										</TableCell>
										<TableCell role="gridcell" className="hidden md:table-cell">
											<div
												className="border-border inline-flex h-[30px] w-[30px] rounded-full border"
												style={{ backgroundColor: color.hex }}
											/>
										</TableCell>
										<TableCell role="gridcell">
											<div className="overflow-hidden">
												<span
													className="text-foreground block truncate font-semibold"
													title={color.name}
												>
													{color.name}
												</span>
											</div>
										</TableCell>
										<TableCell role="gridcell" className="hidden text-center sm:table-cell">
											<span className="text-sm font-medium">{skuCount}</span>
										</TableCell>
										<TableCell role="gridcell" className="hidden text-center sm:table-cell">
											<ColorActiveToggle colorId={color.id} isActive={color.isActive} />
										</TableCell>
										<TableCell role="gridcell" className="text-right">
											<ColorsRowActions
												colorId={color.id}
												colorName={color.name}
												colorHex={color.hex}
												colorSlug={color.slug}
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
						currentPageSize={colors.length}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
