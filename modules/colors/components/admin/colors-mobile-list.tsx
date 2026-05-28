import { use } from "react";
import { Palette } from "lucide-react";

import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { AdminMobileStickyPagination } from "@/shared/components/cursor-pagination";
import { BulkSelectionProvider } from "@/shared/components/data-table";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	MobileSelectionBottomBar,
	MobileSelectionHeader,
} from "@/shared/components/mobile-selection";
import { ItemGroup } from "@/shared/components/ui/item";
import { AdminListPendingProvider } from "@/shared/contexts/admin-list-pending-context";

import type {
	ColorFilters,
	GetColorsParams,
	GetColorsReturn,
} from "@/modules/colors/types/color.types";
import { CreateColorButton } from "@/modules/colors/components/admin/create-color-button";
import { ColorMobileItem } from "./color-mobile-item";
import { ColorsBulkActionsBar } from "./colors-bulk-actions-bar";
import { ColorsCrossPageBanner } from "./colors-cross-page-banner";

interface ColorsMobileListProps {
	colorsPromise: Promise<GetColorsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
	filterParams?: {
		search?: string;
		sortBy?: GetColorsParams["sortBy"];
		filters?: ColorFilters;
	};
}

export function ColorsMobileList({
	colorsPromise,
	perPage,
	hasActiveFilters,
	filterParams,
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

	const pageItemIds = colors.map((c) => c.id);

	return (
		<BulkSelectionProvider pageItemIds={pageItemIds}>
			<AdminListPendingProvider itemsLabel={{ singular: "couleur", plural: "couleurs" }}>
				<div className="space-y-4 overscroll-contain pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
					<MobileSelectionHeader itemsLabel={{ singular: "couleur", plural: "couleurs" }} />
					{filterParams ? (
						<ColorsCrossPageBanner totalCount={totalCount} filterParams={filterParams} />
					) : null}
					<AdminListLiveCount count={colors.length} singular="couleur" plural="couleurs" />
					<ItemGroup aria-label="Couleurs" className="gap-2">
						{colors.map((color) => (
							<div key={color.id} role="listitem">
								<ColorMobileItem color={color} />
							</div>
						))}
					</ItemGroup>

					<AdminMobileStickyPagination
						perPage={perPage}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						currentPageSize={colors.length}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
						totalCount={totalCount}
					/>
				</div>
				<MobileSelectionBottomBar emptyHint="Tape sur les teintes de la palette">
					<ColorsBulkActionsBar presentation="bottom-bar" />
				</MobileSelectionBottomBar>
			</AdminListPendingProvider>
		</BulkSelectionProvider>
	);
}
