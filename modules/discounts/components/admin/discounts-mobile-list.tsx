import { use } from "react";
import { Ticket } from "lucide-react";
import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { AdminMobileListPagination } from "@/shared/components/cursor-pagination";
import { BulkSelectionProvider } from "@/shared/components/data-table";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	MobileSelectionBottomBar,
	MobileSelectionHeader,
} from "@/shared/components/mobile-selection";
import { ItemGroup } from "@/shared/components/ui/item";
import { AdminListPendingProvider } from "@/shared/contexts/admin-list-pending-context";
import type { GetDiscountsReturn } from "@/modules/discounts/data/get-discounts";
import type { DiscountFilters, GetDiscountsParams } from "@/modules/discounts/types/discount.types";

import { CreateDiscountButton } from "./create-discount-button";
import { DiscountMobileItem } from "./discount-mobile-item";
import { DiscountsBulkActionsBar } from "./discounts-bulk-actions-bar";
import { DiscountsCrossPageBanner } from "./discounts-cross-page-banner";

interface DiscountsMobileListProps {
	discountsPromise: Promise<GetDiscountsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
	filterParams?: {
		search?: string;
		sortBy?: GetDiscountsParams["sortBy"];
		filters?: DiscountFilters;
	};
}

export function DiscountsMobileList({
	discountsPromise,
	perPage,
	hasActiveFilters,
	filterParams,
}: DiscountsMobileListProps) {
	const { discounts, pagination, totalCount } = use(discountsPromise);

	if (discounts.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={Ticket}
					title="Aucun code promo trouvé"
					description={
						hasActiveFilters
							? "Aucun code promo ne correspond aux critères de recherche."
							: "Aucun code à activer pour l'instant."
					}
					actionElement={
						hasActiveFilters ? (
							<EmptyResetFiltersAction href="/admin/marketing/discounts" />
						) : (
							<CreateDiscountButton />
						)
					}
				/>
			</div>
		);
	}

	const pageItemIds = discounts.map((d) => d.id);

	return (
		<BulkSelectionProvider pageItemIds={pageItemIds}>
			<AdminListPendingProvider itemsLabel={{ singular: "code promo", plural: "codes promo" }}>
				<div className="space-y-4 overscroll-contain pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
					<MobileSelectionHeader itemsLabel={{ singular: "code promo", plural: "codes promo" }} />
					{filterParams ? (
						<DiscountsCrossPageBanner totalCount={totalCount} filterParams={filterParams} />
					) : null}
					<AdminListLiveCount count={discounts.length} singular="code promo" plural="codes promo" />
					<ItemGroup aria-label="Codes promo" className="gap-2">
						{discounts.map((discount) => (
							<div key={discount.id} role="listitem">
								<DiscountMobileItem discount={discount} />
							</div>
						))}
					</ItemGroup>

					<AdminMobileListPagination
						perPage={perPage}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						currentPageSize={discounts.length}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
						totalCount={totalCount}
					/>
				</div>
				<MobileSelectionBottomBar emptyHint="Tape sur les codes à activer">
					<DiscountsBulkActionsBar presentation="bottom-bar" />
				</MobileSelectionBottomBar>
			</AdminListPendingProvider>
		</BulkSelectionProvider>
	);
}
