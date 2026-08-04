import { use } from "react";
import { ShoppingBagIcon } from "@phosphor-icons/react/ssr";
import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { AdminMobileListPagination } from "@/shared/components/cursor-pagination";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";
import type { GetOrdersReturn } from "@/modules/orders/types/order.types";
import { OrdersMobileListItem } from "./orders-mobile-list-item";
import { ADMIN_LIST_PENDING_CLASS } from "@/shared/components/admin-list-pending.styles";
import { cn } from "@/shared/utils/cn";

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
	const { orders, pagination, totalCount } = use(ordersPromise);

	if (orders.length === 0) {
		return (
			<div className={cn(ADMIN_LIST_PENDING_CLASS, "md:hidden")}>
				<TableEmptyState
					icon={ShoppingBagIcon}
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

	return (
		<div
			className={cn(
				ADMIN_LIST_PENDING_CLASS,
				"space-y-4 overscroll-contain pb-[calc(var(--bottom-bar-height,56px)+1rem)] md:hidden md:pb-0",
			)}
		>
			<AdminListLiveCount
				count={orders.length}
				singular="commande"
				plural="commandes"
				totalCount={totalCount}
			/>
			<ItemGroup aria-label="Commandes" className="gap-2">
				{orders.map((order, index) => (
					<li key={order.id}>
						<OrdersMobileListItem order={order} isFirst={index === 0} />
					</li>
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
	);
}
