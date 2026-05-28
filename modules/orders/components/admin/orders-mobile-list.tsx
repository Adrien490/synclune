import { use } from "react";
import { ShoppingBag } from "lucide-react";
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
import type {
	GetOrdersParams,
	GetOrdersReturn,
	OrderFilters,
} from "@/modules/orders/types/order.types";
import { OrdersMobileListItem } from "./orders-mobile-list-item";
import { OrdersBulkActionsBar } from "./orders-bulk-actions-bar";
import { OrdersCrossPageBanner } from "./orders-cross-page-banner";

interface OrdersMobileListProps {
	ordersPromise: Promise<GetOrdersReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
	filterParams?: {
		search?: string;
		sortBy?: GetOrdersParams["sortBy"];
		filters?: OrderFilters;
	};
}

export function OrdersMobileList({
	ordersPromise,
	perPage,
	hasActiveFilters,
	filterParams,
}: OrdersMobileListProps) {
	const { orders, pagination, totalCount } = use(ordersPromise);

	if (orders.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={ShoppingBag}
					title="Aucune commande trouvée"
					description={
						hasActiveFilters
							? "Aucune commande ne correspond aux critères de recherche."
							: "Aucune commande à l'atelier pour le moment."
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
			<AdminListPendingProvider itemsLabel={{ singular: "commande", plural: "commandes" }}>
				<div className="space-y-4 overscroll-contain pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
					<MobileSelectionHeader itemsLabel={{ singular: "commande", plural: "commandes" }} />
					{filterParams ? (
						<OrdersCrossPageBanner totalCount={totalCount} filterParams={filterParams} />
					) : null}
					<AdminListLiveCount count={orders.length} singular="commande" plural="commandes" />
					<ItemGroup aria-label="Commandes" className="gap-2">
						{orders.map((order, index) => (
							<div key={order.id} role="listitem">
								<OrdersMobileListItem order={order} isFirst={index === 0} />
							</div>
						))}
					</ItemGroup>

					<AdminMobileListPagination
						perPage={perPage}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						currentPageSize={orders.length}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
						totalCount={totalCount}
					/>
				</div>
				<MobileSelectionBottomBar emptyHint="Tape sur les commandes à traiter">
					<OrdersBulkActionsBar presentation="bottom-bar" />
				</MobileSelectionBottomBar>
			</AdminListPendingProvider>
		</BulkSelectionProvider>
	);
}
