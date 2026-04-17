import { use } from "react";
import { Palette } from "lucide-react";

import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";

import type { GetColorsReturn } from "@/modules/colors/types/color.types";
import { ColorsSelectionToolbar } from "@/modules/colors/components/colors-selection-toolbar";
import { CreateColorButton } from "@/modules/colors/components/admin/create-color-button";
import { ColorMobileItem } from "./color-mobile-item";

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
				{colors.map((color) => (
					<div key={color.id} role="listitem">
						<ColorMobileItem color={color} />
					</div>
				))}
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
