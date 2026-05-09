import { use } from "react";
import { Palette } from "lucide-react";

import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { BulkSelectionProvider } from "@/shared/components/data-table";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	MobileSelectionBottomBar,
	MobileSelectionHeader,
} from "@/shared/components/mobile-selection";
import { ItemGroup } from "@/shared/components/ui/item";

import type { GetColorsReturn } from "@/modules/colors/types/color.types";
import { CreateColorButton } from "@/modules/colors/components/admin/create-color-button";
import { ColorMobileItem } from "./color-mobile-item";
import { ColorsBulkActionsBar } from "./colors-bulk-actions-bar";

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
	const { colors, pagination } = use(colorsPromise);

	if (colors.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={Palette}
					title="Aucune couleur trouvée"
					description={
						hasActiveFilters
							? "Aucune couleur ne correspond aux critères de recherche."
							: "Aucune couleur pour l'instant."
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

	const pageItemIds = colors.map((c) => c.id);

	return (
		<BulkSelectionProvider pageItemIds={pageItemIds}>
			<div className="space-y-4 pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
				<MobileSelectionHeader itemsLabel={{ singular: "couleur", plural: "couleurs" }} />
				<AdminListLiveCount count={colors.length} singular="couleur" plural="couleurs" />
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
			<MobileSelectionBottomBar>
				<ColorsBulkActionsBar presentation="bottom-bar" />
			</MobileSelectionBottomBar>
		</BulkSelectionProvider>
	);
}
