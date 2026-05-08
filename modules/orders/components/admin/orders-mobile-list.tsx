import { use } from "react";
import { ShoppingBag } from "lucide-react";
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
import type { GetOrdersReturn } from "@/modules/orders/types/order.types";
import { OrdersMobileListItem } from "./orders-mobile-list-item";
import { OrdersBulkActionsBar } from "./orders-bulk-actions-bar";

interface OrdersMobileListProps {
	ordersPromise: Promise<GetOrdersReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function OrdersMobileList({
	ordersPromise,
	perPage,
	hasActiveFilters,
}: OrdersMobileListProps) {
	const { orders, pagination } = use(ordersPromise);

	if (orders.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={ShoppingBag}
					title="Aucune commande trouvée"
					description={
						hasActiveFilters
							? "Aucune commande ne correspond aux critères de recherche."
							: "Aucune commande pour l'instant."
					}
					actionElement={
						hasActiveFilters ? (
							<EmptyResetFiltersAction href="/admin/ventes/commandes" />
						) : undefined
					}
				/>
			</div>
		);
	}

	const pageItemIds = orders.map((o) => o.id);

	return (
		<BulkSelectionProvider pageItemIds={pageItemIds}>
			<div className="space-y-4 pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
				<MobileSelectionHeader itemsLabel={{ singular: "commande", plural: "commandes" }} />
				<AdminListLiveCount count={orders.length} singular="commande" plural="commandes" />
				<ItemGroup aria-label="Commandes" className="gap-2">
					{orders.map((order) => (
						<div key={order.id} role="listitem">
							<OrdersMobileListItem order={order} />
						</div>
					))}
				</ItemGroup>

				<CursorPagination
					perPage={perPage}
					hasNextPage={pagination.hasNextPage}
					hasPreviousPage={pagination.hasPreviousPage}
					currentPageSize={orders.length}
					nextCursor={pagination.nextCursor}
					prevCursor={pagination.prevCursor}
				/>
			</div>
			<MobileSelectionBottomBar>
				<OrdersBulkActionsBar presentation="bottom-bar" />
			</MobileSelectionBottomBar>
		</BulkSelectionProvider>
	);
}
