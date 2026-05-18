import { CursorPagination } from "@/shared/components/cursor-pagination";
import {
	BulkSelectionHeaderCheckbox,
	BulkSelectionProvider,
	BulkSelectionRowCheckbox,
	TableEmptyState,
} from "@/shared/components/data-table";
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
import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import { Palette } from "lucide-react";
import { use } from "react";
import { ColorActiveToggle } from "@/modules/colors/components/admin/color-active-toggle";
import { ColorsBulkActionsBar } from "@/modules/colors/components/admin/colors-bulk-actions-bar";
import { ColorsRowActions } from "@/modules/colors/components/colors-row-actions";
import { CreateColorButton } from "@/modules/colors/components/admin/create-color-button";

interface ColorsDataTableProps {
	colorsPromise: Promise<GetColorsReturn>;
	perPage: number;
}

export function ColorsDataTable({ colorsPromise, perPage }: ColorsDataTableProps) {
	const { colors, pagination } = use(colorsPromise);

	if (colors.length === 0) {
		return (
			<TableEmptyState
				className="hidden md:flex"
				icon={Palette}
				title="Aucune couleur trouvée"
				description="Aucune couleur ne correspond aux critères de recherche."
				actionElement={<CreateColorButton />}
			/>
		);
	}

	const pageItemIds = colors.map((c) => c.id);

	return (
		<Card className="hidden md:block">
			<CardContent>
				<BulkSelectionProvider pageItemIds={pageItemIds}>
					<ColorsBulkActionsBar />
					<TableScrollContainer>
						<Table
							caption="Liste des couleurs"
							striped
							noRegion
							className="min-w-full table-fixed [&>caption]:sr-only"
						>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[4%]">
										<BulkSelectionHeaderCheckbox itemsLabel="couleurs" />
										<span className="sr-only">Sélection</span>
									</TableHead>
									<TableHead className="w-[8%]">Aperçu</TableHead>
									<TableHead className="w-[36%]">Nom</TableHead>
									<TableHead className="w-[10%] text-center">Variantes</TableHead>
									<TableHead className="w-[10%] text-center">Actif</TableHead>
									<TableHead
										className="w-[8%] text-right"
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
											<TableCell>
												<BulkSelectionRowCheckbox
													id={color.id}
													itemLabel={`Couleur ${color.name}`}
												/>
											</TableCell>
											<TableCell>
												<div
													className="border-border inline-flex size-[30px] rounded-full border"
													style={{ backgroundColor: color.hex }}
													role="img"
													aria-label={`Aperçu couleur ${color.hex.toUpperCase()}`}
												/>
											</TableCell>
											<TableCell>
												<div className="overflow-hidden">
													<span
														className="text-foreground block truncate font-semibold"
														title={color.name}
													>
														{color.name}
													</span>
													{color.description && (
														<span
															className="text-muted-foreground block truncate text-xs italic"
															title={color.description}
														>
															{color.description}
														</span>
													)}
												</div>
											</TableCell>
											<TableCell className="text-center">
												<span className="text-sm font-medium">{skuCount}</span>
											</TableCell>
											<TableCell className="text-center">
												<ColorActiveToggle colorId={color.id} isActive={color.isActive} />
											</TableCell>
											<TableCell className="text-right">
												<ColorsRowActions
													colorId={color.id}
													colorName={color.name}
													colorHex={color.hex}
													colorSlug={color.slug}
													colorDescription={color.description}
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
				</BulkSelectionProvider>
			</CardContent>
		</Card>
	);
}
