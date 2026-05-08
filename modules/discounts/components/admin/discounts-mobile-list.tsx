import { use } from "react";
import { Ticket } from "lucide-react";
import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";
import type { GetDiscountsReturn } from "@/modules/discounts/data/get-discounts";

import { CreateDiscountButton } from "./create-discount-button";
import { DiscountMobileItem } from "./discount-mobile-item";

interface DiscountsMobileListProps {
	discountsPromise: Promise<GetDiscountsReturn>;
	perPage: number;
}

export function DiscountsMobileList({ discountsPromise, perPage }: DiscountsMobileListProps) {
	const { discounts, pagination } = use(discountsPromise);

	if (discounts.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={Ticket}
					title="Aucun code promo trouvé"
					description="Aucun code promo ne correspond aux critères de recherche."
					actionElement={<CreateDiscountButton />}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4 pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
			<AdminListLiveCount count={discounts.length} singular="code promo" plural="codes promo" />
			<ItemGroup aria-label="Codes promo" className="gap-2">
				{discounts.map((discount) => (
					<div key={discount.id} role="listitem">
						<DiscountMobileItem discount={discount} />
					</div>
				))}
			</ItemGroup>

			<CursorPagination
				perPage={perPage}
				hasNextPage={pagination.hasNextPage}
				hasPreviousPage={pagination.hasPreviousPage}
				currentPageSize={discounts.length}
				nextCursor={pagination.nextCursor}
				prevCursor={pagination.prevCursor}
			/>
		</div>
	);
}
