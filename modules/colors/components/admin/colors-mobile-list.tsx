import { use } from "react";
import { Palette } from "lucide-react";

import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { AdminMobileListPagination } from "@/shared/components/cursor-pagination";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";

import type { GetColorsReturn } from "@/modules/colors/types/color.types";
import { CreateColorButton } from "@/modules/colors/components/admin/create-color-button";
import { ColorMobileItem } from "./color-mobile-item";

interface ColorsMobileListProps {
	colorsPromise: Promise<GetColorsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function ColorsMobileList({
	colorsPromise,
	perPage,
	hasActiveFilters,
}: ColorsMobileListProps) {
	const { colors, pagination, totalCount } = use(colorsPromise);

	if (colors.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={Palette}
					title="Aucune couleur trouvée"
					description={
						hasActiveFilters
							? "Aucune couleur ne correspond aux critères de recherche."
							: "Aucune teinte à la palette pour l'instant."
					}
					actionElement={
						hasActiveFilters ? (
							<EmptyResetFiltersAction href="/admin/catalogue/couleurs" />
						) : (
							<CreateColorButton />
						)
					}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4 overscroll-contain pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
			<AdminListLiveCount count={colors.length} singular="couleur" plural="couleurs" />
			<ItemGroup aria-label="Couleurs" className="gap-2">
				{colors.map((color) => (
					<li key={color.id}>
						<ColorMobileItem color={color} />
					</li>
				))}
			</ItemGroup>

			<AdminMobileListPagination
				perPage={perPage}
				hasNextPage={pagination.hasNextPage}
				hasPreviousPage={pagination.hasPreviousPage}
				currentPageSize={colors.length}
				nextCursor={pagination.nextCursor}
				prevCursor={pagination.prevCursor}
				totalCount={totalCount}
			/>
		</div>
	);
}
