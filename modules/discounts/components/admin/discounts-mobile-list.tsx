import { use } from "react";
import { Ticket } from "lucide-react";
import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { AdminMobileListPagination } from "@/shared/components/cursor-pagination";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";
import type { GetDiscountsReturn } from "@/modules/discounts/data/get-discounts";
import type {} from "@/modules/discounts/types/discount.types";

import { CreateDiscountButton } from "./create-discount-button";
import { DiscountMobileItem } from "./discount-mobile-item";
import { ADMIN_LIST_PENDING_CLASS } from "@/shared/components/admin-list-pending.styles";
import { cn } from "@/shared/utils/cn";

interface DiscountsMobileListProps {
	discountsPromise: Promise<GetDiscountsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function DiscountsMobileList({
	discountsPromise,
	perPage,
	hasActiveFilters,
}: DiscountsMobileListProps) {
	const { discounts, pagination, totalCount } = use(discountsPromise);

	if (discounts.length === 0) {
		return (
			<div className={cn(ADMIN_LIST_PENDING_CLASS, "md:hidden")}>
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

	return (
		<div
			className={cn(
				ADMIN_LIST_PENDING_CLASS,
				"space-y-4 overscroll-contain pb-[calc(var(--bottom-bar-height,56px)+1rem)] md:hidden md:pb-0",
			)}
		>
			<AdminListLiveCount
				count={discounts.length}
				singular="code promo"
				plural="codes promo"
				totalCount={totalCount}
			/>
			<ItemGroup aria-label="Codes promo" className="gap-2">
				{discounts.map((discount) => (
					<li key={discount.id}>
						<DiscountMobileItem discount={discount} />
					</li>
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
	);
}
