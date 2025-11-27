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
import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import { Palette } from "lucide-react";
import { use, ViewTransition } from "react";
import { ColorsRowActions } from "@/modules/colors/components/colors-row-actions";
import { ColorsSelectionToolbar } from "@/modules/colors/components/colors-selection-toolbar";
import { ColorsTableSelectionCell } from "@/modules/colors/components/colors-table-selection-cell";

interface ColorsDataTableProps {
	colorsPromise: Promise<GetColorsReturn>;
}

export function ColorsDataTable({ colorsPromise }: ColorsDataTableProps) {
	const { colors, pagination } = use(colorsPromise);
	const colorIds = colors.map((color) => color.id);

	if (colors.length === 0) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Palette />
					</EmptyMedia>
					<EmptyTitle>Aucune couleur trouvée</EmptyTitle>
					<EmptyDescription>
						Aucune couleur ne correspond aux critères de recherche.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<Card>
			<CardContent>
				<ColorsSelectionToolbar colorIds={colorIds} />
				<div className="overflow-x-auto">
					<Table role="table" aria-label="Liste des couleurs" className="min-w-full table-fixed">
						<TableHeader>
							<TableRow>
								<TableHead key="select" scope="col" role="columnheader" className="w-[5%]">
									<ColorsTableSelectionCell type="header" colorIds={colorIds} />
								</TableHead>
								<TableHead
									key="preview"
									scope="col"
									role="columnheader"
									className="hidden md:table-cell w-[10%]"
								>
									Aperçu
								</TableHead>
								<TableHead
									key="name"
									scope="col"
									role="columnheader"
									className="w-[50%] sm:w-[40%]"
								>
									Nom
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
						<ViewTransition name="admin-colors-table-content">
							<TableBody>
								{colors.map((color) => {
								const skuCount = color._count?.skus || 0;

								return (
									<TableRow key={color.id}>
										<TableCell role="gridcell">
											<ColorsTableSelectionCell type="row" colorId={color.id} />
										</TableCell>
										<TableCell role="gridcell" className="hidden md:table-cell">
											<div
												className="w-[30px] h-[30px] rounded-full inline-flex border border-border"
												style={{ backgroundColor: color.hex }}
											/>
										</TableCell>
										<TableCell role="gridcell">
											<div className="overflow-hidden">
												<span
													className="font-semibold text-foreground truncate block"
													title={color.name}
												>
													{color.name}
												</span>
											</div>
										</TableCell>
										<TableCell
											role="gridcell"
											className="hidden sm:table-cell text-center"
										>
											<span className="text-sm font-medium">{skuCount}</span>
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
						</ViewTransition>
					</Table>
				</div>

				<div className="mt-4">
					<CursorPagination
						perPage={colors.length}
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
