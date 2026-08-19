import { CreateTaxonomyButton } from "@/modules/taxonomies/components/taxonomy-list-controls";
import { AdminDataTable, TableEmptyState } from "@/shared/components/data-table";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import { PaletteIcon } from "@phosphor-icons/react/ssr";
import { use } from "react";
import { ColorsRowActions } from "@/modules/colors/components/colors-row-actions";

interface ColorsDataTableProps {
	colorsPromise: Promise<GetColorsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function ColorsDataTable({
	colorsPromise,
	perPage,
	hasActiveFilters,
}: ColorsDataTableProps) {
	const { colors, pagination, totalCount } = use(colorsPromise);

	if (colors.length === 0) {
		return (
			<TableEmptyState
				className="hidden md:flex"
				icon={PaletteIcon}
				title="Aucune couleur trouvée"
				description="Aucune couleur ne correspond aux critères de recherche."
				noItemsDescription="Aucune couleur pour l'instant."
				hasActiveFilters={hasActiveFilters}
				resetFiltersHref="/admin/catalogue/couleurs"
				actionElement={<CreateTaxonomyButton kind="color" />}
			/>
		);
	}

	return (
		<AdminDataTable
			caption="Liste des couleurs"
			pagination={{
				perPage,
				hasNextPage: pagination.hasNextPage,
				hasPreviousPage: pagination.hasPreviousPage,
				currentPageSize: colors.length,
				nextCursor: pagination.nextCursor,
				prevCursor: pagination.prevCursor,
				totalCount,
			}}
		>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[10%]">Aperçu</TableHead>
					<TableHead className="w-[62%]">Nom</TableHead>
					<TableHead className="w-[16%] text-center">Variantes</TableHead>
					<TableHead
						className="w-[12%] text-right"
						aria-label="Actions disponibles pour chaque couleur"
					>
						Actions
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{colors.map((color) => {
					const variantCount = color._count.variants || 0;

					return (
						<TableRow key={color.id}>
							<TableCell>
								<div
									className="border-border inline-flex size-[30px] rounded-full border"
									style={{ backgroundColor: color.hex ?? undefined }}
									role="img"
									aria-label={`Aperçu couleur ${color.hex?.toUpperCase() ?? color.name}`}
								/>
							</TableCell>
							<TableCell>
								<div className="overflow-hidden">
									<span className="text-foreground block truncate font-semibold" title={color.name}>
										{color.name}
									</span>
								</div>
							</TableCell>
							<TableCell className="text-center">
								<span className="text-sm font-medium">{variantCount}</span>
							</TableCell>
							<TableCell className="text-right">
								<ColorsRowActions
									colorId={color.id}
									colorName={color.name}
									colorHex={color.hex}
									variantsCount={color._count.variants}
								/>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</AdminDataTable>
	);
}
