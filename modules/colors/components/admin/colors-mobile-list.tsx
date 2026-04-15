import { use } from "react";
import { Palette } from "lucide-react";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemTitle,
} from "@/shared/components/ui/item";
import { Badge } from "@/shared/components/ui/badge";
import type { GetColorsReturn } from "@/modules/colors/types/color.types";
import { ColorsRowActions } from "@/modules/colors/components/colors-row-actions";
import { ColorsSelectionToolbar } from "@/modules/colors/components/colors-selection-toolbar";
import { CreateColorButton } from "@/modules/colors/components/admin/create-color-button";

interface ColorsMobileListProps {
	colorsPromise: Promise<GetColorsReturn>;
	perPage: number;
}

export function ColorsMobileList({ colorsPromise, perPage }: ColorsMobileListProps) {
	const { colors, pagination } = use(colorsPromise);

	if (colors.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={Palette}
					title="Aucune couleur trouvee"
					description="Aucune couleur ne correspond aux criteres de recherche."
					actionElement={<CreateColorButton />}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4 pb-20 md:hidden md:pb-0">
			<ColorsSelectionToolbar />

			<ItemGroup aria-label="Couleurs" className="gap-2">
				{colors.map((color) => {
					const skuCount = color._count.skus || 0;

					return (
						<div key={color.id} role="listitem">
							<Item
								variant="outline"
								size="sm"
								className="gap-3"
								aria-roledescription="carte couleur"
							>
								<ItemMedia variant="icon">
									<div
										className="border-border size-8 rounded-full border"
										style={{ backgroundColor: color.hex }}
										aria-label={`Apercu couleur ${color.name}`}
									/>
								</ItemMedia>
								<ItemContent className="min-w-0">
									<ItemTitle>
										<span className="truncate font-semibold">{color.name}</span>
										<Badge variant={color.isActive ? "default" : "secondary"}>
											{color.isActive ? "Actif" : "Inactif"}
										</Badge>
									</ItemTitle>
									<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
										<span>
											{skuCount} variante{skuCount !== 1 ? "s" : ""}
										</span>
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<ColorsRowActions
										colorId={color.id}
										colorName={color.name}
										colorHex={color.hex}
										colorSlug={color.slug}
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
				currentPageSize={colors.length}
				nextCursor={pagination.nextCursor}
				prevCursor={pagination.prevCursor}
			/>
		</div>
	);
}
